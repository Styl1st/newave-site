# Spec — la phrase réglable de `/populaires`

Référence visuelle : `Coups de coeur NEWAVE.dc.html`, bloc **1b**
(« Le podium éditorial »). Les données de la maquette sont fausses
(12 marques, 8 pièces) ; la mise en page, les mots et les états, non.

---

## 1. La phrase

    Les [marques ▾] classées par [cœurs ▾] sur [7 jours ▾]

- Rendu : titre du bloc « LE CLASSEMENT », `font-extrabold`, ~34 px
  desktop, `letter-spacing: -0.032em`, repli en plusieurs lignes sur
  petit écran (la phrase est un `flex-wrap` avec `gap: 2px 11px`).
- Les trois mots réglables sont soulignés d'un trait rose 2 px
  (`#e86fd8` dans la maquette = accent existant du site) avec un chevron.
- Au clic, un menu s'ouvre sous le mot : fond opaque, bord clair,
  rayon 14 px, une ligne par option ; l'option active est un pavé blanc
  à texte sombre. À droite de chaque option, une glose courte en petites
  capitales (« volume », « part récente », « min. 3 avis »).
- Le menu se ferme au clic dehors, au choix d'une option, et à `Échap`
  (à ajouter côté site : la maquette ne gère que le clic dehors).
- **Accessibilité** : `<button aria-expanded>` pour le déclencheur,
  `role="menu"` / `role="menuitem"` ou une simple liste de liens, focus
  visible, navigation clavier haut/bas. À faire proprement côté site.

### Les trois menus

**1. Quoi** — `marques` · `pièces`. Glose : le nombre total classé.

**2. Par quoi (la mesure)**

| Option | Mesure | Disponible |
|---|---|---|
| cœurs | volume sur la fenêtre choisie | marques + pièces |
| élan | part des cœurs reçue sur la fenêtre, en % du total de l'entrée | marques + pièces |
| note | moyenne des avis, minimum d'avis requis | marques + pièces |

**3. Sur quand (la fenêtre)** — `7 jours` · `30 jours` ·
`depuis toujours`. Ce sont exactement les `PeriodeCoeurs` existantes
(`semaine` | `mois` | `toujours`) : ne pas en inventer une quatrième.

### Réglages impossibles : on retombe, on ne grise pas

- La clause « sur … » **disparaît** quand la mesure ne dépend pas du
  temps (`note`). Une phrase qui annonce une fenêtre sans l'utiliser est
  un mensonge d'interface.
- `élan` retire `depuis toujours` du menu des fenêtres (100 % par
  construction) ; si la fenêtre valait `toujours`, elle repasse à
  `7 jours`.
- Une option indisponible pour le « quoi » choisi n'est pas grisée : elle
  n'est pas dans le menu, et si elle était active on retombe sur `cœurs`.
  (Même règle que le sélecteur de période, qui n'existe pas du tout sous
  le seuil au lieu d'être grisé.)

---

## 2. Le podium

Inchangé dans sa mécanique (`ClassementMarques`, `MARCHES = 3`) ;
changé dans son habillage :

- **Trois cartes** en grille `repeat(3, minmax(0,1fr))`, `gap: 16px`,
  rayon 16 px. En tête de carte, une zone visuelle de 150 px (le logo /
  la photo de la fiche ; dégradé de repli comme dans la maquette) avec le
  rang en très gros (46 px, `line-height: .8`) et, en haut à droite, la
  pastille de mouvement (`▲ 2` / `▼ 3` / `— 0` / `NEW`).
- Sous le visuel : le rayon en petites capitales, le nom (19 px, gras),
  **la mesure lue** (chiffre 22 px + son unité en capitales : « cœurs · 7 j »,
  « de ses cœurs sur 7 j », « sur 5 »), puis un pied de carte séparé par
  un filet : « 4,6 ★ · 38 avis » à gauche, le bouton cœur à droite.
- **La suite en lignes fines** : rang, mouvement, nom + rayon, barre de
  proportion 120 × 4 px (part de la mesure par rapport au premier), le
  chiffre aligné à droite en `tabular-nums`, le bouton cœur.
- Le bouton cœur est celui du site (`LigneMarque` / `LignePiece`) :
  réversible, une seule requête d'état pour toute la page — règle
  existante de `getMyFavorites` / `getMyLikes`, à ne pas contourner.
- La pastille de mouvement n'a de sens que pour `cœurs` et `élan` (les
  mesures qui suivent le rang). Pour `note`, elle devient un point
  discret : pas de faux mouvement.
- « Voir les N suivantes » disparaît quand il ne reste rien (pas de
  bouton qui ne fait rien).

## 3. La colonne de droite

Le rail existant (`RailDesCoeurs`) garde ses trois blocs et sa
mécanique ; la maquette précise les mots :

1. **Les cœurs en chiffres** : le total de la fenêtre affichée, sa
   variation (`▲ 14 %`) quand elle est calculable, l'unité en clair
   (« cœurs donnés · 7 jours ») et l'histogramme 7 barres. Si la
   variation n'est pas calculable, on n'affiche pas de pourcentage.
2. **Ce qui bouge le plus** : les trois plus gros écarts de rang de la
   fenêtre, formulés en places (« ▲ 2 places »), pas en pourcentages
   inventés.
3. **Premier cœur à prendre** : bloc existant (`PremierCoeur`),
   inchangé, avec le compte réel de fiches sans cœur.

---

