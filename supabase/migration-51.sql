-- ============================================================
-- MIGRATION 51 — le nuancier : chercher les pièces par couleur
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-50.sql. Rejouable.
--
-- CE QUE ÇA FAIT
--
--   1. Deux colonnes sur `products` : `couleurs`, une ou deux familles
--      (« noir », « marine »… voir `lib/couleurs.ts`), et `teinte`, la
--      couleur moyenne de la pièce en #rrggbb, gardée pour plus tard
--      (accorder des pièces entre elles).
--
--      NULL veut dire « pas encore lue ». Une liste vide veut dire « lue,
--      et rien de sûr » : la pièce ne sera pas relue à chaque passage.
--
--   2. Une pièce dont le nom ou la photo principale change est à relire :
--      un déclencheur remet ses couleurs à NULL.
--
--   3. `poser_les_couleurs` : l'écriture par lots, réservée aux
--      administrateurs (l'automate en est un). Deux cents pièces en un
--      appel au lieu de deux cents.
--
--   4. `vitrine` et `histogramme_vitrine` prennent `p_couleurs` : une
--      pièce passe si elle porte AU MOINS UNE des couleurs cochées.
--
--   5. Les comptes du catalogue gagnent `couleurs`, par rayon, comme les
--      tailles : la barre de filtres n'affiche que les couleurs qui ont
--      des pièces.
--
-- AUCUN CALCUL N'A LIEU ICI. Les couleurs sont lues par le site (tâche
-- quotidienne et bouton de l'admin, « Catalogues »), une fois par pièce.
-- Tant qu'elles ne le sont pas, le filtre n'apparaît simplement pas.
--
-- LE CODE PEUT ARRIVER AVANT LA MIGRATION : il ne passe `p_couleurs`
-- que lorsqu'une couleur est cochée, et il n'en propose aucune tant que
-- les comptes ne les donnent pas.

-- 1. Les colonnes ------------------------------------------------------

alter table public.products
  add column if not exists couleurs text[],
  add column if not exists teinte   text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_couleurs_connues') then
    alter table public.products
      add constraint products_couleurs_connues check (
        couleurs is null
        or couleurs <@ array['noir', 'gris', 'blanc', 'beige', 'marron', 'kaki', 'vert', 'bleu',
                             'marine', 'violet', 'rose', 'rouge', 'bordeaux', 'orange', 'jaune',
                             'dore', 'argente']::text[]
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_teinte_hex') then
    alter table public.products
      add constraint products_teinte_hex check (teinte is null or teinte ~ '^#[0-9a-f]{6}$');
  end if;
end;
$$;

comment on column public.products.couleurs is
  'Une ou deux familles de couleur (lib/couleurs.ts). NULL : pas encore lue ; vide : lue, rien de sûr.';
comment on column public.products.teinte is
  'La couleur moyenne de la pièce, #rrggbb, quand elle a été lue sur la photo.';

-- La file des pièces à lire : petite, et elle se vide.
create index if not exists products_couleurs_a_lire_idx
  on public.products (id)
  where couleurs is null and status = 'published' and retired_at is null and a_un_visuel;

-- 2. Relire ce qui change ----------------------------------------------

create or replace function public.couleurs_a_relire()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.couleurs := null;
  new.teinte := null;
  return new;
end;
$$;

-- La synchro réécrit le nom et la photo à chaque passage, la plupart du
-- temps à l'identique : seul un VRAI changement remet la pièce en file.
drop trigger if exists products_couleurs_a_relire on public.products;
create trigger products_couleurs_a_relire
  before update of name, image_url on public.products
  for each row
  when (old.name is distinct from new.name or old.image_url is distinct from new.image_url)
  execute function public.couleurs_a_relire();

-- 3. L'écriture par lots -----------------------------------------------

create or replace function public.poser_les_couleurs(p_lignes jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  update public.products p
     set couleurs = l.couleurs,
         teinte   = l.teinte
    from jsonb_to_recordset(p_lignes) as l(id uuid, couleurs text[], teinte text)
   where p.id = l.id;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function public.poser_les_couleurs(jsonb) from public, anon;
grant execute on function public.poser_les_couleurs(jsonb) to authenticated;

-- 4. La vitrine --------------------------------------------------------
--
-- Une fonction SQL ne change pas de signature par `create or replace` :
-- on retire l'ancienne. Garder les deux ferait hésiter PostgREST entre
-- elles à chaque appel sans couleur.

drop function if exists public.vitrine(text, text[], text[], text[], text[], text, integer, integer, boolean, boolean, text, text, integer, integer);

create or replace function public.vitrine(
  p_graine text,
  p_taxonomie text[],
  p_rayons text[] default null,
  p_tags text[] default null,
  p_tailles text[] default null,
  p_marque text default null,
  p_prix_min integer default null,
  p_prix_max integer default null,
  p_stock boolean default false,
  p_promo boolean default false,
  p_q text default null,
  p_tri text default 'hasard',
  p_depuis integer default 0,
  p_combien integer default 24,
  p_couleurs text[] default null
)
returns table(
  total integer, id uuid, brand_id uuid, slug text, name text,
  price_cents integer, compare_at_cents integer, price_eur_cents integer, compare_at_eur_cents integer,
  currency text, image_url text, images text[], categories text[],
  available boolean, retired_at timestamp with time zone, rang integer,
  brand_slug text, brand_name text
)
language sql
stable
security definer
set search_path = public
as $$
  -- Le mot cherché, préparé une fois.
  with motif as materialized (
    select case
      when p_q is null or p_q = '' then null
      else '%' || public.unaccent_simple(replace(p_q, chr(31), '')) || '%'
    end as m
  ),
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
  -- 1. SANS FILTRE LOURD : l'index seul (migration 45). La couleur est un
  --    filtre lourd, comme le tag : elle n'est pas dans l'index.
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
        and (p_couleurs is null or array_length(p_couleurs, 1) is null)
        and not coalesce(p_stock, false)
        and not coalesce(p_promo, false)
        and (p_q is null or p_q = '')
      )
  ),
  -- 2. AVEC UN FILTRE LOURD : la table, une fois.
  lourdes as materialized (
    select
      p.id,
      p.position as rang,
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
      and (p_couleurs is null or array_length(p_couleurs, 1) is null or p.couleurs && p_couleurs)
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
        and (p_couleurs is null or array_length(p_couleurs, 1) is null)
        and not coalesce(p_stock, false)
        and not coalesce(p_promo, false)
        and (p_q is null or p_q = '')
      )
  ),
  retenues as not materialized (
    select * from legeres
    union all
    select * from lourdes
  ),
  compte as (
    select count(*)::int as total from retenues
  ),
  page as (
    select r.*, compte.total
    from retenues r
    cross join compte
    order by
      case when p_tri = 'croissant'   then r.prix end asc  nulls last,
      case when p_tri = 'decroissant' then r.prix end desc nulls last,
      case when p_tri = 'hasard' then not r.en_avant end asc,
      case when p_tri = 'hasard' then r.rang end asc,
      case when p_tri = 'hasard' then r.cle end asc,
      r.id
    offset greatest(p_depuis, 0)
    limit least(greatest(p_combien, 1), 96)
  )
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

