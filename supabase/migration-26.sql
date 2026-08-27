-- Migration 26 — à qui la marque s'adresse.
--
-- Il manquait au visiteur la première question qu'il se pose en entrant
-- dans un annuaire de mode : est-ce que ça s'adresse à moi. Il fallait
-- ouvrir les fiches une par une pour le découvrir, ce qui revient à
-- parcourir cent trente-cinq boutiques pour en écarter la moitié.
--
-- Une colonne à part, et non deux catégories de plus. « Streetwear » ou
-- « Denim » disent ce qu'une marque FAIT ; « Femme » dit à qui elle le
-- fait. Rangées ensemble, ces deux questions se seraient annulées :
-- cocher « Femme » puis « Grunge » aurait voulu dire la même chose que
-- cocher deux styles, alors qu'on cherche un style DANS un vestiaire.
--
-- « mixte » est la valeur normale, et ce n'est pas un défaut de
-- remplissage. La plupart des marques indépendantes ne segmentent pas :
-- elles font des vêtements, on prend sa taille. Les ranger d'office
-- ailleurs leur prêterait une intention qu'elles n'ont pas.

alter table public.brands
  add column if not exists audience text not null default 'mixte';

-- La contrainte est refaite plutôt qu'ajoutée : rejouer la migration ne
-- doit pas échouer sur une contrainte qui existe déjà.
alter table public.brands
  drop constraint if exists brands_audience_valide;

alter table public.brands
  add constraint brands_audience_valide
  check (audience in ('mixte', 'femme', 'homme'));

-- Les marques déjà rangées dans la catégorie « Womenswear » basculent
-- toutes seules : l'information existait, elle était simplement au
-- mauvais endroit. On ne touche qu'à celles restées sur la valeur par
-- défaut, pour ne rien écraser d'un choix déjà fait.
update public.brands
set audience = 'femme'
where 'Womenswear' = any (categories)
  and audience = 'mixte';

-- Le filtre se pose sur cette colonne à chaque affichage de l'annuaire.
create index if not exists brands_audience_idx on public.brands (audience);

-- PostgREST tient en mémoire la liste des colonnes. Sans ce réveil, la
-- première écriture répond « column not found in the schema cache »
-- alors que la colonne existe bel et bien.
notify pgrst, 'reload schema';