## 4. Les adresses

Trois paramètres indépendants, tous facultatifs, tous en clair :

    /populaires?quoi=marques&mesure=coeurs&periode=semaine

Défauts : `quoi=pieces`, `mesure=coeurs`, `periode=semaine` — c'est-à-dire
l'onglet « du moment » d'aujourd'hui. Les valeurs se valident **en toutes
lettres** comme `laPeriode()` le fait déjà : jamais de `as Mesure` sur une
chaîne venue de l'adresse.

### Correspondance à conserver (redirections 308)

| Ancienne adresse | Nouvelle |
|---|---|
| `?vue=semaine` (ou rien) | `?quoi=pieces&mesure=coeurs&periode=semaine` |
| `?vue=toujours` | `?quoi=pieces&mesure=coeurs&periode=toujours` |
| `?vue=marques` | `?quoi=marques&mesure=coeurs&periode=toujours` |
| `?vue=notes-pieces` | `?quoi=pieces&mesure=note` |
| `?vue=notes-marques` | `?quoi=marques&mesure=note` |
| `?vue=marques&periode=semaine|mois` | `?quoi=marques&mesure=coeurs&periode=…` |

## 5. Fichiers concernés

| Fichier | Ce qui s'y passe |
|---|---|
| `src/app/populaires/page.tsx` | le cœur du chantier : `ONGLETS` s'en va, `quoi`/`mesure`/`periode` le remplacent, les requêtes se choisissent sur la mesure, `Contenu` se construit comme aujourd'hui |
| `src/components/coeurs/PhraseDuClassement.tsx` | **nouveau** : la phrase et ses trois menus (client, mais des liens) |
| `src/components/SelecteurClassement.tsx` | plus utilisé ici — vérifier ses autres usages avant suppression |
| `src/components/coeurs/SelecteurPeriode.tsx` | absorbé par le troisième menu ; sa règle de seuil, elle, survit (voir invariants) |
| `src/components/ClassementMarques.tsx` | habillage des trois marches (cartes visuel + rang géant) |
| `src/components/coeurs/ClassementPieces.tsx` | même habillage côté pièces |
| `src/components/LigneMarque.tsx`, `coeurs/LignePiece.tsx` | barre de proportion + colonne de mesure ; rien d'autre |
| `src/components/coeurs/classement.ts` | le vocabulaire : `Mesure` s'ouvre à `elan`, les mots des unités vivent ici |
| `src/components/coeurs/RailDesCoeurs.tsx` | les mots du premier bloc suivent la mesure choisie |
| `src/components/coeurs/seuils.ts` | rien à changer, tout à respecter |
| `src/lib/favorites.ts`, `src/lib/likes.ts`, `src/lib/avis.ts` | lectures existantes ; `élan` demande une seconde lecture (voir risques) |

## 6. Invariants à ne pas casser

1. **Jamais de score composite** (commentaire en tête de
   `populaires/page.tsx`). Une mesure, un ordre.
2. **Le compteur ne compte que ce qui est à l'écran.** Idem pour la ligne
   de rayons : elle additionne les entrées affichées et ne redemande rien
   en base.
3. **La fenêtre de temps n'existe qu'au-dessus de `SEUIL_PODIUM` cœurs**
   sur l'annuaire. Sous le seuil, le troisième menu **n'apparaît pas** et
   la fenêtre vaut `toujours`. Découper trois miettes en trois fenêtres
   fabrique de faux classements.
4. **`avisMinimum()` reste la porte d'entrée de la mesure `note`**, et le
   minimum s'affiche en clair.
5. **Deux lectures, la première décide de la seconde** : on ne demande le
   classement borné dans le temps que si le seuil est atteint ET qu'une
   fenêtre a été choisie.
6. **Le hasard se tire sur le serveur** (`melanger` dans la page, pas dans
   le composant) — sinon erreur d'hydratation.
7. `force-dynamic` et « recompté à chaque visite » : ne pas annoncer une
   heure de calcul qui n'existe pas.
8. `minmax(0,1fr)` sur la colonne de contenu : le bug de débordement
   horizontal est déjà arrivé trois fois sur ce site.

## 7. Risques et coût

- **`élan` coûte une lecture de plus** : il faut le compte de la fenêtre
  ET le total de l'entrée. Si ça pèse, on sort `élan` de la v1 — la
  phrase marche très bien avec deux options de mesure.
- **La pastille de mouvement a besoin du rang précédent.** Aujourd'hui il
  n'est stocké nulle part. Deux issues : le calculer sur la fenêtre
  précédente (une lecture de plus), ou ne pas afficher de mouvement en
  v1. **Ne rien inventer** : pas de `▲` décoratif.
- Suppression de `SelecteurClassement` : vérifier les autres pages.

## 8. À trancher avec moi

1. **Marques : « cœurs » et « abonnés » sont-ils deux mesures ou une ?**
   Dans la maquette, une marque a des cœurs *et* des abonnés. En base, la
   mise de côté d'une marque est un seul compte (`favoris`). Soit on
   n'offre qu'une mesure pour les marques et on choisit le mot juste
   (« mises de côté » plutôt que « cœurs »), soit on ajoute vraiment un
   second geste — et ça, c'est un autre chantier. **Ma préférence : une
   seule mesure, le mot « cœurs », comme dans la maquette.**
2. **Mouvement au classement en v1, ou pas ?** Voir § 7. Dis-moi le coût
   des deux options avant de choisir.
