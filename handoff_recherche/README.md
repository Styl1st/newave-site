# La recherche — spécification

Deux chantiers pour `newave-site`. Chacun est autonome.

- **Chantier 1** — la barre de recherche des Pièces, option *recherche à
  aperçu* (`1c`, version téléphone `2a`).
- **Chantier 2** — le pop-up de la loupe, option *la barre se déploie*
  (`1e`, version téléphone `2b`).

La maquette est dans ce dossier (`Recherche NEWAVE.dc.html`) et s'ouvre
directement dans un navigateur. Elle est la référence visuelle ; ce
document est la référence de comportement. En cas de contradiction, ce
document gagne.

---

# Chantier 1 — La barre des Pièces

## 1.1 Le problème

`/pieces` ouvre sur un champ isolé dans un panneau de verre
(`PieceDirectory.tsx`, le `<div className="glass rise rise-1 mb-4 p-3.5
sm:p-4">` autour de `<input className="champ w-full pr-16">`). Deux
choses clochent.

D'abord le panneau : il ne contient qu'un champ et un `⌘ K`, et occupe
la largeur entière au-dessus de la grille. C'est un caisson pour un
objet.

Ensuite, et c'est le vrai sujet : **le champ ne filtre que la vitrine**.
`parRecherche` travaille sur les pièces déjà descendues avec la page —
dix par marque, soit 1 220 — alors que le catalogue en compte 26 507.
Taper « denim » donne 38 résultats et l'utilisateur en conclut que le
site a 38 pièces en denim. La page le sait déjà et s'en excuse dans son
état vide (« la vitrine : elle en montre dix par marque ») ; il faut le
dire **avant** l'état vide, pas après.

## 1.2 Le principe retenu

Le champ reste là où il est et garde son filtrage en direct. On lui
ajoute, **sous la ligne**, le panneau de suggestions de l'annuaire, avec
trois groupes :

| Groupe | Contenu | Geste |
|---|---|---|
| `POSER UN FILTRE` | rayons et critères qui correspondent | pose un filtre sur la grille, ne navigue pas |
| `MARQUES` | marques du catalogue | ouvre la fiche marque |
| `PIÈCES` | pièces du **catalogue entier**, en bande | ouvre la pièce ; « tout ouvrir dans la grille » en sortie |

Le panneau ne remplace pas le filtre : la grille derrière continue de se
filtrer à la frappe. Il ajoute ce que le filtre ne peut pas atteindre.

## 1.3 Ce qui existe déjà et qu'on réutilise

- `recherche/useRecherche.ts` — l'appel à `/api/recherche`, le délai de
  `180 ms`, le minimum de `2` caractères, le résultat surligné et
  l'ordre clavier critères → marques. **Ne pas le dupliquer.**
- `recherche/Suggestions.tsx` — le rendu des groupes et des lignes.
- `recherche/Jeton.tsx` (type `Critere`) — un critère se *pose*, une
  marque s'*ouvre* : c'est la seule différence entre deux lignes qui se
  ressemblent, et elle est déjà modélisée.
- `FeuilleRecherche.tsx` — la version plein écran, pour le point 1.6.

## 1.4 Le seul travail serveur

`/api/recherche` répond aujourd'hui marques + pièces pour la recherche
de l'annuaire. Vérifier qu'elle renvoie bien les pièces **au-delà de la
vitrine** ; si elle est bornée à l'échantillon, c'est la seule ligne de
code serveur du chantier. Sans ça, le panneau répète la grille et
n'apporte rien.

## 1.5 La ligne qui compte plus que le reste

Sous le champ, quand une recherche est en cours :

```
38 PIÈCES POUR « DENIM » · 4 MARQUES        Le catalogue en compte 312 — tout voir
```

C'est la trouvaille du chantier. À garder **quelle que soit l'option
retenue**, même si le panneau est reporté. Le « tout voir » mène à la
recherche du catalogue, pas à la grille filtrée.

Le nombre de gauche est celui de `resultats.length` déjà calculé ; celui
de droite vient de la réponse de `/api/recherche` (total, pas la page).

## 1.6 Au doigt — maquette `2a`

Le point de bascule est **640 px**. En dessous :

- Le champ garde sa forme de champ (`champ champ-loupe`), pas de ligne
  typographique : à 402 px, un texte de 26 px se coupe en deux.
- **Le panneau monte en feuille pleine et opaque**, pas en panneau
  flottant. Le clavier mange la moitié basse de l'écran : un panneau
  « sous le champ » n'aurait que deux lignes utiles. C'est le
  comportement de `FeuilleRecherche` — on le réemploie, on ne le
  redessine pas.
- **Les rayons passent en premier.** Au doigt, poser un filtre en un
  geste vaut mieux que taper dix lettres. Marques ensuite, pièces en
  bande horizontale qui défile.
- La rangée `compte / tri / filtres` se colle sous la barre du site et
  quitte la ligne du champ.
- Le rayon choisi devient une **pastille d'accent retirable**
  (`--accent-1` sur `--color-ink`), pas une ligne de texte.

## 1.7 Invariants

- Le `⌘ K` s'efface dès qu'on tape : c'est déjà le cas, ne pas le
  réintroduire dans le panneau.
- Un seul champ de recherche dans le DOM par page. Le commentaire de
  `PieceDirectory` sur les lecteurs d'écran (« doubleraient les champs »)
  vaut aussi pour le panneau : il ne doit pas contenir son propre
  `<input>`.
- L'état vide de la grille garde son texte actuel ; il reste vrai.

---

# Chantier 2 — Le pop-up de la loupe

## 2.1 Le problème

