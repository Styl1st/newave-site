-- ============================================================
--  MIGRATION 09 — coups de cœur sur les pièces
--
--  A lancer dans le SQL Editor, apres migration-08.sql. Rejouable.
--
--  Les favoris portent sur les MARQUES, les likes sur les PIECES.
--  Deux gestes differents : suivre une maison, ou pointer un vetement.
-- ============================================================

create table if not exists public.product_likes (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.product_likes enable row level security;

-- Chacun gere les siens...
drop policy if exists "ajout de son like" on public.product_likes;
create policy "ajout de son like"
  on public.product_likes for insert with check (user_id = auth.uid());

drop policy if exists "retrait de son like" on public.product_likes;
create policy "retrait de son like"
  on public.product_likes for delete using (user_id = auth.uid());

-- ...mais le total est public : c'est ce qui fait le classement.
-- On expose la ligne entiere en lecture, ce qui revele qui a aime quoi.
-- Acceptable ici : un like sur un vetement n'est pas une donnee
-- sensible, et le classement perdrait tout interet sans.
drop policy if exists "lecture publique des likes" on public.product_likes;
create policy "lecture publique des likes"
  on public.product_likes for select using (true);

create index if not exists product_likes_product_idx on public.product_likes(product_id);
create index if not exists product_likes_user_idx on public.product_likes(user_id);

-- ------------------------------------------------------------
--  Classement des pieces
--
--  Une vue plutot qu'un compteur dans products : un compteur se
--  desynchronise des qu'une suppression passe a cote, une vue ne
--  peut pas mentir.
-- ------------------------------------------------------------

create or replace view public.product_like_counts as
select product_id, count(*)::int as likes
from public.product_likes
group by product_id;
