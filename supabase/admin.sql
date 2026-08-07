-- ============================================================
--  Te passer admin
--
--  A lancer APRES avoir cree ton compte sur /connexion.
--  Deux etapes : tu regardes, puis tu modifies.
-- ============================================================

-- ---------- ETAPE 1 : voir les comptes existants ----------
-- Lance cette requete seule d'abord. Elle te montre l'adresse
-- exacte avec laquelle tu t'es inscrit, majuscules comprises.

select id, email, display_name, role, created_at
from public.profiles
order by created_at;


-- ---------- ETAPE 2 : te promouvoir ----------
-- Remplace l'adresse ci-dessous par CELLE QUE TU VIENS DE LIRE,
-- puis lance ces deux requetes.
--
-- Si "Success. 0 rows" s'affiche, c'est que l'adresse ne correspond
-- pas : reviens a l'etape 1 et recopie-la exactement.

update public.profiles
set role = 'admin'
where email = 'newavesphere@gmail.com';

-- Verification : ta ligne doit maintenant afficher role = admin.
select email, role from public.profiles;
