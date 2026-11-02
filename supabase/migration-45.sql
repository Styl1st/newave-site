-- ============================================================
-- MIGRATION 45 — la vitrine lit un index, plus toute la table
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-44.sql. Rejouable.
-- Rien à changer côté code : `vitrine` garde son nom, ses arguments et
-- ses colonnes de sortie, et rend exactement les mêmes lignes.
--
-- LE SYMPTÔME, ENCORE. Sur /pieces, de temps en temps :
--   [newave] une page de vitrine : canceling statement due to statement timeout
-- L'API coupe à trois secondes. Mesuré le 3 novembre : `vitrine` prenait
-- 0,26 s sur une base au calme, presque une seconde en moyenne sur 622
-- appels, et touchait régulièrement les trois secondes (14,7 s une fois)
-- dès que la synchronisation des catalogues occupait la base.
--
-- POURQUOI. Pour rendre vingt-quatre pièces, `vitrine` relisait toute la
-- table `products` : 38 000 lignes, 84 Mo, dont presque tout est inutile
-- ici (descriptions, photos, texte de recherche). C'est le passage par la
-- table entière qui coûte, pas le tri.
--
-- CE QUI CHANGE.
--   1. Un index partiel et couvrant, `products_vitrine_idx` : les seules
--      pièces vendables, avec les seules colonnes qu'il faut pour les
--      ordonner (marque, position, mise en avant, prix). Quelques
--      centaines de kilo-octets.
--   2. `vitrine` choisit son chemin selon les filtres. Sans filtre lourd
--      (l'arrivée sur la page, un tri par prix, une marque, une
--      fourchette de prix), elle ne lit que cet index. Avec un rayon, un
--      tag, une taille, le stock, la promo ou une recherche, elle reprend
--      le chemin de la migration 43, inchangé.
--
-- L'index se construit en quelques secondes sur 38 000 lignes. Pour le
-- construire sans bloquer les écritures, lancer d'abord cette ligne SEULE
-- (le SQL Editor refuse `concurrently` au milieu d'un script) :
--   create index concurrently if not exists products_vitrine_idx on public.products (brand_id) include (id, position, featured, price_eur_cents, price_cents) where status = 'published' and retired_at is null and a_un_visuel;
-- puis le fichier entier : la ligne ci-dessous ne refera rien.
-- ============================================================

create index if not exists products_vitrine_idx
  on public.products (brand_id)
  include (id, position, featured, price_eur_cents, price_cents)
  where status = 'published' and retired_at is null and a_un_visuel;

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
  -- `rang` ET NON `position` : voir la migration 36.
  rang                 int,
  brand_slug           text,
  brand_name           text
)
language sql
security definer
set search_path = public
stable
as $$
  -- Le mot cherché, préparé UNE fois. `materialized` l'impose : sans lui,
  -- Postgres recopie l'expression dans le filtre et la recalcule à
  -- chaque ligne.
  with motif as materialized (
    select case
      when p_q is null or p_q = '' then null
      else '%' || public.unaccent_simple(replace(p_q, chr(31), '')) || '%'
    end as m
  ),
  -- Les marques publiées, avec tout ce qui se calcule par marque : la
  -- clé de l'ordre « au hasard » et le nom sans accents.
  marques as materialized (
    select
      b.id,
      b.slug,
      b.name,
      md5(b.id::text || p_graine) as cle,
      public.unaccent_simple(b.name) as nom_recherche
    from public.brands b
    where b.status = 'published'
      and (p_marque is null or b.slug = p_marque)
  ),
  -- Les pièces retenues, réduites à ce qu'il faut pour trier et compter.
  -- DEUX CHEMINS, ET UN SEUL EST PRIS (migration 45).
  --
  -- Les deux gardes ne lisent que des arguments : Postgres les évalue une
  -- fois, avant de toucher à la table (« One-Time Filter »), et ne lance
  -- que le chemin qui s'applique.
  --
  -- 1. SANS FILTRE LOURD, c'est-à-dire l'arrivée sur /pieces, le tri par
  --    prix, une marque ou une fourchette de prix : tout ce qu'il faut
  --    est dans l'index `products_vitrine_idx`. La lecture se fait dans
  --    l'index seul, quelques centaines de kilo-octets au lieu des
  --    quatre-vingts mégaoctets de la table. Assez bon marché pour être
  --    relue deux fois, pour le compte puis pour la page.
  legeres as not materialized (
    select
      p.id,
      p.position as rang,
      coalesce(p.featured, false) as en_avant,
      coalesce(p.price_eur_cents, p.price_cents) as prix,
      m.cle
    from public.products p
    join marques m on m.id = p.brand_id
    where p.status = 'published'
      and p.retired_at is null
      and p.a_un_visuel
      and (p_prix_min is null or coalesce(p.price_eur_cents, p.price_cents) >= p_prix_min)
      and (p_prix_max is null or coalesce(p.price_eur_cents, p.price_cents) <= p_prix_max)
      and (
        (p_rayons is null or array_length(p_rayons, 1) is null)
        and (p_tags is null or array_length(p_tags, 1) is null)
        and (p_tailles is null or array_length(p_tailles, 1) is null)
        and not coalesce(p_stock, false)
        and not coalesce(p_promo, false)
        and (p_q is null or p_q = '')
      )
  ),
  -- 2. AVEC UN RAYON, UN TAG, UNE TAILLE, LE STOCK, LA PROMO OU UNE
  --    RECHERCHE : le chemin de la migration 43, ligne pour ligne. Lui
  --    parcourt la table : il n'est calculé qu'une fois (`materialized`),
  --    puis relu pour le compte comme pour la page.
  lourdes as materialized (
    select
      p.id,
      p.position as rang,
      -- Nouveau (migration 43) : la marque a choisi de la montrer.
      coalesce(p.featured, false) as en_avant,
      coalesce(p.price_eur_cents, p.price_cents) as prix,
      m.cle
    from public.products p
    join marques m on m.id = p.brand_id
    cross join motif
    where p.status = 'published'
      and p.retired_at is null
      and p.a_un_visuel

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

      and (p_tags is null or array_length(p_tags, 1) is null or p.tags && p_tags)
      and (p_tailles is null or array_length(p_tailles, 1) is null or p.tailles && p_tailles)
      and (p_prix_min is null or coalesce(p.price_eur_cents, p.price_cents) >= p_prix_min)
      and (p_prix_max is null or coalesce(p.price_eur_cents, p.price_cents) <= p_prix_max)
      and (not p_stock or p.available)
      and (
        not p_promo
        or (p.compare_at_cents is not null
            and p.price_cents is not null
            and p.compare_at_cents > p.price_cents)
      )

      and (
        motif.m is null
        or p.recherche ilike motif.m
        or m.nom_recherche ilike motif.m
      )
      and not (
        (p_rayons is null or array_length(p_rayons, 1) is null)
        and (p_tags is null or array_length(p_tags, 1) is null)
        and (p_tailles is null or array_length(p_tailles, 1) is null)
        and not coalesce(p_stock, false)
        and not coalesce(p_promo, false)
        and (p_q is null or p_q = '')
      )
  ),
  -- Une seule des deux rend des lignes : leurs gardes sont contraires.
  retenues as not materialized (
    select * from legeres
    union all
    select * from lourdes
  ),
  -- LE TOTAL À PART, ET PLUS PAR `count(*) over ()` (migration 45).
  -- La fenêtre gardait TOUTES les lignes retenues en mémoire pour les
  -- compter, et à 36 000 lignes elle débordait sur le disque à chaque
  -- appel. Un compte simple n'en garde aucune, et le découpage qui suit
  -- ne garde que les vingt-quatre premières. `retenues` est relue deux
  -- fois (`not materialized`), mais sans filtre lourd c'est l'index seul,
  -- quelques millisecondes.
  compte as (
    select count(*)::int as total from retenues
  ),
  -- Le découpage. Même tri que la 36 : la clé de marque vaut
  -- `md5(brand_id || graine)`.
  page as (
    select r.*, compte.total
    from retenues r
    cross join compte
    order by
      case when p_tri = 'croissant'   then r.prix end asc  nulls last,
      case when p_tri = 'decroissant' then r.prix end desc nulls last,
      -- Au hasard, ce que les marques ont mis en avant passe d'abord.
      case when p_tri = 'hasard' then not r.en_avant end asc,
      case when p_tri = 'hasard' then r.rang end asc,
      case when p_tri = 'hasard' then r.cle end asc,
      r.id
    offset greatest(p_depuis, 0)
    limit least(greatest(p_combien, 1), 96)
  )
  -- Et seulement maintenant, les colonnes lourdes, pour les lignes rendues.
  select
    pg.total,
    p.id, p.brand_id, p.slug, p.name,
    p.price_cents, p.compare_at_cents,
    p.price_eur_cents, p.compare_at_eur_cents,
    p.currency, p.image_url,
    (select array_agg(x) from (
       select x from unnest(p.images) with ordinality u(x, n)
       order by u.n limit 4
     ) q) as images,
    p.categories,
    p.available, p.retired_at, p.position,
    m.slug, m.name
  from page pg
  join public.products p on p.id = pg.id
  join marques m on m.id = p.brand_id
  order by
    case when p_tri = 'croissant'   then pg.prix end asc  nulls last,
    case when p_tri = 'decroissant' then pg.prix end desc nulls last,
    case when p_tri = 'hasard' then not pg.en_avant end asc,
    case when p_tri = 'hasard' then pg.rang end asc,
    case when p_tri = 'hasard' then pg.cle end asc,
    pg.id;
$$;

comment on function public.vitrine(text, text[], text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) is
  'Une page de la vitrine : filtre, trie, compte et decoupe cote base. `total` est le nombre de pieces retenues AVANT le decoupage, repete sur chaque ligne. `p_graine` fixe l''ordre « au hasard » pour toute la duree d''une visite. Sans filtre lourd, ne lit que l''index `products_vitrine_idx` (migration 45). Au hasard, les pieces mises en avant par leur marque passent d''abord (migration 43, quatre au plus par marque).';

grant execute on function public.vitrine(text, text[], text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) to anon, authenticated;

notify pgrst, 'reload schema';
