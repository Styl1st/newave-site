-- ============================================================
--  migration 11 — l'apparence suit le compte, pas l'appareil
-- ============================================================
--  A lancer dans l'editeur SQL de Supabase. Rejouable sans risque.
--
--  Jusqu'ici les couleurs de fond vivaient dans le navigateur. Se
--  connecter depuis un telephone donnait donc un site different de
--  celui qu'on avait regle sur son ordinateur — alors que c'est bien
--  une preference de personne, pas de machine.
--
--  On la range donc sur le profil. Le stockage local reste utilise
--  pour les visiteurs non connectes, et comme cache anti-scintillement.
-- ============================================================

alter table public.profiles
  add column if not exists apparence jsonb;

comment on column public.profiles.apparence is
  'Preferences d''affichage : couleurs du fond, mouvement, ambiances et reglages enregistres. Structure libre, lue et ecrite par le site.';

-- Aucune nouvelle politique n'est necessaire : "chacun modifie son
-- profil" couvre deja cette colonne, et le declencheur
-- protect_profile_role continue d'empecher qu'on se promeuve
-- administrateur en passant par la meme requete.

-- Verification.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'apparence';
