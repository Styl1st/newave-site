-- Migration 24 — remettre les catégories de marque au propre.
--
-- Deux changements dans le vocabulaire du site, et les fiches déjà
-- enregistrées doivent suivre. Sans ça, l'ancienne valeur continue de
-- vivre à côté de la nouvelle : l'annuaire afficherait « Alt » ET
-- « Alternative » comme deux filtres distincts, chacun avec la moitié
-- des marques.
--
--   1. « Alt » devient « Alternative ». Une abréviation ne fait pas un
--      filtre : le visiteur doit comprendre sans traduire.
--   2. « Vinted » disparaît. C'est un endroit où l'on vend, pas une
--      façon de s'habiller, et le site le déduit maintenant tout seul
--      de l'adresse de la boutique. Le garder en case à cocher, c'était
--      demander deux fois la même information et accepter que les deux
--      réponses finissent par se contredire.
--
-- Rien n'est perdu : une marque qui vend sur Vinted reste rangée parmi
-- les artistes et affiche son étiquette Vinted, simplement ce n'est
-- plus une donnée saisie à la main.

update public.brands
set categories = coalesce(
  (
    -- `with ordinality` sert à conserver l'ORDRE choisi à la main :
    -- la carte de l'annuaire n'affiche que les deux premières
    -- catégories, et un tri alphabétique changerait donc ce qu'on lit
    -- sur des dizaines de fiches sans que personne l'ait demandé.
    --
    -- Le regroupement, lui, évite un doublon chez une marque qui
    -- portait déjà « Alt » et « Alternative » : deux valeurs identiques
    -- dans le tableau, ce sont deux cases à cocher de même nom en
    -- administration, donc deux enfants React de même clé.
    select array_agg(valeur order by rang)
    from (
      select valeur, min(rang) as rang
      from unnest(array_replace(categories, 'Alt', 'Alternative'))
        with ordinality as t(valeur, rang)
      where valeur <> 'Vinted'
      group by valeur
    ) as propres
  ),
  -- Une marque qui n'avait QUE « Vinted » se retrouverait avec un
  -- tableau nul, et la colonne ne l'accepte pas.
  '{}'::text[]
)
where 'Alt' = any(categories)
   or 'Vinted' = any(categories);
