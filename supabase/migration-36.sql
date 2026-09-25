-- ============================================================
-- MIGRATION 36 — les tailles, calculées une fois pour toutes
-- ============================================================
--
-- LA 35 ÉTAIT TROP LENTE, ET ELLE RALENTISSAIT TOUT LE RESTE.
--
-- `compter_les_tailles` et le filtre de taille de `vitrine` dépliaient
-- les variantes de CHAQUE pièce (`jsonb_array_elements`) et passaient
-- chaque libellé dans `taille_normalisee`, à chaque appel : sur vingt-six
-- mille pièces, plus de trois secondes. L'API coupe à trois secondes
-- (« canceling statement due to statement timeout ») : la section
-- « Taille » ne s'affichait pas, filtrer par taille rendait une erreur,
-- et pendant ce temps la base peinait à répondre aux autres comptes du
-- catalogue — d'où des filtres vides et des « 503 » sur `/pieces`.
--
-- Le remède : calculer les tailles d'une pièce QUAND ON L'ÉCRIT, et
-- plus quand on la lit. Une colonne `tailles` (« {M,L,XL} », seulement
-- les tailles EN STOCK), tenue à jour par un déclencheur dès que
-- `sizes` change, et indexée. Compter et filtrer redeviennent aussi
-- légers que pour les tags.
--
-- À lancer dans le SQL Editor. Rien à changer côté code : les fonctions
-- gardent leur nom et leurs arguments.
-- ============================================================

-- ------------------------------------------------------------
-- 1. LA COLONNE ET SON CALCUL
-- ------------------------------------------------------------

alter table public.products
  add column if not exists tailles text[] not null default '{}';

-- Les tailles EN STOCK d'une liste de variantes, ramenées à l'échelle
-- XS–XXL et dédoublonnées : « M » et « Medium » pour deux couleurs ne
-- font qu'un M.
create or replace function public.tailles_en_stock(p_sizes jsonb)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(distinct x.t order by x.t), '{}')
  from (
    select public.taille_normalisee(e.v ->> 'label') as t
    from jsonb_array_elements(
      case when jsonb_typeof(p_sizes) = 'array' then p_sizes else '[]'::jsonb end
    ) as e(v)
    where coalesce((e.v ->> 'available')::boolean, true)
  ) x
  where x.t is not null;
$$;

-- Le déclencheur : à chaque écriture de `sizes` (import, synchro
-- quotidienne, espace marque), `tailles` suit. Personne n'a à y penser.
create or replace function public.poser_les_tailles()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.tailles := public.tailles_en_stock(new.sizes);
  return new;
end;
$$;

drop trigger if exists products_tailles on public.products;
create trigger products_tailles
  before insert or update of sizes on public.products
  for each row execute function public.poser_les_tailles();

-- Une fois pour les pièces déjà en base. Quelques secondes.
update public.products
set tailles = public.tailles_en_stock(sizes)
where tailles is distinct from public.tailles_en_stock(sizes);

create index if not exists products_tailles_idx
  on public.products using gin (tailles);

-- ------------------------------------------------------------
-- 2. COMPTER, COMME LES TAGS
-- ------------------------------------------------------------

create or replace function public.compter_les_tailles(p_taxonomie text[])
returns table (rayon text, taille text, total int)
language sql
security definer
set search_path = public
stable
as $$
  select x.rayon, t.taille, count(*)::int as total
  from (
    select
      p.tailles,
      (
        select c
        from unnest(p.categories) with ordinality as u(c, rang)
        where c = any (p_taxonomie)
        order by u.rang
        limit 1
      ) as rayon
    from public.products p
    join public.brands b on b.id = p.brand_id
    where p.status = 'published'
      and p.retired_at is null
      and b.status = 'published'
      and cardinality(p.tailles) > 0
  ) x
  cross join lateral unnest(x.tailles) as t(taille)
  group by x.rayon, t.taille
  order by x.rayon, t.taille;
$$;

-- ------------------------------------------------------------
-- 3. LA VITRINE LIT LA COLONNE
-- ------------------------------------------------------------
--
-- Même signature que la 35 : `create or replace` suffit.

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

      -- LA TAILLE : lue dans `tailles`, calculée à l'écriture (voir plus
      -- haut). Plus rien à dérouler ni à normaliser ici, pièce par pièce.
      and (
        p_tailles is null
        or array_length(p_tailles, 1) is null
        or p.tailles && p_tailles
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

-- L'API relit la liste des colonnes et des fonctions.
notify pgrst, 'reload schema';
