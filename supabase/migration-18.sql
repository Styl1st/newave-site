-- ============================================================
-- migration 18 — signalement et moderation des avis
-- ============================================================
--
-- N'importe qui peut deposer un avis sur une marque, et jusqu'ici rien
-- ne permettait d'en retirer un depuis le site. Les regles de la base
-- autorisaient deja un administrateur a le faire, mais aucun ecran ne
-- le proposait : il fallait ouvrir Supabase.
--
-- Le probleme n'est pas seulement l'outil, c'est de VOIR. Un avis
-- insultant depose sur la fiche d'une marque peut rester des semaines
-- sans que personne ne remonte l'information : la marque le voit, elle
-- se tait ou elle s'en va.
--
-- D'ou cette table. Toute personne connectee peut signaler un avis, et
-- l'administration les retrouve rassembles au meme endroit, du plus
-- signale au moins signale.
--
-- A passer dans l'editeur SQL de Supabase.

create table if not exists public.review_reports (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references public.reviews(id) on delete cascade,
  user_id     uuid not null references auth.users(id)     on delete cascade,

  motif       text not null check (motif in ('insulte', 'hors-sujet', 'faux', 'spam', 'autre')),
  -- Facultatif, et volontairement court : un signalement n'est pas une
  -- plaidoirie, c'est un pointeur vers quelque chose a regarder.
  detail      text check (detail is null or char_length(detail) <= 400),

  created_at  timestamptz not null default now(),
  -- Rempli quand un administrateur a tranche, dans un sens ou dans
  -- l'autre. Sans cette colonne, un signalement examine puis juge sans
  -- suite resterait dans la pile pour toujours.
  traite_at   timestamptz,

  -- Une personne, un signalement. Cela suffit a empecher qu'un seul
  -- compte fasse monter artificiellement un avis dans la pile, sans
  -- avoir besoin de compter les gestes dans le temps.
  unique (review_id, user_id)
);

create index if not exists review_reports_avis_idx
  on public.review_reports (review_id);

-- Les signalements en attente d'abord : c'est la seule requete que
-- l'administration fait souvent.
create index if not exists review_reports_attente_idx
  on public.review_reports (created_at desc)
  where traite_at is null;

alter table public.review_reports enable row level security;

-- ---------- qui peut quoi ----------

-- Chacun signale en son nom, et une seule fois par avis.
drop policy if exists "signaler un avis" on public.review_reports;
create policy "signaler un avis"
  on public.review_reports for insert to authenticated
  with check (user_id = auth.uid());

-- On voit ses propres signalements — pour savoir qu'ils sont partis —
-- et l'administration voit tout.
drop policy if exists "lecture des signalements" on public.review_reports;
create policy "lecture des signalements"
  on public.review_reports for select
  using (user_id = auth.uid() or public.is_admin());

-- Classer un signalement est un acte de moderation.
drop policy if exists "traiter un signalement" on public.review_reports;
create policy "traiter un signalement"
  on public.review_reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- On peut retirer son propre signalement ; l'administration peut faire
-- le menage.
drop policy if exists "retrait d un signalement" on public.review_reports;
create policy "retrait d un signalement"
  on public.review_reports for delete
  using (user_id = auth.uid() or public.is_admin());

-- ---------- verification ----------
-- select count(*) from public.review_reports;
