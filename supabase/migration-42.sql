-- ============================================================
-- MIGRATION 42 — une vitrine qui ne dépasse plus le délai
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-41.sql. Rejouable.
-- Rien à changer côté code : `vitrine` garde son nom, ses arguments et
-- ses colonnes de sortie.
--
-- LE SYMPTÔME. De temps en temps, `/pieces` s'affichait sans colonne de
-- filtres, avec « 1 422 pièces · 24 marques » en tête, et le serveur
-- écrivait :
--   [newave] une page de vitrine : canceling statement due to statement timeout
-- L'API coupe à trois secondes. Quand `vitrine` les dépasse, la page
-- retombe sur l'échantillon, et la base, occupée, rate souvent les
-- comptes du catalogue dans la foulée.
--
-- POURQUOI ELLE ÉTAIT LENTE. Contrairement aux comptes, `vitrine` n'est
-- gardée en mémoire nulle part : chaque visite et chaque « Charger 24 de
-- plus » la relancent, avec une graine différente. Et pour en rendre
-- vingt-quatre, elle travaillait sur TOUTES les pièces publiées :
--
--   — pour chacune, elle dépliait `images` et passait chaque adresse dans
--     une expression régulière, pour écarter les pièces sans photo ;
--   — pour chacune, elle préparait aussi ses quatre premières photos,
--     qu'elle traînait ensuite dans le tri des quarante mille lignes ;
--   — une recherche (`p_q`) appelait `unaccent_simple` quatre fois par
--     pièce (nom, marque, rayons, tags), et quatre fois encore sur le mot
--     cherché. Une fonction SQL portant un `set search_path` ne peut pas
--     être déroulée dans la requête : chaque appel coûte un vrai appel.
--
-- LE REMÈDE, LE MÊME QUE POUR LES TAILLES (migration 36) : calculer à
-- l'écriture ce qu'on relisait à chaque visite.
--
--   1. `a_un_visuel` : la pièce a-t-elle au moins une photo qui ne soit
--      pas une vidéo. Un booléen, tenu par un déclencheur.
--   2. `recherche` : nom, rayons et tags, sans accents, en une seule
--      chaîne. Même déclencheur. Les champs sont séparés par le
--      caractère 31 (« séparateur d'unité »), qu'on retire du mot
--      cherché : une recherche ne peut donc pas enjamber deux champs,
--      exactement comme avant.
--   3. `vitrine` trie et compte sur des colonnes légères (id, position,
--      prix, clé de marque), et ne va chercher photos, nom et rayons que
--      pour les vingt-quatre lignes rendues. Le hachage de la marque
--      (l'ordre « au hasard ») se calcule une fois par MARQUE et non plus
--      une fois par pièce.
--
-- MESURÉ sur une copie de 60 000 pièces (50 000 en vitrine) :
--   page d'accueil de la vitrine   ~500 ms → ~150 ms
--   recherche « pièce 12 »        ~2 200 ms → ~200 ms
-- et, sur 22 combinaisons de filtres, de tris et de décalages, des
-- résultats identiques ligne pour ligne à ceux de la migration 36.
-- ============================================================

-- Le rattrapage de l'étape 4 réécrit toutes les pièces une fois : il
-- peut dépasser le délai par défaut de l'éditeur.
set statement_timeout = '5min';

-- ------------------------------------------------------------
-- 1. LES DEUX CALCULS
-- ------------------------------------------------------------

-- La règle qu'appliquait `vitrine` ligne par ligne : la galerie si elle
-- existe, sinon la photo principale, et au moins une adresse qui ne soit
-- pas une vidéo (`VignetteDefilante` ne sait pas en afficher).
create or replace function public.a_un_visuel(p_images text[], p_image_url text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select exists (
    select 1
    from unnest(
      case when coalesce(array_length(p_images, 1), 0) > 0
           then p_images
           else array[p_image_url]
      end
    ) as m
    where m is not null
      and m <> ''
      and m !~* '\.(mp4|webm|m4v|mov)(\?|#|$)'
  );
$$;

-- Ce que la recherche de la vitrine lit : nom, rayons et tags, sans
-- accents. La casse reste : `ilike` s'en charge. Le nom de la MARQUE
-- n'y est pas — il change sans que les pièces soient réécrites — et se
-- traite à part, une fois par marque, dans `vitrine`.
create or replace function public.texte_de_recherche(p_name text, p_categories text[], p_tags text[])
returns text
language sql
immutable
set search_path = public
as $$
  select public.unaccent_simple(
    concat_ws(chr(31), p_name, array_to_string(p_categories, chr(31)), array_to_string(p_tags, chr(31)))
  );
$$;

-- ------------------------------------------------------------
-- 2. LES COLONNES
-- ------------------------------------------------------------

alter table public.products
  add column if not exists a_un_visuel boolean not null default false,
  add column if not exists recherche   text    not null default '';

-- ------------------------------------------------------------
-- 3. LE DÉCLENCHEUR
-- ------------------------------------------------------------
--
-- Import, synchro quotidienne, espace marque, administration : toute
-- écriture des colonnes sources remet les deux champs à jour. Personne
-- n'a à y penser.

create or replace function public.poser_les_champs_vitrine()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.a_un_visuel := public.a_un_visuel(new.images, new.image_url);
  new.recherche   := public.texte_de_recherche(new.name, new.categories, new.tags);
  return new;
end;
$$;

drop trigger if exists products_champs_vitrine on public.products;
create trigger products_champs_vitrine
  before insert or update of images, image_url, name, categories, tags on public.products
  for each row execute function public.poser_les_champs_vitrine();

-- ------------------------------------------------------------
-- 4. UNE FOIS POUR LES PIÈCES DÉJÀ EN BASE
-- ------------------------------------------------------------
--
-- Toutes, brouillons et retirées comprises : une pièce republiée doit
-- arriver avec des champs justes. Le `where` rend l'étape rejouable
-- sans rien réécrire la seconde fois.

update public.products
set a_un_visuel = public.a_un_visuel(images, image_url),
    recherche   = public.texte_de_recherche(name, categories, tags)
where a_un_visuel is distinct from public.a_un_visuel(images, image_url)
   or recherche   is distinct from public.texte_de_recherche(name, categories, tags);

-- ------------------------------------------------------------
-- 5. LA VITRINE
-- ------------------------------------------------------------
--
-- Même signature que la 36 : `create or replace` suffit.

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
    case when p_tri = 'hasard' then pg.rang end asc,
    case when p_tri = 'hasard' then pg.cle end asc,
    pg.id;
$$;

comment on function public.vitrine(text, text[], text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) is
  'Une page de la vitrine : filtre, trie, compte et decoupe cote base. `total` est le nombre de pieces retenues AVANT le decoupage, repete sur chaque ligne. `p_graine` fixe l''ordre « au hasard » pour toute la duree d''une visite. Lit `a_un_visuel` et `recherche`, tenues a jour par le declencheur `products_champs_vitrine` (migration 42).';

grant execute on function public.vitrine(text, text[], text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) to anon, authenticated;

notify pgrst, 'reload schema';

-- Vérification : combien de pièces publiées n'ont aucune photo
-- affichable (elles n'apparaissent pas dans la vitrine, comme avant).
select
  count(*) filter (where a_un_visuel)     as avec_visuel,
  count(*) filter (where not a_un_visuel) as sans_visuel
from public.products
where status = 'published' and retired_at is null;
