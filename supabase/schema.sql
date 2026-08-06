-- ============================================================
--  NEWAVE SPHERE — schema de base
--  A coller dans Supabase : SQL Editor > New query > Run
-- ============================================================

-- ---------- MARQUES ----------
create table if not exists public.brands (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  tagline       text not null default '',
  description   text not null default '',
  country       text not null default 'France',
  city          text,
  founded_year  int,
  categories    text[] not null default '{}',
  price_tier    text not null default 'intermediaire'
                check (price_tier in ('accessible','intermediaire','premium')),
  website_url   text,
  shop_url      text,
  instagram     text,
  logo_url      text,
  cover_url     text,
  featured      boolean not null default false,
  status        text not null default 'draft' check (status in ('draft','published')),
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- PRODUITS (vitrine + affiliation) ----------
-- Les produits vivent ici, mais le paiement se fait chez la marque :
-- affiliate_url est le lien sortant, avec ton parametre de tracking.
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  brand_id       uuid not null references public.brands(id) on delete cascade,
  name           text not null,
  price_cents    int,
  currency       text not null default 'EUR',
  image_url      text,
  affiliate_url  text not null,
  featured       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ---------- ARTICLES ----------
create table if not exists public.articles (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  excerpt          text not null default '',
  cover_url        text,
  body             text not null default '',
  brand_slug       text references public.brands(slug) on delete set null,
  reading_minutes  int not null default 3,
  status           text not null default 'draft' check (status in ('draft','published')),
  published_at     timestamptz,
  created_at       timestamptz not null default now()
);

-- ---------- CANDIDATURES ----------
create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  brand_name    text not null,
  contact_name  text not null,
  email         text not null,
  instagram     text,
  website       text,
  pitch         text not null,
  status        text not null default 'nouvelle'
                check (status in ('nouvelle','en_cours','acceptee','refusee')),
  created_at    timestamptz not null default now()
);

-- ---------- CLICS SORTANTS (mesure de l'affiliation) ----------
create table if not exists public.outbound_clicks (
  id          bigserial primary key,
  brand_id    uuid references public.brands(id) on delete set null,
  product_id  uuid references public.products(id) on delete set null,
  referer     text,
  created_at  timestamptz not null default now()
);

-- ============================================================
--  SECURITE (Row Level Security)
--  Regle : le public LIT ce qui est publie, et ne peut rien
--  modifier. Seul un compte authentifie (toi) ecrit.
-- ============================================================

alter table public.brands          enable row level security;
alter table public.products        enable row level security;
alter table public.articles        enable row level security;
alter table public.applications    enable row level security;
alter table public.outbound_clicks enable row level security;

drop policy if exists "lecture publique des marques publiees" on public.brands;
create policy "lecture publique des marques publiees"
  on public.brands for select using (status = 'published');

drop policy if exists "lecture publique des produits" on public.products;
create policy "lecture publique des produits"
  on public.products for select using (
    exists (select 1 from public.brands b
            where b.id = products.brand_id and b.status = 'published')
  );

drop policy if exists "lecture publique des articles publies" on public.articles;
create policy "lecture publique des articles publies"
  on public.articles for select using (status = 'published');

-- N'importe qui peut DEPOSER une candidature, personne ne peut les LIRE
-- depuis le navigateur : tu les consultes dans l'interface Supabase.
drop policy if exists "depot public de candidature" on public.applications;
create policy "depot public de candidature"
  on public.applications for insert with check (true);

drop policy if exists "enregistrement public des clics" on public.outbound_clicks;
create policy "enregistrement public des clics"
  on public.outbound_clicks for insert with check (true);

-- Toi, une fois connecte, tu as tous les droits.
drop policy if exists "ecriture authentifiee marques" on public.brands;
create policy "ecriture authentifiee marques"
  on public.brands for all to authenticated using (true) with check (true);

drop policy if exists "ecriture authentifiee produits" on public.products;
create policy "ecriture authentifiee produits"
  on public.products for all to authenticated using (true) with check (true);

drop policy if exists "ecriture authentifiee articles" on public.articles;
create policy "ecriture authentifiee articles"
  on public.articles for all to authenticated using (true) with check (true);

drop policy if exists "lecture authentifiee candidatures" on public.applications;
create policy "lecture authentifiee candidatures"
  on public.applications for select to authenticated using (true);

-- ---------- INDEX ----------
create index if not exists brands_status_idx   on public.brands(status, published_at desc);
create index if not exists brands_featured_idx on public.brands(featured) where featured;
create index if not exists articles_status_idx on public.articles(status, published_at desc);
create index if not exists products_brand_idx  on public.products(brand_id);
