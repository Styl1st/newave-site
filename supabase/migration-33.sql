-- ============================================================
-- MIGRATION 33 — la vitrine va chercher TOUT le catalogue
-- ============================================================
--
-- Jusqu'ici, `/pieces` descendait un ÉCHANTILLON : dix pièces par
-- marque, plafonné à mille cinq cents lignes, soit douze cent trente
-- pièces sur les vingt-six mille cinq cents du site. Tout le reste —
-- filtres, recherche, tri, « Charger 24 de plus » — travaillait ensuite
-- sur ces douze cent trente, en JavaScript. Le pied de grille annonçait
-- donc « 24 sur 1 230 » sur une page intitulée « Les pièces », et les
-- vingt-cinq mille autres n'étaient atteignables que marque par marque.
--
-- Cette fonction renverse le sens : c'est Postgres qui filtre, trie,
-- compte et découpe, et la page ne descend plus que les vingt-quatre
-- pièces qu'elle affiche. Le site devient entièrement parcourable, et
-- la page est plus légère qu'avant.
--
-- ------------------------------------------------------------
-- L'ORDRE « AU HASARD », ET POURQUOI IL N'UTILISE PAS random()
-- ------------------------------------------------------------
--
-- La vitrine ALTERNE LES MARQUES : les premiers écrans montrent une
-- pièce de chacune plutôt que quarante de la plus fournie. C'était le
-- travail de `repartirParMarque`, en JavaScript, qui distribuait les
-- pièces en files par marque et faisait un tour de table. Impossible à
-- garder : il lui faut la liste ENTIÈRE en mémoire.
--
-- Or `position` est déjà le rang d'une pièce DANS SA MARQUE. Trier par
-- `position` d'abord, c'est donc exactement le tour de table : toutes
-- les pièces de rang 0, puis toutes celles de rang 1, et ainsi de
-- suite. Il ne reste qu'à mélanger les marques ENTRE ELLES à rang égal,
-- et c'est ce que fait le `md5(brand_id || graine)`.
--
-- ⚠️ `order by random()` SERAIT UN BOGUE, PAS UNE VARIANTE. La liste
-- est découpée en pages : un ordre retiré au sort à chaque requête
-- rendrait un ordre différent à la page 2, donc des pièces vues deux
-- fois et d'autres jamais. La graine est tirée UNE FOIS par visite et
-- voyage avec chaque page : l'ordre change d'une visite à l'autre et ne
-- bouge pas à l'intérieur d'une visite. C'est la même exigence que
-- l'ordre total des lectures par tranches.
--
-- ------------------------------------------------------------
-- CE QU'ELLE MONTRE
-- ------------------------------------------------------------
--
-- Les pièces publiées, encore en vente, de marques publiées — le même
-- périmètre que `compter_les_rayons` et `compter_les_marques` — ET qui
-- ont de quoi être montrées. Ce dernier tri était fait en JavaScript
-- par `aUneIllustration` ; il descend ici, parce qu'une page ne peut
-- plus l'appliquer après coup sans creuser des trous dans sa grille.
-- Les deux définitions disent la même chose, extensions vidéo
-- comprises : voir `lib/medias.ts`, elles doivent bouger ensemble.
--
-- La taxonomie reste un ARGUMENT, comme pour `compter_les_rayons` :
-- elle vit dans `lib/taxonomy.ts` et nulle part ailleurs. Recopiée ici,
-- elle serait une seconde définition qui diverge au premier rayon
-- ajouté.
--
-- `security definer` : elle ne lit que du publié et ne rend que ce que
-- la page affiche déjà.
-- ------------------------------------------------------------

create or replace function public.vitrine(
  p_graine     text,
  p_taxonomie  text[],
  p_rayons     text[] default null,
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

comment on function public.vitrine(text, text[], text[], text, int, int, boolean, boolean, text, text, int, int) is
  'Une page de la vitrine : filtre, trie, compte et decoupe cote base. `total` est le nombre de pieces retenues AVANT le decoupage, repete sur chaque ligne. `p_graine` fixe l''ordre « au hasard » pour toute la duree d''une visite : le changer rebat les marques, le garder garantit qu''aucune piece ne sort deux fois d''une page a l''autre.';

grant execute on function public.vitrine(text, text[], text[], text, int, int, boolean, boolean, text, text, int, int) to anon, authenticated;

-- Le tour de table trie sur `position` avant tout le reste.
create index if not exists products_position_idx
  on public.products ("position");


-- ------------------------------------------------------------
-- LES BORNES DU RAIL DE PRIX, ET LES DEUX CASES D'ÉTAT
-- ------------------------------------------------------------
--
-- Elles se calculaient sur les pièces descendues avec la page. Depuis
-- que la page n'en descend plus que vingt-quatre, il n'y a plus rien à
-- calculer : un rail gradué sur vingt-quatre prix ne couvrirait pas le
-- catalogue, et « En stock » disparaîtrait dès que les vingt-quatre
-- premières pièces sont toutes disponibles.
--
-- ⚠️ LES BORNES DOIVENT PORTER SUR LE CATALOGUE ENTIER, ET NON SUR CE
-- QUI RESTE APRÈS FILTRAGE. Un rail qui se remet à l'échelle à chaque
-- clic déplace les poignées sous le doigt : on croit avoir demandé
-- « jusqu'à 60 € » et la même poignée, au même endroit, dit maintenant
-- 30. C'est pour cela qu'il n'y a aucun argument de filtre ici.
--
-- Les deux booléens disent s'il existe, quelque part au catalogue, une
-- pièce indisponible et une pièce en promo. Une case qui ne retire
-- jamais rien ne s'affiche pas : elle laisse croire qu'on vient de
-- filtrer quelque chose.
-- ------------------------------------------------------------

create or replace function public.vitrine_bornes()
returns table (prix_min int, prix_max int, a_des_ruptures boolean, a_des_promos boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    min(coalesce(p.price_eur_cents, p.price_cents))::int as prix_min,
    max(coalesce(p.price_eur_cents, p.price_cents))::int as prix_max,
    bool_or(not p.available) as a_des_ruptures,
    bool_or(p.compare_at_cents is not null
            and p.price_cents is not null
            and p.compare_at_cents > p.price_cents) as a_des_promos
  from public.products p
  join public.brands b on b.id = p.brand_id
  where p.status = 'published'
    and p.retired_at is null
    and b.status = 'published';
$$;

comment on function public.vitrine_bornes() is
  'Le prix le plus bas et le plus haut du catalogue, et s''il existe des pieces indisponibles ou en promo. Sert a graduer le rail de prix et a decider si les deux cases d''etat ont lieu d''etre. Sans argument de filtre : un rail qui se regradue a chaque clic ment sur la position de ses poignees.';

grant execute on function public.vitrine_bornes() to anon, authenticated;
