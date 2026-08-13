-- ============================================================
-- migration 17 — l'email du profil suit celui du compte
-- ============================================================
--
-- Le declencheur d'inscription recopie `auth.users.email` dans
-- `profiles.email`, et s'arrete la. Il n'existait rien pour la SUITE :
-- une fois l'adresse changee depuis « Mon compte », la copie restait
-- l'ancienne, indefiniment.
--
-- Ce n'est pas un detail d'affichage. Tout le site lit `profiles`, pas
-- `auth.users` : la page du compte, la table des membres de
-- l'administration, l'expediteur affiche dans les listes. On aurait
-- donc eu une personne connectee avec une adresse, et le site
-- affichant l'autre — sans aucun moyen de savoir laquelle est la
-- bonne.
--
-- A passer dans l'editeur SQL de Supabase.

-- ---------- 1. remettre les copies d'aplomb ----------
-- S'il y a deja eu des changements d'adresse, ils sont rattrapes ici.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

-- ---------- 2. et le rester ----------
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;

-- `after update of email` plutot qu'un `after update` nu : la table
-- auth.users est ecrite a chaque connexion, a chaque rafraichissement
-- de jeton. Sans cette restriction, la fonction tournerait des
-- milliers de fois par jour pour ne rien changer.
--
-- La condition `is distinct from` acheve le tri : Supabase ecrit la
-- colonne email lors de la confirmation d'une adresse identique, et on
-- ne veut pas d'ecriture inutile sur profiles.
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_user_email_change();

-- ---------- verification ----------
-- Doit renvoyer zero ligne.
-- select p.id, p.email as profil, u.email as compte
-- from public.profiles p join auth.users u on u.id = p.id
-- where p.email is distinct from u.email;
