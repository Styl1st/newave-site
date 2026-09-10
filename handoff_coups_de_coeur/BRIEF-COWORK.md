# Brief — la phrase réglable des Coups de cœur

Un seul chantier sur `newave-site`, validé en maquette : la page
`/populaires`.

**Ce qui change.** Les cinq onglets (`Du moment`, `Tout temps`,
`Plus suivies`, `Pièces notées`, `Marques notées`) plus la seconde
ligne de période disparaissent. À leur place, une phrase que l'on règle :

> Les **marques**▾ classées par **cœurs**▾ sur **7 jours**▾

Trois mots soulignés, trois menus. Le reste de la page ne bouge pas de
place : la ligne de rayons, le podium à trois marches, les lignes fines,
la colonne de droite et le bloc « premier cœur à prendre » restent là où
ils sont. C'est l'habillage du podium qui se rapproche de la maquette
(trois grandes cartes avec visuel) et la barre d'onglets qui s'en va.

**Pourquoi.** Une mesure n'est pas un onglet. Aujourd'hui « plus suivies »
et « marques notées » sont deux onglets alors que c'est le même
classement lu avec deux règles ; et « du moment » / « tout temps » sont
la même mesure sur deux fenêtres. La phrase sépare enfin les trois
questions : **quoi** (marques ou pièces), **par quoi** (la mesure),
**sur quand** (la fenêtre).

## Ce qu'on attend de toi

1. **Lis `README.md` en entier avant de toucher au code.** Il contient la
   spec, les fichiers concernés, la table de correspondance
   ancien onglet → nouvelle adresse, et les invariants à ne pas casser.
2. **Ouvre la maquette** (`Coups de coeur NEWAVE.dc.html`) dans un
   navigateur : page autonome, rien à installer. Regarde **1b**, c'est la
   version retenue. Clique les trois mots soulignés de la phrase, et
   clique aussi les cœurs des cartes et des lignes (ils se donnent et se
   reprennent). 1a est l'ancienne piste « tableau triable » et 1c une
   maquette fixe : ni l'une ni l'autre n'est à construire.
3. **Reviens vers moi avec ton plan avant de coder** : dans quel ordre tu
   prends les fichiers, ce que tu supprimes, et surtout ta réponse aux
   deux questions ouvertes du README (§ « À trancher avec moi »).
4. Une branche pour tout le chantier. Le serveur d'abord (adresses +
   requêtes), l'habillage du podium ensuite : la page doit rester
   utilisable entre les deux.

## Ce qu'il ne faut pas faire

- **Ne pas fabriquer de score composite.** Le commentaire en tête de
  `populaires/page.tsx` est la règle du site : cœur, favori et avis ne
  s'additionnent jamais. La phrase choisit UNE mesure et ordonne dessus.
  Le type `Contenu` n'a de place que pour une mesure par ligne — garde-le
  ainsi, c'est ce qui rend le mélange impossible à écrire par distraction.
- **Ne pas passer la page en état client.** Les trois menus restent des
  liens (`next/link`) vers des adresses partageables, comme les onglets
  aujourd'hui. Pas de `useState` qui remplacerait `?vue=`.
- **Ne pas réécrire `ClassementMarques` / `ClassementPieces` de zéro.**
  Le podium à trois marches, le pied de classement et les lignes existent
  déjà et sont partagés. On change leur habillage, pas leur mécanique.
- **Ne pas casser les adresses existantes.** `Header.tsx` et
  `/favoris` pointent sur `/populaires`, et les anciens `?vue=` sont
  peut-être en signet ou en lien externe : ils doivent continuer à
  répondre (voir la table du README).
- **Ne pas toucher au mobile dans ce chantier** au-delà du repli naturel
  de la phrase sur deux lignes. La feuille de recherche, le rail et les
  écrans téléphone restent tels quels.
- Ne pas supprimer `SelecteurClassement.tsx` sans avoir vérifié ses
  autres usages (`grep -r SelecteurClassement src/`).
