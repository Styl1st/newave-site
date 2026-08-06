-- ============================================================
--  NEWAVE SPHERE — schema complet
--  A coller dans Supabase : SQL Editor > New query > Run
--  Le fichier est rejouable : tu peux le relancer sans rien casser.
-- ============================================================

-- ============================================================
--  1. COMPTES
--  Supabase gere les mots de passe dans auth.users, une table
--  qu'on ne touche pas. On y accroche notre propre table
--  "profiles" pour y ranger le role.
-- ============================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  role          text not null default 'membre' check (role in ('membre','admin')),
  created_at    timestamptz not null default now()
);

-- A chaque inscription, Supabase cree la ligne auth.users.
-- Ce declencheur cree la ligne profiles correspondante, en membre.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fonction d'aiguillage utilisee par toutes les regles de securite.
-- "security definer" lui permet de lire profiles sans declencher
-- les regles RLS de profiles : sans ca, on tourne en rond.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
--  2. CONTENU
-- ============================================================

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

-- Les pieces. Le paiement se fait chez la marque : shop_url est le
-- lien sortant. C'est ici que se greffera l'affiliation.
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references public.brands(id) on delete cascade,
  name          text not null,
  price_cents   int,
  currency      text not null default 'EUR',
  image_url     text,
  shop_url      text not null,
  categories    text[] not null default '{}',
  featured      boolean not null default false,
  status        text not null default 'published' check (status in ('draft','published')),
  position      int not null default 0,
  created_at    timestamptz not null default now()
);

-- Les posts : tes publications Instagram, hebergees chez toi.
create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  caption        text not null default '',
  image_url      text,
  image_alt      text not null default '',
  keywords       text[] not null default '{}',
  brand_id       uuid references public.brands(id) on delete set null,
  instagram_url  text,
  tiktok_url     text,
  status         text not null default 'draft' check (status in ('draft','published')),
  published_at   timestamptz,
  created_at     timestamptz not null default now()
);

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

-- Favoris de la communaute.
create table if not exists public.favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  brand_id    uuid not null references public.brands(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, brand_id)
);

create table if not exists public.outbound_clicks (
  id          bigserial primary key,
  brand_id    uuid references public.brands(id) on delete set null,
  product_id  uuid references public.products(id) on delete set null,
  referer     text,
  created_at  timestamptz not null default now()
);

-- Anciennes donnees : si tu avais deja lance la premiere version,
-- la table articles existe encore. On la laisse, elle ne gene pas.

-- ============================================================
--  3. SECURITE (Row Level Security)
--
--  Trois niveaux :
--    - visiteur      : lit ce qui est publie, depose une candidature
--    - membre connecte : en plus, gere SES favoris
--    - admin         : ecrit tout
--
--  Point important : un membre connecte ne doit PAS pouvoir
--  publier. C'est is_admin() qui fait la difference, pas le
--  simple fait d'etre authentifie.
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.brands          enable row level security;
alter table public.products        enable row level security;
alter table public.posts           enable row level security;
alter table public.applications    enable row level security;
alter table public.favorites       enable row level security;
alter table public.outbound_clicks enable row level security;

-- ---------- profils ----------
drop policy if exists "chacun lit son profil" on public.profiles;
create policy "chacun lit son profil"
  on public.profiles for select using (id = auth.uid() or public.is_admin());

drop policy if exists "chacun modifie son profil" on public.profiles;
create policy "chacun modifie son profil"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Garde-fou indispensable : la regle ci-dessus autorise chacun a modifier
-- SA ligne, ce qui inclurait la colonne "role". Sans ce declencheur,
-- n'importe quel membre pourrait se promouvoir administrateur en une
-- requete depuis son navigateur. RLS ne sait pas proteger une colonne
-- en particulier, donc on le fait ici.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- auth.uid() vaut null quand la requete vient de l'editeur SQL de
  -- Supabase : c'est le seul endroit d'ou tu peux te nommer admin.
  if auth.uid() is not null
     and new.role is distinct from old.role
     and not public.is_admin() then
    raise exception 'Seul un administrateur peut changer un role.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------- marques ----------
