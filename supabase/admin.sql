-- ============================================================
--  Te passer en admin
--
--  A lancer UNE FOIS, apres avoir cree ton compte sur le site
--  (page /connexion) avec l'adresse ci-dessous.
--  Remplace l'adresse si tu utilises une autre.
-- ============================================================

update public.profiles
set role = 'admin'
where email = 'contact@newavesphere.fr';

-- Verification : la ligne renvoyee doit afficher role = admin.
select id, email, display_name, role from public.profiles;
