-- ============================================================
-- MIGRATION 43 — les pièces mises en avant passent d'abord
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-42.sql. Rejouable.
-- Rien à changer côté code : `vitrine` garde son nom, ses arguments et
-- ses colonnes de sortie. Le site fonctionne avant comme après.
--
-- LE PROBLÈME. Chaque pièce porte une case « Mettre en avant », et rien
-- ne la lisait : ni la page de la marque, ni l'accueil, ni la vitrine.
-- Une marque qui la cochait ne voyait aucun changement. Le site range
-- maintenant ces pièces en premier sur la page de la marque et sur
-- l'accueil (côté code, voir `lib/en-avant`) ; cette migration fait la
-- même chose dans la vitrine `/pieces`.
--
-- CE QUI CHANGE. Dans l'ordre « au hasard » seulement, les pièces mises
-- en avant passent avant les autres. Entre elles, rien ne bouge : même
-- tour de table par marque (`rang`), même mélange des marques (`cle`).
-- Les tris par prix ne changent pas : quelqu'un qui demande « du moins
-- cher au plus cher » doit l'avoir, quoi que les marques aient choisi.
--
-- La limite de quatre pièces par marque est tenue par le site (les
-- actions de l'espace marque) : la vitrine s'ouvre donc sur au plus
-- quatre pièces de chaque marque avant de reprendre son tour habituel.
--
-- ET UN INDEX, PETIT. L'accueil lit à part les pièces mises en avant
-- qui sont loin dans leur boutique (voir `lireLaVitrine`). Sans index,
-- cette lecture parcourt toute la table pour en trouver quelques
-- dizaines. L'index partiel ne contient QUE ces pièces : il pèse
-- presque rien et ne ralentit aucune écriture des autres.
--
-- AUCUNE LIGNE N'EST RÉÉCRITE : la fonction est remplacée et l'index
-- ajouté. Pas besoin du `vacuum full` qui avait suivi la migration 42.
-- ============================================================

create index if not exists products_en_avant_idx
  on public.products (position)
  where featured and retired_at is null and status = 'published';


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
  retenues as (
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
  ),
  -- Le total sur TOUT ce qui est retenu, puis le découpage. Même tri que
  -- la 36 : la clé de marque vaut `md5(brand_id || graine)`.
  page as (
    select r.*, (count(*) over ())::int as total
    from retenues r
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
  'Une page de la vitrine : filtre, trie, compte et decoupe cote base. `total` est le nombre de pieces retenues AVANT le decoupage, repete sur chaque ligne. `p_graine` fixe l''ordre « au hasard » pour toute la duree d''une visite. Lit `a_un_visuel` et `recherche`, tenues a jour par le declencheur `products_champs_vitrine` (migration 42). Au hasard, les pieces mises en avant par leur marque passent d''abord (migration 43, quatre au plus par marque).';

grant execute on function public.vitrine(text, text[], text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) to anon, authenticated;

notify pgrst, 'reload schema';

