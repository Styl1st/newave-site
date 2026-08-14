-- ============================================================
-- migration 21 — savoir qu'une boutique est fermee pour un drop
-- ============================================================
--
-- Beaucoup de marques verrouillent leur site avant une sortie : une
-- page « new drop loading », un mot de passe, et rien d'autre. Notre
-- lecture echoue alors, et jusqu'ici on ne savait pas distinguer ce
-- cas d'un site illisible.
--
-- La difference n'est pas technique, elle est editoriale. « On n'a pas
-- su lire ce catalogue » laisse penser que la marque est mal fichue ;
-- « la boutique prepare quelque chose » dit la verite, et donne meme
-- envie de revenir.
--
-- A passer dans l'editeur SQL de Supabase.

alter table public.brands
  add column if not exists catalogue_verrouille boolean not null default false;

comment on column public.brands.catalogue_verrouille is
  'La boutique est fermee volontairement : mot de passe, drop en preparation. Rempli a chaque lecture du catalogue.';

-- ---------- verification ----------
-- select name, catalogue_verrouille, catalogue_sync_note
-- from public.brands where catalogue_verrouille;
