-- ============================================================
-- MIGRATION 34 — les tags lus sur le site des marques
-- ============================================================
--
-- Le rayon d'une pièce (Hauts, Bas, Vestes…) était DEVINÉ à partir de
-- son nom, une fois pour toutes, à sa création. Il disait « Hauts »
-- là où la boutique, elle, range ses pièces en « Tees », « Hoodies »,
-- « Outerwear », « Capsule Nuit ».
--
-- Cette migration donne à chaque pièce :
--
--   `tags`                le tag fin (T-shirts, Hoodies, Bombers…), en
--                         plus de la famille qui reste dans `categories` ;
--   `tags_locaux`         les collections de la boutique que le lexique
--                         ne sait pas ranger (« Capsule Nuit », « FW25 ») ;
--   `rangement_boutique`  ce que la boutique a déclaré, tel quel (type,
--                         collections, étiquettes), pour pouvoir
--                         reclasser plus tard SANS relire la boutique ;
--   `classement_manuel`   vrai quand un gérant a choisi lui-même : la
--                         synchro ne touche plus alors ni au rayon ni
--                         au tag fin.
--
-- Le vocabulaire vit dans `src/lib/tags.ts`. La base ne fait que
-- ranger et compter, comme pour les rayons (migration 31).
--
-- À LANCER AVANT DE POUSSER LE CODE. Le site tolère une base qui ne
-- l'a pas encore (les tags n'apparaissent simplement pas), mais la
-- synchro des catalogues a besoin des colonnes pour enregistrer.
-- ============================================================

-- ------------------------------------------------------------
-- 1. LES COLONNES
-- ------------------------------------------------------------

alter table public.products
  add column if not exists tags               text[]  not null default '{}',
  add column if not exists tags_locaux        text[]  not null default '{}',
  add column if not exists rangement_boutique jsonb,
  add column if not exists classement_manuel  boolean not null default false;

-- Une pièce saisie à la main n'a jamais été dans le flux d'une
-- boutique : son rayon est un choix, pas une déduction. On le fige.
update public.products
set classement_manuel = true
where source_id is null
  and classement_manuel = false;

create index if not exists products_tags_idx
  on public.products using gin (tags);

