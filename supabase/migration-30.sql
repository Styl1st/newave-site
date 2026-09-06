-- ============================================================
-- MIGRATION 30 — supprimer son compte
-- ============================================================
--
-- Le compte savait tout faire sauf s'en aller. C'était la dernière
-- promesse non tenue de l'écran des réglages, et la plus désagréable :
-- on n'oblige pas quelqu'un à écrire un email pour partir.
--
-- CE QUE LA BASE FAISAIT DÉJÀ. Tout, ou presque. Chaque table liée à
-- une personne pend à `auth.users(id)` en `on delete cascade` — le
-- profil, les favoris, les likes, les avis, les signalements — et
-- `brand_managers` fait de même. Cette dernière est la plus importante :
-- ce qui est effacé est le LIEN entre la personne et la marque, jamais
-- la marque. Une fiche ne disparaît donc pas avec son gérant, elle
-- redevient simplement sans gérant. C'est exactement ce que l'écran
-- promet, et c'était déjà vrai.
--
-- `applications` est en `on delete set null` : une candidature déjà
-- traitée reste dans l'historique de l'administration, détachée de son
-- auteur.
--
-- CE QUI MANQUAIT. Le droit d'effacer une ligne de `auth.users`.
-- Personne ne l'a : ni le visiteur, ni l'application, qui ne porte que
-- la clé publique. C'est le rôle de cette fonction.
--
-- ⚠️ ELLE NE PREND AUCUN ARGUMENT, ET C'EST TOUT SON DESSIN.
--
-- Une fonction qui recevrait un identifiant devrait vérifier qu'il est
-- bien celui de l'appelant — une vérification de plus, à un endroit de
-- plus, qu'il suffit d'oublier une fois. Sans argument, il n'y a rien à
-- vérifier et rien à falsifier : elle lit `auth.uid()`, et ne peut
-- effacer que la personne qui l'appelle. Le pire qu'on puisse en faire
-- est de supprimer son propre compte, ce qui est précisément ce qu'elle
-- sert à faire.
--
-- `security definer` lui donne le droit d'écrire dans `auth`, et
-- `search_path` est figé pour qu'aucun schéma glissé devant ne détourne
-- les tables qu'elle nomme.

create or replace function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then
    raise exception 'Aucune session : rien à supprimer.'
      using errcode = '28000';
  end if;

  -- Le reste part en cascade. Voir l'en-tête : c'est le schéma qui
  -- tient cette règle, pas cette fonction, et c'est mieux ainsi.
  delete from auth.users where id = moi;
end;
$$;

-- Personne par défaut, et les visiteurs anonymes surtout pas : sans
-- session, `auth.uid()` est nul et la fonction lèverait une erreur —
-- mais autant qu'elle ne soit même pas appelable.
revoke all on function public.supprimer_mon_compte() from public;
revoke all on function public.supprimer_mon_compte() from anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
