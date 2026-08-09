-- ============================================================
--  MIGRATION 12 — classements « depuis toujours » et catalogues
--                 remis a jour tout seuls
--
--  A lancer dans le SQL Editor, apres migration-11.sql. Rejouable.
-- ============================================================

-- ------------------------------------------------------------
--  1. RIEN N'EST EFFACE AU BOUT DE SEPT JOURS
--
--  Precision utile, parce que le nom de la vue peut laisser croire
--  l'inverse : aucun coup de cœur n'est supprime. La vue
--  product_like_counts ne COMPTE que les sept derniers jours, c'est
--  tout. Les lignes restent en base, et c'est ce qui rend le
--  classement « depuis toujours » ci-dessous possible.
--
--  Les deux vues lisent donc exactement la meme table :
--    product_like_counts        -> la tendance du moment
--    product_like_counts_total  -> le total de tous les temps
-- ------------------------------------------------------------

create or replace view public.product_like_counts_total as
select
  product_id,
  count(*)::int as likes,
  max(created_at) as dernier
from public.product_likes
group by product_id;

-- ------------------------------------------------------------
--  2. LES MARQUES LES PLUS MISES EN FAVORI
--
--  Meme principe, cote marques. Les favoris n'ont jamais eu de duree
--  de vie : suivre une maison n'est pas un geste d'humeur.
--
--  ATTENTION : la table favorites n'est lisible que par son
--  proprietaire. Une vue ordinaire heriterait de cette restriction et
--  ne renverrait que SES favoris, ce qui ne ferait pas un classement.
--  On passe donc par une fonction "security definer" qui ne rend que
--  des totaux — jamais qui a mis quoi en favori.
-- ------------------------------------------------------------

create or replace function public.brand_favorite_counts()
returns table (brand_id uuid, favoris int)
language sql
security definer
set search_path = public
stable
as $$
  select f.brand_id, count(*)::int as favoris
  from public.favorites f
  join public.brands b on b.id = f.brand_id
  where b.status = 'published'
  group by f.brand_id
  order by count(*) desc;
$$;

comment on function public.brand_favorite_counts() is
  'Totaux publics des favoris par marque publiee. Ne revele jamais l''identite des personnes : seuls les nombres sortent.';

grant execute on function public.brand_favorite_counts() to anon, authenticated;

create index if not exists favorites_brand_idx on public.favorites(brand_id);

-- ------------------------------------------------------------
--  3. SUIVI DE LA MISE A JOUR AUTOMATIQUE DES CATALOGUES
--
--  Une tache passe chaque jour relire les boutiques. Elle ne peut pas
--  toutes les traiter d'un coup : Vercel coupe une fonction au bout
--  d'une minute. On note donc la date du dernier passage par marque,
--  et chaque execution reprend par les plus anciennes. En quelques
--  jours, tout le monde est passe.
--
--  catalogue_auto permet a une marque de rester maitresse de sa
--  fiche : mise a false, on ne touche plus a rien chez elle.
-- ------------------------------------------------------------

alter table public.brands
  add column if not exists catalogue_sync_at timestamptz,
  add column if not exists catalogue_auto boolean not null default true,
  add column if not exists catalogue_sync_note text;

comment on column public.brands.catalogue_sync_at is
  'Dernier passage de la mise a jour automatique du catalogue.';
comment on column public.brands.catalogue_auto is
  'false : la marque a demande que son catalogue ne soit plus relu automatiquement.';
comment on column public.brands.catalogue_sync_note is
  'Resultat du dernier passage, affiche dans l''espace marque.';

create index if not exists brands_sync_idx
  on public.brands (catalogue_sync_at nulls first)
  where status = 'published' and catalogue_auto;

-- Verification.
select 'product_like_counts_total' as objet, count(*)::text as lignes
from public.product_like_counts_total
union all
select 'brand_favorite_counts', count(*)::text from public.brand_favorite_counts()
union all
select 'colonnes brands', string_agg(column_name, ', ')
from information_schema.columns
where table_schema = 'public' and table_name = 'brands'
  and column_name in ('catalogue_sync_at', 'catalogue_auto', 'catalogue_sync_note');