`Header.tsx` pointe la loupe sur `/marques?recherche=1`, et le
commentaire explique honnêtement le raisonnement : la recherche vit dans
l'annuaire, donc la loupe y emmène avec le curseur déjà dans le champ.
Le raisonnement tient, le geste non : on lit un post, on veut chercher
une marque, et on perd la page.

Au doigt, le même lien ouvre `FeuilleRecherche` en plein écran — là, ça
marche, parce qu'une feuille plein écran est un état, pas une
destination. C'est ce statut-là qu'il faut donner à la loupe sur
ordinateur.

## 2.2 Le principe retenu — `1e`

Rien ne s'ouvre ailleurs : **la pastille de la barre devient le champ**.

1. Les liens de navigation s'effacent (le logo reste).
2. Le champ prend leur largeur, dans la barre elle-même.
3. Le panneau de résultats pend **sous la barre**, même largeur, mêmes
   marges, même verre, même rayon.
4. La page reste visible derrière, sous un voile léger
   (`rgba(9,3,26,.34)`), **sans flou** : on doit reconnaître la page
   qu'on n'a pas quittée.

Fermeture : `Échap`, la croix, ou un clic sur le voile. Aucune
navigation, aucune entrée dans l'historique.

Le panneau est sur deux colonnes : marques + « dans le site » (posts) à
gauche, pièces en grille à droite, et la sortie « tout voir dans
l'annuaire » en bas à droite.

## 2.3 États

| État | Contenu du panneau |
|---|---|
| champ vide | `TU CHERCHAIS` (historique local, effaçable) + `EN CE MOMENT` (4 entrées) |
| < 2 caractères | inchangé — voir `MINIMUM` dans `useRecherche` |
| résultats | marques, dans le site, pièces |
| rien | une ligne, et le lien vers l'annuaire |

Jamais de carte creuse.

## 2.4 Clavier

`↑ ↓` naviguent, `↵` ouvre, `Échap` ferme. `useRecherche` fournit déjà
`surligne` et l'ordre des lignes ; ne pas réimplémenter la navigation.

Garder `⌘ K` comme raccourci d'ouverture depuis n'importe quelle page —
c'est le même pop-up.

## 2.5 Au doigt — maquette `2b`

Toujours **640 px** comme seuil, et dans les deux sens : une fenêtre
qu'on agrandit ou une tablette qu'on tourne doit refermer proprement au
lieu de laisser un panneau de téléphone en travers de mille pixels.

En dessous :

- Le logo se réduit à son sigle, la loupe et le menu s'effacent, la
  pastille devient le champ — même transformation qu'en grand, à
  l'échelle du pouce.
- Le panneau pend sous la barre avec **les mêmes marges qu'elle**
  (16 px), s'arrête au-dessus du clavier et défile à l'intérieur.
- Il est court par construction : deux ou trois marques, une bande de
  pièces, un post, la sortie vers l'annuaire.
- La page reste derrière sous le même voile léger.

`FeuilleRecherche` reste la solution de repli acceptable si le panneau
suspendu pose problème sur un vieux Safari mobile : le geste est déjà
bon là-bas.

## 2.6 Invariants du `Header`

- Le lien `/marques?recherche=1` disparaît du bouton mais **reste
  valide** : c'est une URL partageable et la feuille mobile s'en sert.
  Le bouton devient un `<button aria-expanded>` et non un `<Link>`.
- `aria-label="Chercher une marque"` est conservé.
- Le commentaire du `Header` sur la loupe qui s'écrasait en ovale
  (`shrink-0`) reste vrai : la pastille ne doit pas se déformer pendant
  la transition vers le champ.
- Les glyphes viennent de `Icons.tsx` (`IconLoupe`), pas de tracés
  refaits à la main. La maquette mobile a été réalignée là-dessus après
  coup — ne pas repartir du SVG de la maquette si un doute subsiste,
  c'est `Icons.tsx` qui fait foi.

---

# Repères visuels communs

Tout est déjà dans `globals.css`, rien à inventer :

| Rôle | Valeur |
|---|---|
| encre | `--color-ink: #170a33` |
| accent 1 | `--accent-1: 232, 111, 216` |
| accent 2 | `--accent-2: 90, 114, 224` |
| accent 3 | `--accent-3: 180, 122, 234` |
| champ | classe `champ` / `champ-petit` / `champ-loupe` |
| verre | classe `glass`, `rise rise-1` |
| surlignage d'un résultat | `box-shadow: inset 0 -2px 0` en accent 1 |

**Fond du panneau de résultats : opaque** (`#170a33`), jamais dépoli.
Une liste de résultats posée sur une grille de pièces qui transparaît ne
se lit pas. Le voile, lui, peut être translucide — ce sont deux
surfaces différentes.

Au doigt : cibles **44 px** minimum, marges **16 px**, libellés et
eyebrows **11 px** minimum (`font:700 11px/1.85 Archivo`, comme le reste
du mobile), méta et badges 10 px minimum.

---

# Contenu du dossier

| Fichier | Rôle |
|---|---|
| `BRIEF-COWORK.md` | le contexte court, à lire en premier |
| `README.md` | ce document |
| `Recherche NEWAVE.dc.html` | la maquette — s'ouvre dans un navigateur |
| `support.js`, `ios-frame.jsx`, `assets/` | dépendances de la maquette, à garder à côté |

La maquette s'ouvre sur le **tour 2** (les deux téléphones, `2a` et
`2b`). Le **tour 1**, plus bas, contient les six propositions d'origine
`1a`–`1f` : seules `1c` et `1e` sont retenues, les quatre autres restent
pour montrer ce qui a été écarté et pourquoi.
