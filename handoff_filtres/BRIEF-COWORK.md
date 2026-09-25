# Brief — des filtres qui tiennent à l'écran

Un chantier sur `newave-site`, validé en maquette. Il touche **deux
colonnes de filtres** : celle de l'annuaire (`/marques`) et celle de la
vitrine (`/pieces`).

Le problème n'était pas le style des tags : c'était la quantité. On
affichait toutes les valeurs de tous les critères en même temps — plus
de cent pastilles sur l'annuaire. On coupe, on range :

- **`/marques`** : on ne garde **que les catégories (styles)**. Le
  vestiaire, « Ce qu'elle vend » et la gamme de prix quittent le panneau.
  Les styles tiennent en **une seule ligne** : les 10 plus fréquents,
  puis « + N autres ». Pas de groupes, pas de colonnes.
- **`/pieces`** : **rayon et type ne font plus qu'un menu**. Chaque
  rayon se déroule sur ses types (Hauts → T-shirts, Chemises, Pulls…).
  Taille et prix passent en sections repliables. Pas de vestiaire.

## Ce qu'on attend de toi

1. **Lis `README.md` en entier avant de toucher au code.** Il contient la
   spec, ce qui part, ce qui reste, et les invariants à ne pas casser.
2. **Ouvre la maquette** (`Filtres NEWAVE.dc.html`) dans un navigateur :
   page autonome, rien à installer. Les écrans retenus sont **`2a`**
   (marques) et **`2b`** (pièces), en haut. Tout est cliquable. Le
   « Tour 1 » du dessous (`1a`, `1b`) montre les pistes écartées. Il est
   là pour le contexte, ne l'implémente pas.
3. **Trois points demandent ton avis avant de coder** (détail dans le
   README, §6) :
   - **La taille** n'existe pas encore comme filtre de la vitrine. Les
     données sont là (`products.sizes`), mais `/api/pieces` ne sait pas
     filtrer dessus. Dis-moi ce que ça coûte.
   - **Le prix** : la maquette montre des tranches, alors que le code a
     un double curseur (`CurseurPrix`). Je propose de **garder le
     curseur** et de le ranger dans la section repliable.
   - **Les anciens liens** `?f=vestiaire:…`, `vend:…`, `prix:…` doivent
     continuer à ouvrir la page sans erreur. Il suffit d'ignorer ces
     jetons.
4. **Reviens avec ton plan avant de coder** : l'ordre des fichiers, et
   les régressions que tu crains.

## Ce qu'il ne faut pas faire

- **Ne pas supprimer les données.** `audience`, `price_tier`, `vend`
  restent en base et dans les fiches marque. On retire des **filtres**,
  pas des champs.
- **Ne pas toucher à `BRAND_CATEGORIES`.** Bijoux, Accessoires et
  Chaussures restent des catégories de marque ; ils sont seulement
  masqués dans le filtre de l'annuaire.
- **Ne pas écrire un nouveau composant de ligne.** `LigneRayon` sait
  déjà faire rayon, type (`sous`) et « +2 » (`indice`). On change le
  comportement, pas le dessin.
- **Ne pas casser le ET des catégories**, ni le comptage « sans
  soi-même » : une pastille ne s'affiche que si elle laisse au moins une
  marque debout.
