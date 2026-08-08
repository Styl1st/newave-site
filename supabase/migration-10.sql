-- ============================================================
--  MIGRATION 10 — coups de cœur éphémères, suppression de comptes
--
--  A lancer dans le SQL Editor, apres migration-09.sql. Rejouable.
-- ============================================================

-- ------------------------------------------------------------
--  1. LES COUPS DE CŒUR NE DURENT QU'UNE SEMAINE
--
--  On ne supprime pas les lignes : la cle primaire (user_id,
--  product_id) empecherait alors de re-aimer une piece une fois le
--  delai passe. On les laisse en base et on ne COMPTE que les
--  recentes. Re-aimer remet simplement la date a jour.
--
--  Effet voulu : le classement reflete ce qui plait MAINTENANT, pas
--  ce qui a plu il y a six mois. Une piece doit meriter sa place
--  chaque semaine.
-- ------------------------------------------------------------

create or replace view public.product_like_counts as
select product_id, count(*)::int as likes
from public.product_likes
where created_at > now() - interval '7 days'
group by product_id;

-- Permet a un membre de re-aimer une piece dont le coup de cœur a expire.
drop policy if exists "rafraichissement de son like" on public.product_likes;
create policy "rafraichissement de son like"
  on public.product_likes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists product_likes_recents_idx
  on public.product_likes (created_at desc);

-- Menage optionnel : a lancer de temps en temps, ou jamais.
-- Les lignes anciennes ne faussent aucun chiffre, elles occupent
-- juste de la place.
-- delete from public.product_likes where created_at < now() - interval '90 days';

-- ------------------------------------------------------------
--  2. SUPPRIMER UN COMPTE DEPUIS LE SITE
--
--  La table auth.users est hors de portee de la cle publique, et
--  c'est heureux. On passe par une fonction "security definer" qui
--  verifie elle-meme les droits : c'est la seule porte, et elle est
--  gardee.
--
--  Toutes les tables liees ont un ON DELETE CASCADE : profil,
--  favoris, coups de cœur et rattachements de marque partent avec le
--  compte. Les MARQUES, elles, restent — elles appartiennent au site,
--  pas au compte qui les gerait.
-- ------------------------------------------------------------

create or replace function public.delete_user_account(target uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Suppression reservee aux administrateurs.';
  end if;

  if target = auth.uid() then
    raise exception 'Tu ne peux pas supprimer ton propre compte depuis cette interface.';
  end if;

  if exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception 'Retire d''abord le role administrateur de ce compte.';
  end if;

  delete from auth.users where id = target;
end;
$$;

revoke all on function public.delete_user_account(uuid) from public, anon;
grant execute on function public.delete_user_account(uuid) to authenticated;
