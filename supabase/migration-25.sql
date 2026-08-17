-- Migration 25 — les boutiques qui ne sont pas ouvertes à tout le monde.
--
-- Beaucoup de marques indépendantes ne vendent pas en continu : un mot
-- de passe le temps d'un drop, une liste d'attente, des ventes
-- réservées à ceux qui suivent le compte. Notre lecture automatique n'y
-- voyait qu'un catalogue vide, et la fiche restait en brouillon pour une
-- raison qui n'en était pas une — alors que ce sont justement les
-- marques qu'on ne trouve nulle part ailleurs.
--
-- Une colonne, quatre valeurs, et la fiche peut être publiée en disant
-- au visiteur ce qu'il en est.

alter table public.brands
  add column if not exists acces text not null default 'ouvert';

-- La contrainte est refaite plutôt qu'ajoutée : rejouer la migration ne
-- doit pas échouer sur une contrainte qui existe déjà.
alter table public.brands
  drop constraint if exists brands_acces_valide;

alter table public.brands
  add constraint brands_acces_valide
  check (acces in ('ouvert', 'bientot', 'prive', 'liste'));

-- Les boutiques que la lecture avait déjà trouvées fermées basculent
-- toutes seules. C'est exactement ce que `catalogue_verrouille` voulait
-- dire : un site debout, mais rien à vendre pour l'instant.
--
-- Seulement celles restées sur la valeur par défaut : si quelqu'un a
-- déjà choisi autre chose, ce choix l'emporte sur une déduction.
update public.brands
set acces = 'bientot'
where coalesce(catalogue_verrouille, false) is true
  and acces = 'ouvert';

-- PostgREST tient en mémoire la liste des colonnes. Sans ce réveil, la
-- première écriture répond « column not found in the schema cache »
-- alors que la colonne existe bel et bien.
notify pgrst, 'reload schema';
