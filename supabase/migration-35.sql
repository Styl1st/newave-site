-- ============================================================
-- MIGRATION 35 — la vitrine filtre par taille
-- ============================================================
--
-- La colonne de filtres de `/pieces` gagne une section « Taille »,
-- XS à XXL. Les tailles sont déjà en base (`products.sizes`, un tableau
-- de `{ label, available }` lu chez chaque boutique, migration 04),
-- mais écrites comme chaque boutique les écrit : « M », « Medium »,
-- « X-Large », « 2XL », « S/M », « M (oversized) ». Il fallait une
-- échelle commune avant de pouvoir filtrer dessus.
--
-- Trois choses :
--
--   `taille_normalisee`   ramène un libellé à XS, S, M, L, XL ou XXL,
--                         et à rien quand ce n'en est pas une (« 42 »,
--                         « TU », « 30/32 ») ;
--   `compter_les_tailles` compte, par rayon, les pièces qui ont au
--                         moins une variante EN STOCK dans chaque
--                         taille : la section n'affiche que les tailles
--                         qui mènent quelque part ;
--   `vitrine`             reçoit `p_tailles`.
--
-- À LANCER AVANT DE POUSSER LE CODE, comme la 34. Le site tolère une
-- base qui ne l'a pas encore : la section « Taille » ne s'affiche
-- simplement pas, et `p_tailles` n'est envoyé que quand on filtre.
-- ============================================================

-- ------------------------------------------------------------
-- 1. L'ÉCHELLE COMMUNE
-- ------------------------------------------------------------
--
-- On lit le DÉBUT du libellé, une fois ramené à des majuscules sans
-- accents ni ponctuation : « M (oversized) » devient « M OVERSIZED »,
-- et c'est le premier mot qui compte. Un libellé double, « S/M », est
-- rangé à sa première taille.
--
-- L'ORDRE DES TESTS COMPTE : XXL avant XL, XL avant L, XS avant S.
-- « XL » commence par X, « XS » aussi, et « L » est un préfixe de
-- « LARGE » comme de « L ».

