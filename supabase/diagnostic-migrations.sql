-- ============================================================
--  Ou en suis-je dans les migrations ?
--
--  A lancer dans le SQL Editor. Ne modifie rien, ne lit que la
--  structure. Chaque ligne dit "OK" ou "MANQUE".
-- ============================================================

select
  'migration-11 : profiles.apparence' as etape,
  case when exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='apparence'
  ) then 'OK' else 'MANQUE' end as etat

union all select
  'migration-12 : brands.catalogue_auto',
  case when exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='brands' and column_name='catalogue_auto'
  ) then 'OK' else 'MANQUE' end

union all select
  'migration-12 : vue product_like_counts_total',
  case when exists (
    select 1 from information_schema.views
    where table_schema='public' and table_name='product_like_counts_total'
  ) then 'OK' else 'MANQUE' end

union all select
  'migration-13 : products.retired_at',
  case when exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='retired_at'
  ) then 'OK' else 'MANQUE' end

union all select
  'migration-14 : table reviews',
  case when exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='reviews'
  ) then 'OK' else 'MANQUE' end;

-- ------------------------------------------------------------
--  Si une ligne dit OK mais que le site continue de repondre
--  "column ... does not exist", ce n'est plus la base : c'est le
--  cache de l'API.
--
--  Supabase garde en memoire la liste des colonnes pour repondre
--  vite. Ajouter une colonne ne le previent pas toujours. La ligne
--  ci-dessous le force a relire.
-- ------------------------------------------------------------

notify pgrst, 'reload schema';
