-- ============================================================
--  MIGRATION 05 — gestion des comptes, nature des candidatures
--
--  A lancer dans le SQL Editor, apres migration-04.sql. Rejouable.
-- ============================================================

-- ------------------------------------------------------------
--  1. QUI PROPOSE LA MARQUE ?
--
--  Distinction essentielle : accepter le dossier d'un fondateur lui
--  donne les cles de sa fiche. Accepter la recommandation d'un
--  passionne ne doit rien lui donner du tout.
-- ------------------------------------------------------------

alter table public.applications
  add column if not exists relationship text not null default 'proprietaire'
  check (relationship in ('proprietaire', 'decouvreur'));

comment on column public.applications.relationship is
  'proprietaire : la personne dirige la marque. decouvreur : elle la recommande.';

-- ------------------------------------------------------------
--  2. L'ADMIN GERE LES ROLES
--
--  La regle existante n'autorisait chacun qu'a modifier SA ligne.
--  Sans celle-ci, l'interface de gestion des comptes afficherait des
--  boutons qui echouent en silence.
--
--  Le declencheur protect_profile_role reste en place : il verifie
--  que seul un admin peut changer un role, y compris via cette regle.
-- ------------------------------------------------------------

drop policy if exists "gestion admin des profils" on public.profiles;
create policy "gestion admin des profils"
  on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
--  3. SUPPRESSION DES CANDIDATURES
-- ------------------------------------------------------------

drop policy if exists "suppression admin des candidatures" on public.applications;
create policy "suppression admin des candidatures"
  on public.applications for delete using (public.is_admin());

-- ------------------------------------------------------------
--  4. INDEX
-- ------------------------------------------------------------

create index if not exists applications_status_idx on public.applications(status, created_at desc);
create index if not exists profiles_role_idx on public.profiles(role);