create or replace function public.taille_normalisee(p_label text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when l is null or l = '' then null
    when l ~ '^(XXL|2XL|XX L|XX LARGE|XXLARGE|2X|EXTRA EXTRA LARGE)( |$)' then 'XXL'
    when l ~ '^(XL|X L|X LARGE|XLARGE|EXTRA LARGE|TG)( |$)' then 'XL'
    when l ~ '^(XS|X S|X SMALL|XSMALL|EXTRA SMALL|TP)( |$)' then 'XS'
    when l ~ '^(S|SMALL|PETIT|P)( |$)' then 'S'
    when l ~ '^(M|MEDIUM|MOYEN)( |$)' then 'M'
    when l ~ '^(L|LARGE|GRAND|G)( |$)' then 'L'
    else null
  end
  from (
    select trim(regexp_replace(upper(public.unaccent_simple(coalesce(p_label, ''))), '[^A-Z0-9]+', ' ', 'g')) as l
  ) x;
$$;

comment on function public.taille_normalisee(text) is
  'Ramene un libelle de taille de boutique (« Medium », « X-Large », « 2XL », « M (oversized) ») a XS, S, M, L, XL ou XXL. NULL pour ce qui n''est pas une taille de vetement de cette echelle (pointures, tailles uniques, tailles de jean).';

grant execute on function public.taille_normalisee(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 2. COMPTER, PAR RAYON
-- ------------------------------------------------------------
--
-- Même périmètre que `compter_les_rayons` et `compter_les_tags`. Une
-- pièce compte une fois par taille, même si deux de ses variantes y
-- tombent (« M » et « Medium » pour deux couleurs).

create or replace function public.compter_les_tailles(p_taxonomie text[])
returns table (rayon text, taille text, total int)
language sql
security definer
set search_path = public
stable
as $$
  select x.rayon, x.taille, count(*)::int as total
  from (
    select distinct
      p.id,
      (
        select c
        from unnest(p.categories) with ordinality as u(c, rang)
        where c = any (p_taxonomie)
        order by u.rang
        limit 1
      ) as rayon,
      public.taille_normalisee(t.v ->> 'label') as taille
    from public.products p
    join public.brands b on b.id = p.brand_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(p.sizes) = 'array' then p.sizes else '[]'::jsonb end
    ) as t(v)
    where p.status = 'published'
      and p.retired_at is null
      and b.status = 'published'
      and coalesce((t.v ->> 'available')::boolean, true)
  ) x
  where x.taille is not null
  group by x.rayon, x.taille
  order by x.rayon, x.taille;
$$;

comment on function public.compter_les_tailles(text[]) is
  'Compte, par rayon, les pieces publiees et en vente qui ont au moins une variante en stock dans chaque taille (XS a XXL, voir taille_normalisee).';

grant execute on function public.compter_les_tailles(text[]) to anon, authenticated;

-- ------------------------------------------------------------
-- 3. LA VITRINE FILTRE PAR TAILLE
-- ------------------------------------------------------------
--
-- Même fonction que la migration 34, avec `p_tailles` en plus. Même
-- précaution : l'ancienne signature est retirée, sinon l'API aurait
-- deux fonctions `vitrine` et ne saurait plus laquelle appeler.

drop function if exists public.vitrine(text, text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int);

create or replace function public.vitrine(
  p_graine     text,
  p_taxonomie  text[],
  p_rayons     text[] default null,
  p_tags       text[] default null,
  p_tailles    text[] default null,
  p_marque     text default null,
  p_prix_min   int default null,
  p_prix_max   int default null,
  p_stock      boolean default false,
  p_promo      boolean default false,
  p_q          text default null,
  p_tri        text default 'hasard',
  p_depuis     int default 0,
  p_combien    int default 24
)
returns table (
  total                int,
  id                   uuid,
  brand_id             uuid,
  slug                 text,
  name                 text,
  price_cents          int,
  compare_at_cents     int,
  price_eur_cents      int,
  compare_at_eur_cents int,
  currency             text,
  image_url            text,
  images               text[],
  categories           text[],
  available            boolean,
  retired_at           timestamptz,
  -- ⚠️ `rang` ET NON `position`. `POSITION` est un mot-clé de Postgres
  -- (`position(sous_chaine in chaine)`) : la colonne de la table a le
  -- droit de s'appeler ainsi, mais un paramètre de sortie de fonction,
  -- non — `returns table` les déclare comme des paramètres. La lecture
  -- côté site le renomme en `position` pour la pièce.
  rang                 int,
  brand_slug           text,
  brand_name           text
)
language sql
security definer
set search_path = public
stable
as $$
  with retenues as (
    select
      p.id,
      p.brand_id,
      p.slug,
      p.name,
      p.price_cents,
      p.compare_at_cents,
      p.price_eur_cents,
      p.compare_at_eur_cents,
      p.currency,
      p.image_url,
      -- Quatre photos suffisent au survol ; au-delà, elles voyagent
      -- dans la réponse sans que personne ne les regarde.
      (select array_agg(m) from (
         select m from unnest(p.images) with ordinality u(m, n)
         order by u.n limit 4
       ) q) as images,
      p.categories,
      p.available,
      p.retired_at,
      p.position as rang,
      b.slug as brand_slug,
      b.name as brand_name,
      -- Le prix qui sert à filtrer ET à trier : l'équivalent en euros
      -- quand la boutique vend dans une autre devise, le prix brut
      -- sinon. C'est `enCentimes`, côté site.
      coalesce(p.price_eur_cents, p.price_cents) as prix
    from public.products p
    join public.brands b on b.id = p.brand_id
    where p.status = 'published'
      and p.retired_at is null
      and b.status = 'published'

      -- DE QUOI ÊTRE MONTRÉE : au moins un média qui ne soit pas une
      -- vidéo. Une vignette est une balise `img` ; une vidéo y donne un
      -- cadre cassé au milieu de la grille.
      and exists (
        select 1
        from unnest(
          case when coalesce(array_length(p.images, 1), 0) > 0
               then p.images
               else array[p.image_url]
          end
        ) as m
        where m is not null
          and m <> ''
          and m !~* '\.(mp4|webm|m4v|mov)(\?|#|$)'
      )

      -- Le rayon retenu est LE PREMIER de `categories` qui figure dans
      -- la taxonomie, exactement comme `compter_les_rayons` et
      -- `rayonDe`. Sans ce choix préalable, une pièce portant « Hauts »
      -- et « Maille » répondrait à deux rayons et sortirait en double.
      and (
        p_rayons is null
        or array_length(p_rayons, 1) is null
        or (
          select c
          from unnest(p.categories) with ordinality u(c, n)
          where c = any (p_taxonomie)
          order by u.n
          limit 1
        ) = any (p_rayons)
      )

      -- LE TAG FIN, à l'intérieur du rayon : « des hauts » puis « des
      -- hoodies ». Un OU entre les tags cochés, comme entre les rayons.
      and (
        p_tags is null
        or array_length(p_tags, 1) is null
        or p.tags && p_tags
      )

      -- LA TAILLE : au moins une variante EN STOCK dans l'une des tailles
      -- demandées. Le `case` d'abord, parce qu'un `sizes` qui ne serait
      -- pas un tableau ferait échouer `jsonb_array_elements`, et que
      -- Postgres ne promet pas l'ordre d'évaluation d'un `and`.
      and (
        p_tailles is null
        or array_length(p_tailles, 1) is null
        or case
             when jsonb_typeof(p.sizes) = 'array' then exists (
               select 1
               from jsonb_array_elements(p.sizes) as t(v)
               where coalesce((t.v ->> 'available')::boolean, true)
                 and public.taille_normalisee(t.v ->> 'label') = any (p_tailles)
             )
             else false
           end
      )

      and (p_marque is null or b.slug = p_marque)

      -- LE PRIX N'ÉCARTE PAS LES PIÈCES SANS PRIX QUAND IL NE FILTRE
      -- PAS. Le site n'envoie les bornes que si l'on a bougé une
      -- poignée ; tant qu'elles sont au repos, une pièce dont la
      -- boutique n'annonce pas le prix reste dans la liste. La cacher
      -- serait la punir d'une information qui manque à la boutique.
      and (p_prix_min is null or coalesce(p.price_eur_cents, p.price_cents) >= p_prix_min)
      and (p_prix_max is null or coalesce(p.price_eur_cents, p.price_cents) <= p_prix_max)

      and (not p_stock or p.available)
      and (
        not p_promo
        or (p.compare_at_cents is not null
            and p.price_cents is not null
            and p.compare_at_cents > p.price_cents)
      )

      -- LA RECHERCHE PORTE AUSSI SUR LE NOM DE LA MARQUE, et c'est
      -- volontaire : qui tape « twojeys » ici cherche les pièces de
      -- cette marque, pas sa fiche. Sans accents ni casse, comme le
      -- champ du site.
      and (
        p_q is null
        or p_q = ''
        or public.unaccent_simple(p.name) ilike '%' || public.unaccent_simple(p_q) || '%'
        or public.unaccent_simple(b.name) ilike '%' || public.unaccent_simple(p_q) || '%'
        or exists (
          select 1 from unnest(p.categories) as c
          where public.unaccent_simple(c) ilike '%' || public.unaccent_simple(p_q) || '%'
        )
        -- « hoodie » trouve les hoodies même quand le nom ne le dit pas.
        or exists (
          select 1 from unnest(p.tags) as c
          where public.unaccent_simple(c) ilike '%' || public.unaccent_simple(p_q) || '%'
        )
      )
  )
  select
    (count(*) over ())::int as total,
    r.id, r.brand_id, r.slug, r.name,
    r.price_cents, r.compare_at_cents,
    r.price_eur_cents, r.compare_at_eur_cents,
    r.currency, r.image_url, r.images, r.categories,
    r.available, r.retired_at, r.rang,
    r.brand_slug, r.brand_name
  from retenues r
  order by
    -- Sans prix connu, la pièce va au bout — dans les deux sens.
    case when p_tri = 'croissant'   then r.prix end asc  nulls last,
    case when p_tri = 'decroissant' then r.prix end desc nulls last,
    -- Le tour de table : rang 0 de chaque marque, puis rang 1, etc.
    case when p_tri = 'hasard' then r.rang end asc,
    case when p_tri = 'hasard' then md5(r.brand_id::text || p_graine) end asc,
    -- L'ORDRE DOIT ÊTRE TOTAL. Deux pièces que tout ce qui précède
    -- laisse à égalité seraient rendues dans un ordre libre, donc
    -- différent d'une page à l'autre : l'une sortirait deux fois et
    -- l'autre jamais. `id` tranche.
    r.id
  offset greatest(p_depuis, 0)
  limit least(greatest(p_combien, 1), 96);
$$;

comment on function public.vitrine(text, text[], text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) is
  'Une page de la vitrine : filtre, trie, compte et decoupe cote base. `total` est le nombre de pieces retenues AVANT le decoupage, repete sur chaque ligne. `p_graine` fixe l''ordre « au hasard » pour toute la duree d''une visite : le changer rebat les marques, le garder garantit qu''aucune piece ne sort deux fois d''une page a l''autre.';

grant execute on function public.vitrine(text, text[], text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) to anon, authenticated;

-- L'API relit la liste des fonctions.
notify pgrst, 'reload schema';
