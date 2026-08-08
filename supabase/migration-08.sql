-- ============================================================
--  MIGRATION 08 — mesure de fréquentation
--
--  A lancer dans le SQL Editor, apres migration-07.sql. Rejouable.
--
--  On compte des PAGES VUES, rien d'autre. Pas d'adresse IP, pas
--  d'empreinte de navigateur, pas de cookie, pas d'identifiant de
--  session. Impossible de relier deux visites entre elles, donc
--  impossible de suivre quelqu'un.
--
--  C'est un choix, pas une limite technique : une mesure reellement
--  anonyme n'a pas besoin du consentement du visiteur, et evite une
--  banniere que personne n'a envie de voir.
-- ============================================================

create table if not exists public.page_views (
  id          bigserial primary key,
  path        text not null,
  -- Provenance a la maille du domaine : "instagram.com", pas l'URL
  -- complete qui pourrait contenir des parametres identifiants.
  source      text,
  created_at  timestamptz not null default now()
);

alter table public.page_views enable row level security;

drop policy if exists "enregistrement public des vues" on public.page_views;
create policy "enregistrement public des vues"
  on public.page_views for insert with check (true);

drop policy if exists "lecture admin des vues" on public.page_views;
create policy "lecture admin des vues"
  on public.page_views for select using (public.is_admin());

create index if not exists page_views_date_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx on public.page_views (path);
