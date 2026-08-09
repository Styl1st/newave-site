-- ============================================================
--  MIGRATION 14 — avis et notes en étoiles
--
--  A lancer dans le SQL Editor, apres migration-13.sql. Rejouable.
--
--  Le site connait deja deux gestes rapides : le coup de cœur sur une
--  piece, le favori sur une marque. Ils disent "j'aime" en un clic, et
--  n'engagent a rien.
--
--  L'avis est autre chose : une note reflechie, souvent accompagnee de
--  quelques phrases. On le range donc a part, et on ne melange jamais
--  les deux dans un meme classement.
--
--  LA NOTE EST STOCKEE EN DEMI-ETOILES, de 1 a 10.
--  C'est le seul moyen propre d'avoir 4,5 etoiles sans nombre a
--  virgule : les entiers se comparent et s'additionnent sans surprise,
--  la virgule non. On divise par deux a l'affichage, et seulement la.
-- ============================================================

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  brand_id     uuid references public.brands(id)   on delete cascade,
  product_id   uuid references public.products(id) on delete cascade,
  note         smallint not null check (note between 1 and 10),
  commentaire  text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Un avis porte sur une marque OU sur une piece, jamais sur les deux,
  -- jamais sur rien.
  constraint reviews_une_seule_cible
    check ((brand_id is null) <> (product_id is null))
);

-- Un avis par personne et par cible. Changer d'avis se fait en
-- modifiant le sien, pas en en empilant un deuxieme.
create unique index if not exists reviews_par_marque
  on public.reviews (user_id, brand_id) where brand_id is not null;
create unique index if not exists reviews_par_piece
  on public.reviews (user_id, product_id) where product_id is not null;

create index if not exists reviews_marque_idx  on public.reviews (brand_id);
create index if not exists reviews_piece_idx   on public.reviews (product_id);

alter table public.reviews enable row level security;

-- ---------- qui peut quoi ----------

-- Les avis sont publics : c'est leur raison d'etre.
drop policy if exists "lecture publique des avis" on public.reviews;
create policy "lecture publique des avis"
  on public.reviews for select using (true);

drop policy if exists "chacun depose son avis" on public.reviews;
create policy "chacun depose son avis"
  on public.reviews for insert with check (user_id = auth.uid());

drop policy if exists "chacun modifie son avis" on public.reviews;
create policy "chacun modifie son avis"
  on public.reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Retrait par son auteur, ou par un administrateur : il faut pouvoir
-- effacer une insulte sans attendre le bon vouloir de qui l'a ecrite.
drop policy if exists "retrait de son avis" on public.reviews;
create policy "retrait de son avis"
  on public.reviews for delete using (user_id = auth.uid() or public.is_admin());

-- ---------- l'auteur d'un avis ----------
--
--  Un avis anonyme ne vaut pas grand-chose. Mais la table des profils
--  n'est lisible que par son proprietaire, et c'est tres bien ainsi :
--  personne ne doit pouvoir aspirer la liste des membres.
--
--  Cette vue resout le probleme sans ouvrir la table : elle ne laisse
--  sortir que le nom d'affichage, et uniquement pour les personnes qui
--  ont ecrit quelque chose de public.

create or replace view public.avis_publics
with (security_invoker = off) as
select
  r.id,
  r.brand_id,
  r.product_id,
  r.note,
  r.commentaire,
  r.created_at,
  r.updated_at,
  r.user_id,
  coalesce(nullif(trim(p.display_name), ''), 'Membre') as auteur
from public.reviews r
left join public.profiles p on p.id = r.user_id;

comment on view public.avis_publics is
  'Les avis avec le nom de leur auteur. Ne laisse sortir aucune autre donnee de profil.';

grant select on public.avis_publics to anon, authenticated;

-- ---------- les moyennes ----------
--
--  Des vues plutot que des colonnes calculees : un compteur range dans
--  products se desynchronise des qu'une suppression passe a cote, une
--  vue ne peut pas mentir.
--
--  On garde la note en demi-etoiles ici aussi. La division par deux
--  appartient a l'affichage.

create or replace view public.product_ratings as
select
  product_id,
  round(avg(note))::int as note_moyenne,
  count(*)::int         as avis
from public.reviews
where product_id is not null
group by product_id;

create or replace view public.brand_ratings as
select
  brand_id,
  round(avg(note))::int as note_moyenne,
  count(*)::int         as avis
from public.reviews
where brand_id is not null
group by brand_id;

grant select on public.product_ratings, public.brand_ratings to anon, authenticated;

-- ---------- date de derniere modification ----------

create or replace function public.touch_review()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch
  before update on public.reviews
  for each row execute function public.touch_review();

-- Verification.
select 'avis' as objet, count(*)::text as total from public.reviews;
