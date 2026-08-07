-- ============================================================
--  MIGRATION 02 — espaces marque, carrousels, candidatures liees
--
--  A lancer dans le SQL Editor de Supabase APRES schema.sql.
--  Rejouable : tu peux la relancer sans rien casser ni perdre.
-- ============================================================

-- ------------------------------------------------------------
--  1. GERANTS DE MARQUE
--
--  Une marque peut avoir plusieurs gerants (le fondateur, son
--  associe...), et une personne peut gerer plusieurs marques.
--  D'ou une table de liaison plutot qu'une colonne sur profiles.
-- ------------------------------------------------------------

create table if not exists public.brand_managers (
  brand_id    uuid not null references public.brands(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (brand_id, user_id)
);

-- Utilisee par toutes les regles de securite ci-dessous.
-- security definer : elle lit brand_managers sans declencher les
-- regles RLS de brand_managers, sinon on tournerait en rond.
create or replace function public.manages_brand(b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.brand_managers
    where brand_id = b and user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
--  2. CARROUSELS
--  Une colonne tableau, en plus de image_url qui reste la
--  vignette utilisee dans les listes et les apercus de partage.
-- ------------------------------------------------------------

alter table public.posts    add column if not exists images text[] not null default '{}';
alter table public.products add column if not exists images text[] not null default '{}';

-- Reprise des visuels deja saisis : ce qui etait dans image_url
-- devient la premiere image du carrousel.
update public.posts
set images = array[image_url]
where image_url is not null and cardinality(images) = 0;

update public.products
set images = array[image_url]
where image_url is not null and cardinality(images) = 0;

-- ------------------------------------------------------------
--  3. PIECES : description et provenance
-- ------------------------------------------------------------

alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists available boolean not null default true;
-- Identifiant Shopify, pour ne pas creer de doublon a chaque import.
alter table public.products add column if not exists source_id text;

-- Index complet, et non partiel : un ON CONFLICT ne sait pas designer
-- un index assorti d'une clause WHERE depuis le client Supabase.
-- Les pieces saisies a la main ont source_id a NULL, et deux NULL ne
-- se ressemblent jamais pour un index unique : elles ne se genent pas.
create unique index if not exists products_source_unique
  on public.products (brand_id, source_id);

-- ------------------------------------------------------------
--  4. CANDIDATURES RATTACHEES A UN COMPTE
--  Quand la marque candidate en etant connectee, on retient qui,
--  pour pouvoir lui donner les droits en un clic apres validation.
-- ------------------------------------------------------------

alter table public.applications add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.applications add column if not exists brand_id uuid references public.brands(id) on delete set null;

-- ------------------------------------------------------------
--  5. SECURITE
--
--  Trois cercles, du plus large au plus etroit :
--    visiteur  -> lit le publie
--    gerant    -> modifie SA marque et SES pieces
--    admin     -> tout
--
--  Ce qu'un gerant ne peut PAS faire, et c'est volontaire :
--  publier sa fiche, se mettre a la une, changer son adresse de
--  page, ou toucher aux posts du media. Voir le declencheur en 6.
-- ------------------------------------------------------------

alter table public.brand_managers enable row level security;

drop policy if exists "lecture de ses rattachements" on public.brand_managers;
create policy "lecture de ses rattachements"
  on public.brand_managers for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "gestion admin des rattachements" on public.brand_managers;
create policy "gestion admin des rattachements"
  on public.brand_managers for all
  using (public.is_admin()) with check (public.is_admin());

-- --- marques ---
drop policy if exists "lecture publique des marques publiees" on public.brands;
create policy "lecture publique des marques publiees"
  on public.brands for select
  using (status = 'published' or public.is_admin() or public.manages_brand(id));

drop policy if exists "modification par le gerant" on public.brands;
create policy "modification par le gerant"
  on public.brands for update
  using (public.manages_brand(id)) with check (public.manages_brand(id));

-- --- pieces ---
drop policy if exists "ecriture admin des pieces" on public.products;
drop policy if exists "gestion des pieces par le gerant" on public.products;
create policy "gestion des pieces par le gerant"
  on public.products for all
  using (public.is_admin() or public.manages_brand(brand_id))
  with check (public.is_admin() or public.manages_brand(brand_id));

drop policy if exists "lecture publique des pieces" on public.products;
create policy "lecture publique des pieces"
  on public.products for select
  using (
    public.is_admin()
    or public.manages_brand(brand_id)
    or (status = 'published' and exists (
      select 1 from public.brands b
      where b.id = products.brand_id and b.status = 'published'
    ))
  );

-- --- candidatures ---
-- On garde le depot ouvert a tous, y compris aux visiteurs non
-- connectes : une marque ne doit pas avoir a creer un compte pour
-- nous ecrire. Mais si elle est connectee, on retient son compte.
drop policy if exists "lecture de sa candidature" on public.applications;
create policy "lecture de sa candidature"
  on public.applications for select
  using (user_id = auth.uid() or public.is_admin());

-- --- stockage ---
-- Un gerant doit pouvoir envoyer les visuels de ses pieces.
drop policy if exists "envoi admin des medias" on storage.objects;
drop policy if exists "envoi des medias" on storage.objects;
create policy "envoi des medias"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and (public.is_admin() or exists (
      select 1 from public.brand_managers where user_id = auth.uid()
    ))
  );

-- ------------------------------------------------------------
--  6. GARDE-FOU EDITORIAL
--
--  RLS autorise ou refuse une ligne entiere, jamais une colonne.
--  Sans ce declencheur, un gerant pourrait passer sa fiche en
--  "publie" et se mettre a la une tout seul depuis son navigateur.
-- ------------------------------------------------------------

create or replace function public.protect_brand_editorial()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.status  is distinct from old.status
    or new.featured is distinct from old.featured
    or new.slug     is distinct from old.slug then
      raise exception 'Publication, mise en avant et adresse de page sont reservees a la redaction.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_brand_editorial on public.brands;
create trigger protect_brand_editorial
  before update on public.brands
  for each row execute function public.protect_brand_editorial();

-- ------------------------------------------------------------
--  7. INDEX
-- ------------------------------------------------------------

create index if not exists brand_managers_user_idx on public.brand_managers(user_id);
create index if not exists applications_user_idx   on public.applications(user_id);
