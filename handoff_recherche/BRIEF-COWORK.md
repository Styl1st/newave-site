# Brief — la recherche, aux deux endroits où elle vit

Deux chantiers indépendants sur `newave-site`, validés en maquette.

**Chantier 1 — la barre de recherche des Pièces.** Aujourd'hui `/pieces`
ouvre sur un champ seul au milieu d'un grand panneau de verre
(`PieceDirectory.tsx`, le bloc `glass rise rise-1`). Il filtre en silence
les 1 220 pièces de la vitrine et ne dit jamais qu'il en existe 26 507 au
catalogue : une recherche qui ne donne rien laisse donc croire que le
catalogue est vide. On lui ajoute un **panneau de suggestions** —
rayons, marques, pièces du catalogue entier — celui qui existe déjà pour
l'annuaire. Option retenue : `1c`.

**Chantier 2 — la loupe de la barre du haut.** Elle mène à
`/marques?recherche=1` : on quitte la page qu'on lisait pour chercher.
Elle doit **ouvrir un pop-up et rien d'autre**, sans navigation. Option
retenue : `1e` — la pastille de la barre devient le champ et le panneau
pend sous la barre, la page reste derrière.

Chaque chantier a sa version téléphone, validée elle aussi : `2a` pour le
premier, `2b` pour le second.

## Ce qu'on attend de toi

1. **Lis `README.md` en entier avant de toucher au code.** Il contient
   les deux specs, les fichiers concernés, le point de bascule mobile et
   les invariants à ne pas casser.
2. **Ouvre la maquette** (`Recherche NEWAVE.dc.html`) dans un
   navigateur. C'est une page autonome, il n'y a rien à installer. Elle
   s'ouvre sur le tour 2 (les téléphones) ; le tour 1, plus bas, tient
   les six propositions d'origine — seules `1c` et `1e` sont retenues,
   les autres restent pour le contexte. **Clique la loupe** dans les
   maquettes `1d`, `1e`, `1f` : les pop-ups s'ouvrent et se ferment.
3. **Reviens vers moi avec ton plan, chantier par chantier, avant de
   coder.** Dis dans quel ordre tu prends les fichiers, ce que tu
   comptes réutiliser tel quel, et où tu vois un risque de régression.
4. Les deux chantiers peuvent partir en deux branches séparées. Si tu
   n'en fais qu'un, prends le **chantier 2** : il ne touche qu'au
   `Header` et à un composant neuf, sans rien changer aux pages.

## Ce qu'il ne faut pas faire

- Ne pas écrire une seconde recherche. `useRecherche.ts`,
  `Suggestions.tsx` et `/api/recherche` existent et servent déjà
  l'annuaire et la feuille mobile : le fichier dit lui-même pourquoi il
  vit à part. Deux copies finiraient par diverger.
- Ne pas supprimer `FeuilleRecherche.tsx`. Le chantier 2 s'y **replie**
  sous le point de bascule ; c'est elle qui rend le pop-up possible au
  doigt sans rien réinventer.
- Ne pas remplacer le filtrage en direct de la grille par le panneau. Le
  panneau **ajoute** ce que le filtre ne peut pas atteindre (le
  catalogue entier, les marques, les rayons) ; la grille continue de se
  filtrer à la frappe comme aujourd'hui.
- Ne pas toucher au tri, à la densité, ni au bouton de filtres flottant
  de `/pieces`. Ils ont été déplacés exprès et ne font pas partie de ces
  deux chantiers.