-- ------------------------------------------------------------
-- 2. LES DÉCISIONS DE L'ADMIN SUR LES TAGS LOCAUX
-- ------------------------------------------------------------
--
-- Une collection que le lexique ne connaît pas devient un tag local,
-- visible sur la page de sa marque seulement. Depuis `/admin/tags`, on
-- peut la PROMOUVOIR (elle devient un tag global, ou une famille) ou la
-- MASQUER (elle n'apparaît plus nulle part).
--
-- `cle` est le libellé normalisé (minuscules, sans accents ni genre :
-- voir `cleDeLibelle`), si bien que « Capsule Nuit Femme » et
-- « CAPSULE NUIT » suivent la même règle. `libelles` garde les
-- écritures rencontrées, pour l'affichage ; `marques` les marques qui
-- portaient ce tag, pour reclasser leurs pièces tout de suite, et de
-- nouveau si l'on retire la règle.

create table if not exists public.tags_regles (
  cle         text primary key,
  decision    text not null check (decision in ('global', 'masque')),
  tag         text,
  famille     text,
  libelles    text[] not null default '{}',
  marques     text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (decision = 'masque' or tag is not null)
);

alter table public.tags_regles enable row level security;

-- La synchro les lit, quel que soit le compte qui la lance.
drop policy if exists "lecture des regles de tags" on public.tags_regles;
create policy "lecture des regles de tags"
  on public.tags_regles for select
  using (true);

drop policy if exists "ecriture admin des regles de tags" on public.tags_regles;
create policy "ecriture admin des regles de tags"
  on public.tags_regles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 3. COMPTER
-- ------------------------------------------------------------
--
-- Même périmètre que `compter_les_rayons` : pièces publiées, en vente,
-- de marques publiées. Un tag n'existe que s'il a au moins une pièce :
-- c'est ce qui garantit qu'aucun filtre n'est vide.

create or replace function public.compter_les_tags(p_taxonomie text[])
returns table (rayon text, tag text, total int)
language sql
security definer
set search_path = public
stable
as $$
  select x.rayon, t.tag, count(*)::int as total
  from (
    select
      p.tags,
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
      and cardinality(p.tags) > 0
  ) x
  cross join lateral unnest(x.tags) as t(tag)
  group by x.rayon, t.tag
  order by count(*) desc;
$$;

comment on function public.compter_les_tags(text[]) is
  'Compte les pieces publiees et en vente par rayon et par tag fin. Le rayon retenu est le premier de `categories` qui figure dans la taxonomie passee en argument.';

grant execute on function public.compter_les_tags(text[]) to anon, authenticated;

-- Ce que chaque marque vend, pour le filtre de l'annuaire : ses
-- familles et ses tags fins, avec le nombre de pièces. Une ligne par
-- marque (un objet JSON) plutôt qu'une par couple : cent quarante
-- marques fois vingt tags dépasseraient les mille lignes que l'API
-- rend sans le dire.

create or replace function public.tags_des_marques(p_taxonomie text[])
returns table (brand_id uuid, vend jsonb)
language sql
security definer
set search_path = public
stable
as $$
  with pieces as (
    select
      p.brand_id,
      p.tags,
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
  ),
  cles as (
    select pieces.brand_id, pieces.rayon as cle
    from pieces
    where pieces.rayon is not null
    union all
    select pieces.brand_id, t.tag as cle
    from pieces
    cross join lateral unnest(pieces.tags) as t(tag)
  ),
  comptes as (
    select cles.brand_id, cles.cle, count(*)::int as total
    from cles
    group by cles.brand_id, cles.cle
  )
  select comptes.brand_id, jsonb_object_agg(comptes.cle, comptes.total) as vend
  from comptes
  group by comptes.brand_id;
$$;

comment on function public.tags_des_marques(text[]) is
  'Pour chaque marque publiee : un objet { famille ou tag fin : nombre de pieces publiees et en vente }. Sert au filtre « Vend » de l''annuaire.';

grant execute on function public.tags_des_marques(text[]) to anon, authenticated;

-- Les tags locaux de tout le site, pour l'écran d'admin. `security
-- invoker` : ce sont les règles de lecture des pièces qui s'appliquent,
-- l'admin voit tout, un visiteur ne verrait que le publié.

create or replace function public.tags_locaux_du_site()
returns table (libelle text, brand_slug text, brand_name text, total int)
language sql
security invoker
set search_path = public
stable
as $$
  select l.libelle, b.slug, b.name, count(*)::int
  from public.products p
  join public.brands b on b.id = p.brand_id
  cross join lateral unnest(p.tags_locaux) as l(libelle)
  where p.retired_at is null
  group by l.libelle, b.slug, b.name
  order by count(*) desc, l.libelle;
$$;

grant execute on function public.tags_locaux_du_site() to authenticated;

-- ------------------------------------------------------------
-- 4. RECLASSER SANS RELIRE LES BOUTIQUES
-- ------------------------------------------------------------
--
-- Le classement se calcule dans `lib/tags.ts`, à partir de
-- `rangement_boutique`. Cette fonction écrit d'un coup le résultat d'un
-- lot de mille pièces, au lieu d'une requête par pièce.
--
-- `security invoker` : ce sont les règles d'écriture des pièces qui
-- décident, c'est-à-dire l'admin ou le gérant de la marque.

create or replace function public.appliquer_classement(p_lignes jsonb)
returns int
language sql
security invoker
set search_path = public
as $$
  with maj as (
    update public.products p
    set categories  = x.categories,
        tags        = x.tags,
        tags_locaux = x.tags_locaux
    from jsonb_to_recordset(p_lignes)
      as x(id uuid, categories text[], tags text[], tags_locaux text[])
    where p.id = x.id
    returning 1
  )
  select count(*)::int from maj;
$$;

grant execute on function public.appliquer_classement(jsonb) to authenticated;

-- ------------------------------------------------------------
-- 5. LA VITRINE FILTRE AUSSI PAR TAG FIN
-- ------------------------------------------------------------
--
-- Même fonction que la migration 33, avec un argument de plus. Il faut
-- retirer l'ancienne : `create or replace` avec une liste d'arguments
-- différente en créerait une SECONDE à côté, et l'API ne saurait plus
-- laquelle appeler.

drop function if exists public.vitrine(text, text[], text[], text, int, int, boolean, boolean, text, text, int, int);

create or replace function public.vitrine(
  p_graine     text,
  p_taxonomie  text[],
  p_rayons     text[] default null,
  p_tags       text[] default null,
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

comment on function public.vitrine(text, text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) is
  'Une page de la vitrine : filtre, trie, compte et decoupe cote base. `total` est le nombre de pieces retenues AVANT le decoupage, repete sur chaque ligne. `p_graine` fixe l''ordre « au hasard » pour toute la duree d''une visite : le changer rebat les marques, le garder garantit qu''aucune piece ne sort deux fois d''une page a l''autre.';

grant execute on function public.vitrine(text, text[], text[], text[], text, int, int, boolean, boolean, text, text, int, int) to anon, authenticated;

-- L'API relit la liste des colonnes et des fonctions.
notify pgrst, 'reload schema';