drop policy if exists "lecture publique des marques publiees" on public.brands;
create policy "lecture publique des marques publiees"
  on public.brands for select using (status = 'published' or public.is_admin());

drop policy if exists "ecriture admin des marques" on public.brands;
create policy "ecriture admin des marques"
  on public.brands for all using (public.is_admin()) with check (public.is_admin());

-- ---------- pieces ----------
drop policy if exists "lecture publique des pieces" on public.products;
create policy "lecture publique des pieces"
  on public.products for select using (
    public.is_admin() or (
      status = 'published' and exists (
        select 1 from public.brands b
        where b.id = products.brand_id and b.status = 'published'
      )
    )
  );

drop policy if exists "ecriture admin des pieces" on public.products;
create policy "ecriture admin des pieces"
  on public.products for all using (public.is_admin()) with check (public.is_admin());

-- ---------- posts ----------
drop policy if exists "lecture publique des posts publies" on public.posts;
create policy "lecture publique des posts publies"
  on public.posts for select using (status = 'published' or public.is_admin());

drop policy if exists "ecriture admin des posts" on public.posts;
create policy "ecriture admin des posts"
  on public.posts for all using (public.is_admin()) with check (public.is_admin());

-- ---------- candidatures ----------
-- N'importe qui DEPOSE, seul l'admin LIT.
drop policy if exists "depot public de candidature" on public.applications;
create policy "depot public de candidature"
  on public.applications for insert with check (true);

drop policy if exists "lecture admin des candidatures" on public.applications;
create policy "lecture admin des candidatures"
  on public.applications for select using (public.is_admin());

drop policy if exists "gestion admin des candidatures" on public.applications;
create policy "gestion admin des candidatures"
  on public.applications for update using (public.is_admin()) with check (public.is_admin());

-- ---------- favoris ----------
-- Chacun ne voit et ne touche que les siens.
drop policy if exists "lecture de ses favoris" on public.favorites;
create policy "lecture de ses favoris"
  on public.favorites for select using (user_id = auth.uid());

drop policy if exists "ajout de ses favoris" on public.favorites;
create policy "ajout de ses favoris"
  on public.favorites for insert with check (user_id = auth.uid());

drop policy if exists "retrait de ses favoris" on public.favorites;
create policy "retrait de ses favoris"
  on public.favorites for delete using (user_id = auth.uid());

-- ---------- clics sortants ----------
drop policy if exists "enregistrement public des clics" on public.outbound_clicks;
create policy "enregistrement public des clics"
  on public.outbound_clicks for insert with check (true);

drop policy if exists "lecture admin des clics" on public.outbound_clicks;
create policy "lecture admin des clics"
  on public.outbound_clicks for select using (public.is_admin());

-- ============================================================
--  4. STOCKAGE DES IMAGES
--  Un seul bucket public : les visuels de posts, marques et pieces.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "lecture publique des medias" on storage.objects;
create policy "lecture publique des medias"
  on storage.objects for select using (bucket_id = 'media');

drop policy if exists "envoi admin des medias" on storage.objects;
create policy "envoi admin des medias"
  on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "remplacement admin des medias" on storage.objects;
create policy "remplacement admin des medias"
  on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());

drop policy if exists "suppression admin des medias" on storage.objects;
create policy "suppression admin des medias"
  on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());

-- ============================================================
--  5. INDEX
-- ============================================================

create index if not exists brands_status_idx   on public.brands(status, published_at desc);
create index if not exists brands_featured_idx on public.brands(featured) where featured;
create index if not exists posts_status_idx    on public.posts(status, published_at desc);
create index if not exists posts_keywords_idx  on public.posts using gin(keywords);
create index if not exists products_brand_idx  on public.products(brand_id, position);
create index if not exists favorites_user_idx  on public.favorites(user_id);
