-- ============================================================
-- migration 19 — signaler une marque, une piece ou un avis
-- ============================================================
--
-- La migration 18 ne savait signaler qu'un avis. Or ce n'est pas la
-- seule chose qui peut deraper sur un annuaire : une fiche de marque
-- peut annoncer une boutique fermee, une piece afficher un prix faux
-- ou une image qui n'est pas la sienne, une marque se faire usurper
-- par quelqu'un qui n'y est pour rien.
--
-- Une seule table pour les trois, et non trois tables : le travail de
-- moderation est le meme geste, et il doit se lire au meme endroit.
-- C'est aussi le decoupage deja retenu pour les avis, qui visent soit
-- une marque soit une piece.
--
-- A passer dans l'editeur SQL de Supabase. La table review_reports est
-- reprise puis supprimee : rien n'est perdu.

create table if not exists public.signalements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  -- Une cible et une seule. Les trois colonnes plutot qu'un couple
  -- (type, id) : c'est ce qui permet a Postgres de garantir lui-meme
  -- que la cible existe, et d'effacer le signalement avec elle.
  review_id   uuid references public.reviews(id)   on delete cascade,
  product_id  uuid references public.products(id)  on delete cascade,
  brand_id    uuid references public.brands(id)    on delete cascade,

  motif       text not null,
  detail      text check (detail is null or char_length(detail) <= 600),

  created_at  timestamptz not null default now(),
  -- Rempli des qu'un administrateur a tranche, dans un sens ou dans
  -- l'autre. Sans cette colonne, un signalement examine puis juge sans
  -- suite resterait dans la pile pour toujours.
  traite_at   timestamptz,

  constraint signalements_une_seule_cible
    check (num_nonnulls(review_id, product_id, brand_id) = 1)
);

-- Une personne, un signalement par cible. Trois index partiels, parce
-- qu'une contrainte d'unicite ordinaire considererait deux NULL comme
-- differents et laisserait passer les doublons.
create unique index if not exists signalements_par_avis
  on public.signalements (user_id, review_id)  where review_id is not null;
create unique index if not exists signalements_par_piece
  on public.signalements (user_id, product_id) where product_id is not null;
create unique index if not exists signalements_par_marque
  on public.signalements (user_id, brand_id)   where brand_id is not null;

-- La seule requete frequente : ce qui attend d'etre regarde.
create index if not exists signalements_attente_idx
  on public.signalements (created_at desc) where traite_at is null;

alter table public.signalements enable row level security;

drop policy if exists "deposer un signalement" on public.signalements;
create policy "deposer un signalement"
  on public.signalements for insert to authenticated
  with check (user_id = auth.uid());

-- On voit les siens — pour savoir qu'ils sont partis — et
-- l'administration voit tout.
drop policy if exists "lecture des signalements" on public.signalements;
create policy "lecture des signalements"
  on public.signalements for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "traiter un signalement" on public.signalements;
create policy "traiter un signalement"
  on public.signalements for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "retrait d un signalement" on public.signalements;
create policy "retrait d un signalement"
  on public.signalements for delete
  using (user_id = auth.uid() or public.is_admin());

-- ---------- reprise de l'ancienne table ----------
do $$
begin
  if to_regclass('public.review_reports') is not null then
    insert into public.signalements (user_id, review_id, motif, detail, created_at, traite_at)
    select r.user_id, r.review_id, r.motif, r.detail, r.created_at, r.traite_at
    from public.review_reports r
    on conflict do nothing;

    drop table public.review_reports;
  end if;
end $$;

-- ---------- verification ----------
-- select count(*) filter (where traite_at is null) as en_attente,
--        count(*) as total
-- from public.signalements;