comment on function public.vitrine(text, text[], text[], text[], text[], text, integer, integer, boolean, boolean, text, text, integer, integer, text[]) is
  'Une page de la vitrine : filtre, trie, compte et decoupe cote base. `total` est le nombre de pieces retenues AVANT le decoupage. Sans filtre lourd, ne lit que l''index `products_vitrine_idx` (migration 45). `p_couleurs` : au moins une des couleurs cochees (migration 51).';

grant execute on function public.vitrine(text, text[], text[], text[], text[], text, integer, integer, boolean, boolean, text, text, integer, integer, text[]) to anon, authenticated;

-- L'histogramme du rail de prix suit les mêmes filtres.

drop function if exists public.histogramme_vitrine(text[], text[], text[], text[], text, boolean, boolean, text, integer, integer, integer);

create or replace function public.histogramme_vitrine(
  p_taxonomie text[],
  p_rayons text[] default null,
  p_tags text[] default null,
  p_tailles text[] default null,
  p_marque text default null,
  p_stock boolean default false,
  p_promo boolean default false,
  p_q text default null,
  p_bas integer default 0,
  p_pas integer default 1250,
  p_tranches integer default 24,
  p_couleurs text[] default null
)
returns integer[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pas      int := greatest(coalesce(p_pas, 1), 1);
  v_tranches int := least(greatest(coalesce(p_tranches, 24), 1), 60);
  v_motif    text := case
    when p_q is null or p_q = '' then null
    else '%' || public.unaccent_simple(replace(p_q, chr(31), '')) || '%'
  end;
  v_sql      text;
  v_res      int[];
begin
  v_sql := '
    with prix as (
      select coalesce(p.price_eur_cents, p.price_cents) as prix
      from public.products p
      join public.brands b on b.id = p.brand_id and b.status = ''published''
      where p.status = ''published''
        and p.retired_at is null
        and p.a_un_visuel
        and coalesce(p.price_eur_cents, p.price_cents) is not null';

  if p_rayons is not null and array_length(p_rayons, 1) is not null then
    v_sql := v_sql || '
        and (
          select u.c
          from unnest(p.categories) with ordinality u(c, n)
          where u.c = any ($1)
          order by u.n
          limit 1
        ) = any ($2)';
  end if;

  if p_tags is not null and array_length(p_tags, 1) is not null then
    v_sql := v_sql || ' and p.tags && $3';
  end if;

  if p_tailles is not null and array_length(p_tailles, 1) is not null then
    v_sql := v_sql || ' and p.tailles && $4';
  end if;

  if p_couleurs is not null and array_length(p_couleurs, 1) is not null then
    v_sql := v_sql || ' and p.couleurs && $10';
  end if;

  if p_marque is not null then
    v_sql := v_sql || ' and b.slug = $5';
  end if;

  if coalesce(p_stock, false) then
    v_sql := v_sql || ' and p.available';
  end if;

  if coalesce(p_promo, false) then
    v_sql := v_sql || '
        and p.compare_at_cents is not null
        and p.price_cents is not null
        and p.compare_at_cents > p.price_cents';
  end if;

  if v_motif is not null then
    v_sql := v_sql || '
        and (p.recherche ilike $6 or public.unaccent_simple(b.name) ilike $6)';
  end if;

  v_sql := v_sql || '
    ),
    cases as (
      select least(greatest((prix - $7) / $8, 0), $9) as k, count(*)::int as n
      from prix
      group by 1
    )
    select array_agg(coalesce(c.n, 0) order by g.k)
    from generate_series(0, $9) as g(k)
    left join cases c on c.k = g.k';

  execute v_sql
    into v_res
    using p_taxonomie, p_rayons, p_tags, p_tailles, p_marque, v_motif,
          coalesce(p_bas, 0), v_pas, v_tranches, p_couleurs;

  return v_res;
end;
$$;

grant execute on function public.histogramme_vitrine(text[], text[], text[], text[], text, boolean, boolean, text, integer, integer, integer, text[]) to anon, authenticated;

-- 5. Les comptes du catalogue -----------------------------------------
--
-- La même fonction que la migration 50, avec `couleurs` en plus.

create or replace function public.calculer_comptes_du_catalogue(p_taxonomie text[])
returns jsonb
language sql
stable
security definer
set search_path = public
set work_mem = '32MB'
as $$
  with marques as materialized (
    select b.id, b.slug, b.name
    from public.brands b
    where b.status = 'published'
  ),
  base as materialized (
    select
      p.brand_id,
      p.tags,
      p.tailles,
      p.couleurs,
      p.available,
      p.compare_at_cents,
      p.price_cents,
      coalesce(p.price_eur_cents, p.price_cents) as prix,
      (
        select u.c
        from unnest(p.categories) with ordinality as u(c, rang)
        where u.c = any (p_taxonomie)
        order by u.rang
        limit 1
      ) as rayon
    from public.products p
    join marques m on m.id = p.brand_id
    where p.status = 'published'
      and p.retired_at is null
  )
  select jsonb_build_object(
    'rayons', (
      select coalesce(jsonb_agg(jsonb_build_object('rayon', x.rayon, 'total', x.total) order by x.total desc), '[]'::jsonb)
      from (select rayon, count(*)::int as total from base group by rayon) x
    ),
    'tags', (
      select coalesce(jsonb_agg(jsonb_build_object('rayon', x.rayon, 'tag', x.tag, 'total', x.total) order by x.total desc), '[]'::jsonb)
      from (
        select b.rayon, t.tag, count(*)::int as total
        from base b
        cross join lateral unnest(b.tags) as t(tag)
        group by b.rayon, t.tag
      ) x
    ),
    'tailles', (
      select coalesce(jsonb_agg(jsonb_build_object('rayon', x.rayon, 'taille', x.taille, 'total', x.total) order by x.rayon, x.taille), '[]'::jsonb)
      from (
        select b.rayon, t.taille, count(*)::int as total
        from base b
        cross join lateral unnest(b.tailles) as t(taille)
        group by b.rayon, t.taille
      ) x
    ),
    -- Nouveau (migration 51).
    'couleurs', (
      select coalesce(jsonb_agg(jsonb_build_object('rayon', x.rayon, 'couleur', x.couleur, 'total', x.total) order by x.total desc), '[]'::jsonb)
      from (
        select b.rayon, c.couleur, count(*)::int as total
        from base b
        cross join lateral unnest(b.couleurs) as c(couleur)
        group by b.rayon, c.couleur
      ) x
    ),
    'bornes', (
      select jsonb_build_object(
        'prix_min', min(prix)::int,
        'prix_max', max(prix)::int,
        'a_des_ruptures', bool_or(not available),
        'a_des_promos', bool_or(compare_at_cents is not null
                                and price_cents is not null
                                and compare_at_cents > price_cents)
      )
      from base
    ),
    'marques', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', m.slug, 'nom', m.name, 'total', coalesce(n.total, 0))), '[]'::jsonb)
      from marques m
      left join (select brand_id, count(*)::int as total from base group by brand_id) n
        on n.brand_id = m.id
    )
  );
$$;

revoke execute on function public.calculer_comptes_du_catalogue(text[]) from public, anon, authenticated;

-- Le cache repart tout de suite avec la nouvelle clé.
select public.rafraichir_comptes_du_catalogue();

notify pgrst, 'reload schema';
