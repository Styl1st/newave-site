# Handoff : refonte graphique NEWAVE SPHERE

## Overview

Refonte de l'interface publique et du compte de **NEWAVE SPHERE** (média + annuaire de
marques indépendantes — Next.js 15 / Supabase / Vercel). L'identité existante est
**conservée** : logo, dégradé de fond animé, blobs chromés, verre dépoli, liseré chromé,
typographie Archivo. Ce qui change, c'est la **structure** : l'ancien site empilait des
blocs réguliers en colonne, ce qui devenait illisible à l'échelle (136 marques, 1 284
pièces, 78 posts) et sans hiérarchie propre.

Les cinq principes appliqués partout :

1. **Recherche ⌘K permanente** en haut de chaque page de listing, avec suggestions
   groupées (Marques / Pièces) dès la 2ᵉ lettre.
2. **Ligne de filtres à compteurs** — jamais un panneau à déplier ; chaque pastille
   porte son nombre de résultats.
3. **Aperçu dans la ligne** — sur l'annuaire, 4 vignettes de pièces sont posées dans la
   ligne de la marque : on voit ce qu'elle fait sans ouvrir sa fiche.
4. **Index A→Z** avec saut direct et lettres désactivées quand vides.
5. **Réaction au curseur** — inclinaison 3D légère des cartes (voir « Interactions »).

## About the Design Files

Les fichiers de ce dossier sont des **références de design écrites en HTML** : des
prototypes qui montrent l'apparence et le comportement visés, **pas du code de
production à copier**. Le travail consiste à **recréer ces écrans dans le codebase
existant** (`newave-site/`, Next.js 15 App Router + Tailwind v4 + les classes maison de
`src/app/globals.css`), en réutilisant ses patterns établis :

- les classes existantes `.glass`, `.card-light`, `.champ`, `.champ-petit`, `.badge`,
  `.eyebrow`, `.barre`, `.pied-carte`, `.rise` / `.rise-1..3`, `.case`, `.skeleton` ;
- les variables CSS de thème `--bg-1..6`, `--accent-1..3`, `--voile`, `--vit`, `--amp`,
  `--color-ink`, `--pad` ;
- les composants existants `BrandCard`, `ProductCard`, `Grille`, `BrandDirectory`,
  `PieceDirectory`, `PostMosaic`, `FavoriteButton`, `PastilleNote`, `Icons`,
  `AccountForms`, `ThemePicker`, `admin/fields`, `admin/SubmitBar`.

⚠️ **Les couleurs sont thémables.** Le prototype HTML écrit les hex du thème NEWAVE en
dur (`#33217f`, `#4e5bc0`, …) parce qu'il tourne hors du site. Dans le codebase, ces
valeurs **doivent** passer par `var(--bg-N)` / `rgba(var(--accent-N), α)` /
`rgba(var(--voile), α)`, sinon le sélecteur d'ambiances (Nuit, Braise, Forêt, Graphite,
ambiances perso) et le mode clair cessent de fonctionner. Même remarque pour les durées
d'animation, qui doivent rester multipliées par `--vit` et `--amp`.

## Fidelity

**Haute fidélité (hifi)** pour la mise en page, la hiérarchie typographique, les
espacements et les états. Couleurs, tailles de police, rayons et ombres sont exacts et
donnés ci-dessous.

**Deux exceptions basse fidélité, à remplacer :**

- **Toutes les images sont des placeholders** — des `repeating-linear-gradient` rayés
  violets portant leur ratio en légende (« visuel 4:5 », « photo pièce », « logo »).
  Utiliser les vrais médias via `premiereImage()` / `src/lib/medias.ts`.
- **Les données sont des données de démonstration** enrichies : les 7 marques de
  `src/lib/demo-data.ts` (Engineered By Aryes, Pollen Fabrics, Atelier Sable, Rive Nord,
  Maison Kaolin, Studio Tempo, Ourse) plus des noms inventés pour peupler l'index A→Z
  (Aube Studio, Argile, Basalte, Bruit Blanc, Studio Polaire, Calcaire). Les compteurs
  (136 marques, 1 284 pièces, 78 posts, 3 412 cœurs) sont des ordres de grandeur, pas
  des valeurs à coder en dur.

## Screens / Views

Les écrans retenus, dans l'ordre du parcours. Chaque écran est identifié par son badge
dans les fichiers de design (`2a`, `3b`, …) — cliquable via `#2a`, `#3b`, etc.

---

### 1. Annuaire des marques — badge `2a`

**Fichier :** `Annuaire NEWAVE.dc.html` · **Route :** `/marques` ·
**Remplace :** `BrandDirectory.tsx` + `BrandGrid.tsx`

**Purpose.** Trouver une marque parmi 136, ou découvrir en fouillant. C'est LE problème
que la page actuelle ne résout pas : une grille régulière de 3 colonnes sans recherche
persistante devient inutilisable au-delà de ~30 entrées.

**Layout.** Colonne unique, padding `14px 28px 44px`. De haut en bas :

1. **Barre de nav** en pilule de verre (voir « Composants partagés »).
2. **En-tête** — œil-de-bœuf « L'ANNUAIRE », h1 « Les marques » (Archivo 800, 38px,
   `letter-spacing:-.03em`), compteur « 136 MARQUES · 21 ARTISTES » aligné à droite.
   `margin:40px 0 24px`, `display:flex; align-items:flex-end; justify-content:space-between`.
3. **Bloc de recherche** (`.glass`, `border-radius:20px`, `padding:14px 16px`,
   `z-index:20`) contenant :
   - champ de saisie `flex:1` en état **focus** : `border:1px solid rgba(232,111,216,.9)`
     + `box-shadow:0 0 0 3px rgba(232,111,216,.3)` — soit `rgba(var(--accent-1), …)` ;
     texte saisi « pol », caret 1.5×16px, raccourci « ⌘ K » à droite en 800/10.5px ;
   - bouton **Filtres** à droite (entonnoir + libellé, bordure `rgba(255,255,255,.4)`) ;
   - **panneau de suggestions** séparé par `border-top:1px solid rgba(255,255,255,.16)`,
     en deux groupes : « MARQUES · 2 RÉSULTATS » (lignes de 34px de logo + nom avec le
     préfixe tapé surligné en `<mark>` `background:rgba(232,111,216,.45)` + métadonnées
     + « ENTRÉE ↵ » sur la ligne active, fond `rgba(255,255,255,.14)`,
     `border-radius:12px`), puis « PIÈCES · 31 RÉSULTATS » (4 vignettes de 56px + tuile
     « +27 »).
4. **Ligne de filtres collante** — pilule `border-radius:999px`,
   `background:rgba(8,2,30,.44)`, `backdrop-filter:blur(20px)`,
   `border:1px solid rgba(255,255,255,.2)`, `padding:10px 12px`, `overflow:hidden`.
   Pastilles : active = `background:#fff; color:#170a33; font:800 11px` ; inactive =
   `background:rgba(255,255,255,.12); color:rgba(255,255,255,.84); font:700 11px` ;
   toutes en `letter-spacing:.07em; text-transform:uppercase; padding:8px 14px`.
   Ordre : Tout 136 · Marques 115 · Artistes 21 · séparateur 1×18px · Streetwear 34 ·
   Denim 22 · Bijoux 19 · Maille 17. À droite, **bascule de densité** à 3 états
   (Confort / Grille / Liste) dans un rail `border-radius:999px; padding:4px`, l'état
   actif en blanc — icônes SVG 4 carrés / 9 carrés / 3 barres.
5. **Index A→Z** — `display:flex; flex-wrap:wrap; gap:2px`, préfixe « ALLER À ». Lettre
   active : `background:#fff; color:#170a33; font:900 12px`, `min-width:26px; height:26px`,
   `border-radius:8px`. Lettre disponible : blanc 800. **Lettre vide :
   `color:rgba(255,255,255,.24)`, non cliquable.** Suivi de « A — 9 marques ».
6. **Mode Liste, groupé par lettre.** Titre de groupe : la lettre seule en Archivo 800
   26px `color:rgba(255,255,255,.42)`. Puis les lignes, `gap:10px`.

**Composant « ligne de marque » (le cœur de l'écran).**
`display:flex; align-items:center; gap:18px; padding:14px 16px; border-radius:18px`,
fond `.card-light` (`linear-gradient(160deg,#fff 0%,#f4efff 52%,#e6dcfb 100%)`),
`box-shadow:0 8px 22px rgba(52,18,110,.24), inset 0 1px 0 #fff`. De gauche à droite :

| # | Élément | Spécification |
|---|---------|---------------|
| 1 | Logo | `flex:0 0 auto; 62×62px; border-radius:14px` |
| 2 | Identité | `flex:0 0 240px` — nom en Archivo 800/16px `-.02em` `#170a33` ; badge « À LA UNE » optionnel (`linear-gradient(120deg,#7b52e8,#c05fd8)`, 900/9px, `padding:4px 9px 5px`) ; sous-ligne ville + catégories en 600/11px `letter-spacing:.05em` majuscules `#6a5a92` |
| 3 | **Aperçu des pièces** | `flex:1` — 4 vignettes `aspect-ratio:1; border-radius:10px; gap:6px`, la 4ᵉ portant « +8 » en 800/11px `#6a5a92`. Marque sans pièces : 3ᵉ case `rgba(23,10,51,.06)` avec « pas encore » sur deux lignes, 4ᵉ vide `rgba(23,10,51,.04)` |
| 4 | Action | `flex:0 0 auto` — « APERÇU » + icône œil, `background:#170a33; color:#fff; font:900 10.5px; padding:9px 14px; border-radius:999px`. Marque sans pièces : « VOIR LA FICHE » sur `rgba(23,10,51,.1)` texte `#170a33` |
| 5 | Favori | 36×36px `border-radius:999px` — inactif `background:rgba(20,8,50,.1)`, cœur en `stroke` ; actif `background:#170a33`, cœur en `fill` blanc |

7. **Pied de pagination** — pilule identique à la ligne de filtres :
   « 24 SUR 136 AFFICHÉES » / « Charger 24 marques de plus » (800/13px blanc) /
   « ou tape ⌘K pour chercher directement » (600/11.5px, opacité .5).
8. **Pied de page** du site.

---

### 2. Accueil — badge `3b`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/` · **Remplace :** `app/page.tsx`

**Purpose.** Dire ce qu'est le site en trois secondes, puis donner trois portes
d'entrée : chercher, suivre la marque mise en avant, découvrir au hasard.

**Layout.** Deux temps.

**A — Manifeste, plein écran, centré** (`padding:64px 0 44px`, `text-align:center`) :

- logo `assets/logo-white.webp`, `width:320px; max-width:70%`,
  `filter:drop-shadow(0 6px 20px rgba(60,25,120,.5))` ;
- baseline « Média de marques / & / d'artistes indépendants » sur 3 lignes,
  Archivo 700/13px, `letter-spacing:.24em`, majuscules,
  `text-shadow:0 1px 3px rgba(40,12,92,.55), 0 2px 18px rgba(40,12,92,.5)` ;
- paragraphe 500/18px `line-height:1.6`, `max-width:620px`, blanc à 92 % ;
- **champ de recherche** `width:min(640px,100%)`, `border-radius:15px`,
  `padding:15px 18px`, `.champ` + `box-shadow:… , 0 12px 34px -18px rgba(20,6,50,.9)`,
  avec « ⌘ K » à droite ;
- **4 puces de raccourci** sous le champ (Streetwear 34 · Denim 22 · Bijoux 19 ·
  Moins de 60 €), `padding:7px 14px`, 700/11px majuscules ;
- **2 boutons** `gap:12px` : « Explorer les 136 marques » en `.card-light`
  (`padding:15px 26px; border-radius:20px`) et « Voir les posts » en outline
  (`border:1px solid rgba(255,255,255,.4); background:rgba(255,255,255,.08)`) ;
- **invite de défilement** : « LA SUITE » + chevron animé `animation:invite 2.1s ease-in-out infinite`
  (translateY 0→7px, opacity .5→1).

**B — Corps à deux colonnes** `grid-template-columns:minmax(0,1fr) 330px; gap:28px; align-items:start`.

*Colonne principale :*

1. En-tête de section « L'ANNUAIRE » / h2 « La marque de la semaine » (800/26px) +
   lien « Toutes les marques » à droite (700/13px, soulignement 1px à 40 %).
2. **Carte de la marque de la semaine** — `.card-light`, `border-radius:20px`. Bandeau
   `aspect-ratio:16/9` avec : badge « À LA UNE » en haut à gauche, logo 74×74px
   `border-radius:18px` fond blanc en bas à gauche (`box-shadow:0 8px 22px rgba(52,18,110,.28)`),
   bouton « VOIR LA BOUTIQUE » + flèche sortante en bas à droite
   (`background:rgba(14,5,38,.72)`). Pied de carte
   (`background-image:linear-gradient(180deg,rgba(124,92,200,.19) 0%,rgba(124,92,200,.09) 45%,rgba(124,92,200,.03) 100%)`)
   : nom 800/24px `-.03em`, méta 600/11.5px majuscules `#6a5a92`, description 500/14.5px
   `#4a3d6e`, puis bouton « APERÇU » et bouton favori 40×40px.
3. **Section « Au hasard / Un aperçu, tiré au sort »** — h2 800/23px + phrase
   « Trois pièces prises au hasard dans les 1 284 de l'annuaire. Elles changent à chaque
   visite. » + bouton **Rafraîchir** (icône shuffle, outline). Grille de 3 cartes de
   pièce `aspect-ratio:1`, chacune avec **le nom de la marque en surtitre**
   (700/10.5px `letter-spacing:.14em` majuscules `#6a5a92`), titre 800/14px, prix
   800/13.5px ; badges possibles : compteur de cœurs, « −20 % » (`#c2273f`),
   « ÉPUISÉ » (`rgba(23,10,51,.85)`). Mention légale dessous : « L'achat se fait toujours
   directement chez la marque. NEWAVE SPHERE ne vend rien. » (500/12.5px, opacité .55).
4. **Section « Les publications / Nos derniers posts »** — 3 cartes `aspect-ratio:4/5`,
   marque en surtitre, titre 800/14px, accroche 500/12.5px `#4a3a78` ; badges « +3 » et
   « Vidéo » (triangle play). Lien « Les 78 posts ».
5. **Bandeau de sortie** `.card-light` pleine largeur : « Explorer les 136 marques de
   l'annuaire » / « RECHERCHE, INDEX A→Z, MODE LISTE » + flèche « → » 900/20px `#3a2470`.

*Colonne de droite (330px), quatre blocs `.glass` `gap:16px` :*
« AUSSI À LA UNE » (3 marques, vignette 46px) · « AU HASARD » + bouton blanc « Tirer une
marque » · « DERNIERS POSTS » (3 lignes, vignette 52px) · carte `.card-light` « Tu crées
une marque ? » avec bouton `#170a33` « Proposer ma marque ».

---

### 3. Les pièces — badge `5a`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/pieces` ·
**Remplace :** `PieceDirectory.tsx`

**Purpose.** Fouiller 1 284 pièces toutes marques confondues. Registre assumé :
**la photo d'abord**.

**Le parti pris, à ne pas perdre en portant le code :** les pièces **n'ont pas de carte**.
Pas de fond `.card-light`, pas de `border-radius:20px` — juste la photo en
`border-radius:4px` posée sur le fond violet, avec `box-shadow:0 18px 40px -22px rgba(20,6,50,.9)`,
et le texte **en dessous, sur le fond**, sans conteneur. C'est ce qui distingue cet écran
de tous les autres.

**Layout.** `grid-template-columns:222px minmax(0,1fr); gap:26px; align-items:start`.

*Colonne de filtres (222px, `.glass`, `padding:20px`, `gap:18px`)* — **persistante**,
pas un panneau à ouvrir. Sections séparées par `border-top:1px solid rgba(255,255,255,.15); padding-top:16px` :

- en-tête « FILTRES » + « Effacer » (700/11px, soulignement) ;
- **Rayon** — liste verticale `gap:2px`, lignes `padding:8px 11px; border-radius:11px`
  avec le nom à gauche et le compteur à droite ; ligne active en blanc sur `#170a33`.
  Hauts 214 · Bas 148 · Vestes 96 · Maille 131 · Bijoux 172 · Accessoires 88 ;
- **Prix** — double curseur : rail `height:4px; border-radius:999px; background:rgba(255,255,255,.2)`,
  plage remplie en `linear-gradient(90deg,rgba(232,111,216,.9),rgba(90,114,224,.9))`,
  deux poignées 16×16px blanches `box-shadow:0 2px 8px rgba(20,6,50,.6)` ; bornes
  « 0 € » / « 160 € » en 800/13px au-dessus ;
- **Disponibilité** — 3 cases : cochée = carré 18×18px `border-radius:6px` blanc avec
  « ✓ » `#170a33` ; décochée = `border:1.5px solid rgba(255,255,255,.4)`.
  En stock / En promo / Pièce unique ;
- **Marque** — select `border-radius:11px` « Toutes (136) » + chevron.

*Grille.* Barre au-dessus : « 214 PIÈCES · HAUTS, EN STOCK » à gauche ; à droite, tri en
**texte souligné** (pas en pastilles) — Au hasard / **Nouveautés** (actif :
`border-bottom:1.5px solid #fff; padding-bottom:3px`) / Prix croissant.

Puis `grid-template-columns:repeat(4,minmax(0,1fr)); gap:20px 18px; align-items:start`.
**Les ratios alternent** (`3/4`, `1/1`, `4/5`) et certaines tuiles portent un
`margin-top` de 8 à 26px : c'est ce décalage qui fait respirer la grille. Sous chaque
photo : marque en 700/10.5px `letter-spacing:.14em` majuscules blanc à 60 %, titre en
700/13.5px blanc, prix en 800/13px blanc (prix barré en 600/12px à 50 % le cas échéant).

Pied de pagination identique à l'annuaire (« 24 SUR 214 AFFICHÉES »).

---

### 4. Posts — badge `6b`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/posts` ·
**Remplace :** `PostMosaic.tsx`

**Purpose.** Lire, pas fouiller. Les posts sont du contenu éditorial : ils méritent de la
largeur, pas une mosaïque.

**Layout.** Colonne unique.

1. En-tête « LES PUBLICATIONS » / « Posts » (800/38px) / phrase / « 78 POSTS » à droite.
2. **Recherche** `border-radius:15px; padding:14px 18px` (`.champ`) + bouton
   « Format, marque, source » en outline.
3. **Ligne de thèmes à compteurs** (même pilule collante que l'annuaire) : Tout 78 ·
   minimalisme 21 · denim 14 · made in france 18 · maille 9 · streetwear 12 ·
   marque indé 31. Les libellés restent **en minuscules** dans les données mais sont
   rendus en `text-transform:uppercase`.
4. **Ligne de tri** : « 78 POSTS · TOUS THÈMES » + Récents / Les plus vus / Au hasard.
5. **Post à la une** — `aspect-ratio:21/9`, `border-radius:22px`,
   `box-shadow:0 24px 60px -26px rgba(20,6,50,.9)`. Voile
   `linear-gradient(74deg,rgba(20,7,48,.9) 0%,rgba(20,7,48,.34) 54%,rgba(20,7,48,0) 80%)`.
   Contenu ancré `left:40px; bottom:36px; max-width:560px` : surtitre
   « LE POST DE LA SEMAINE · <MARQUE> » (900/10px `letter-spacing:.24em`), titre
   **800/40px `letter-spacing:-.035em`**, chapô 500/15px, puis mots-clés en pastilles
   `rgba(255,255,255,.14)` + « il y a 2 jours ».
6. **Fil** `gap:16px` — chaque post :
   `grid-template-columns:280px minmax(0,1fr); gap:26px; align-items:center; padding:18px`,
   `.card-light`, `border-radius:20px`. Vignette `aspect-ratio:4/3; border-radius:14px`
   (badges « +3 » / « Vidéo » en haut à droite). Texte : marque + date sur une ligne,
   titre 800/21px `-.025em`, chapô 500/14px `line-height:1.6` `#4a3a78`, puis mots-clés
   en pastilles `rgba(23,10,51,.07)` et, poussé à droite, « VOIR LA MARQUE → »
   (900/11px `#3a2470`).
7. Bouton centré « Voir 24 posts de plus » en `.card-light`.

---

### 5. Coups de cœur (public) — badge `7a`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/populaires` ·
**Source de données :** `getMostFavorited()` dans `src/lib/favorites.ts`

**Purpose.** Le classement public des marques les plus mises en favori. Insistance
éditoriale : « Rien n'est acheté ici : c'est le nombre de cœurs, et rien d'autre, qui
fait l'ordre. »

**Layout.**

1. En-tête « LE CLASSEMENT » / « Coups de cœur » / phrase / « 3 412 CŒURS · 136 MARQUES ».
2. **Ligne de filtres** en deux groupes préfixés : « SUR » (Cette semaine / Ce mois /
   Depuis toujours) et « TYPE » (Tout 136 / Marques 115 / Artistes 21), avec
   « Mis à jour ce matin » poussé à droite.
3. **Podium** `grid-template-columns:1.35fr 1fr 1fr; gap:18px; align-items:end` — la
   1ʳᵉ place est plus grande *et* plus basse (`align-items:end`), `border-radius:22px`,
   `box-shadow:0 14px 34px rgba(52,18,110,.32)`, et porte **le liseré chromé animé**
   (`padding:1.8px` + `mask-composite:exclude` + `animation:liseré 26s`) — voir
   « Composants partagés ». Rang : pastille `46×46px; border-radius:14px` en
   `linear-gradient(120deg,#7b52e8,#c05fd8)` pour la 1ʳᵉ, `38×38px; background:#170a33`
   pour les 2ᵉ et 3ᵉ. Compteur de cœurs en bas à droite du visuel
   (`rgba(14,5,38,.75)`, cœur plein, 900/13px). Évolution sous le nom : **hausse
   `#1d7a4f`** avec chevron haut, **baisse `#a8455c`** avec chevron bas, **stable
   `#8a7bab`** avec un tiret.
4. **Suite du classement en tableau** — ligne d'en-têtes en 900/9.5px
   `letter-spacing:.18em` majuscules à 50 % d'opacité, puis lignes `.card-light` en
   `grid-template-columns:46px 62px minmax(0,1fr) 210px 150px 110px 40px; gap:16px` :
   rang (800/20px `#8a7bab`) · logo 56px · identité · **aperçu 4 vignettes** · évolution ·
   total de cœurs (800/17px, aligné à droite) · bouton favori 36px.
5. Pied : « 7 SUR 136 AFFICHÉES » / « Voir le classement complet » / lien
   « Ma liste à moi → » vers `/favoris`.

---

### 6. Mes favoris (privé) — badge `7b`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/favoris` ·
**Remplace :** `app/favoris/page.tsx`

**Purpose.** La liste privée. Le design montre **les deux états**, l'un sous l'autre,
séparés par un titre « ET QUAND LA LISTE EST VIDE » — ce séparateur est un artefact de
présentation, à ne pas porter.

**État rempli.** En-tête : nom du profil en œil-de-bœuf, « Mes favoris » (800/38px),
« Ta liste à toi. Elle ne se voit nulle part ailleurs. », « 6 MARQUES · 12 PIÈCES ».
Bascule Marques 6 / Pièces 12 + tri Ajout récent / A → Z. Puis des lignes
`grid-template-columns:62px minmax(0,1fr) 240px 130px 160px 40px; gap:18px` : logo ·
identité (+ badge « À LA UNE ») · aperçu 4 vignettes · **date d'ajout** (600/11.5px
`#8a7bab`) · action · bouton favori **toujours actif** (`background:#170a33`, cœur
plein). Cas particulier : une marque « Ouvre le 12 sept. » remplace « APERÇU » par
**« ME PRÉVENIR »**.

**État vide** (reprend le texte existant de `favoris/page.tsx`, en corrigeant le fait que
c'est une impasse) : bloc `.glass` `padding:48px`, centré — icône cœur 30px dans un
carré 64×64px `border-radius:20px` `rgba(255,255,255,.12)` ; phrase « Tu n'as encore rien
mis de côté. Le cœur, sur une carte de marque, la range ici. C'est ta liste à toi, elle
ne se voit nulle part ailleurs. » ; **deux** boutons — « Parcourir l'annuaire »
(`.card-light`) et « Tirer une marque au hasard » (outline + icône shuffle) ; puis un
lien discret « Ou voir ce que les autres mettent de côté » vers `/populaires`.

---

### 7. Compte — badges `8a` (Profil) et `8b` (Apparence)

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/compte` ·
**Remplace :** `app/compte/page.tsx`

**Purpose.** La page actuelle empile raccourcis + identité + mot de passe + apparence en
une seule colonne `max-w-3xl` ; l'Apparence à elle seule fait trois écrans. Le design la
découpe en **rail latéral + une section à la fois**. `8a` et `8b` sont **deux vues du
même écran**, pas deux options concurrentes.

**Layout commun.** `grid-template-columns:250px minmax(0,1fr); gap:26px; align-items:start`.

*En-tête (8a)* : avatar 76×76px `border-radius:24px` en
`linear-gradient(140deg,rgba(232,111,216,.5),rgba(90,114,224,.44))` avec l'initiale en
900/28px ; « TON COMPTE » / nom 800/34px / email 500/14.5px + badge de rôle
(`.badge` — libellé issu de `ROLE_LABEL` : Membre / **Créateur** / Administrateur ;
masqué pour `membre`, conformément au code actuel).

*Rail (250px, `.glass`, `padding:16px`)* : groupe « RÉGLAGES » — Profil / Apparence /
Sécurité / Notifications, lignes `padding:11px 12px; border-radius:13px; gap:11px` avec
icône 17px ; actif = `background:#fff; color:#170a33; font:800 13.5px`. Groupe
« MES ESPACES » — Mes favoris (6) / Espace marque (1), compteur à droite. Puis, séparé
par un filet, « Se déconnecter » (`LogoutButton`).

#### 8a — onglet Profil

1. **Raccourcis** — 2 cartes `.card-light` `grid-template-columns:repeat(2,1fr); gap:14px`,
   `padding:18px 20px; border-radius:18px` : libellé 800/15px, note 600/11.5px majuscules
   `#6a5a92`, flèche « → » 900/19px `#3a2470`. Reprend la logique `raccourcis` existante
   (Mes favoris / Espace marque / Administration, filtrés par rôle).
2. **Ton identité** (`.glass`, `padding:26px`) — **deux formulaires indépendants**, comme
   dans `AccountForms.tsx`, séparés par `border-top:1px solid rgba(255,255,255,.12); padding-top:24px` :
   - `DisplayNameForm` — `<Label hint="C'est ce qui s'affiche dans ton espace.">Nom
     affiché</Label>`, input `.champ`, message de succès en 700/13px blanc à 85 %
     (« Nom mis à jour. » — le `message` renvoyé par `updateDisplayName`), puis
     `<SubmitBar label="Enregistrer" />` en `.card-light` `padding:14px 28px` ;
   - `EmailForm` — `<Label hint="C'est aussi l'adresse avec laquelle tu te connectes.">`,
     input `.champ` type email, **note de confirmation** en bloc
     `rgba(255,255,255,.12)` `border-radius:13px` nommant les deux boîtes, bouton
     « Changer mon adresse ».
   ⚠️ Chaque champ a **son propre bouton et son propre message inline**. Pas de barre
   « Enregistrer / Annuler » partagée, pas d'indicateur global.
3. **Mot de passe** (`.glass`) — `grid-template-columns:minmax(0,1fr) 280px; gap:26px` :
   à gauche les deux paragraphes d'explication existants ; à droite le bouton
   `LienReinitialisation` (« Réinitialiser mon mot de passe », `.card-light`), le message
   de succès (« Email envoyé à … Le lien est valable une heure, et une seule fois. ») et
   le compte à rebours de 60 s (« Renvoyer dans 47 s », 600/12px à 50 %).
4. **⚠️ Zone marquée « À partir d'ici, ce sont des propositions »** — filet + phrase
   d'avertissement, puis deux sections **qui n'existent pas dans le code** (ni route, ni
   action serveur, ni colonne en base) :
   - **« Ce qu'on t'envoie »** — 3 interrupteurs (ventes d'une marque suivie / nouvelles
     marques, hebdo / réponses à mes avis). Interrupteur : 48×27px `border-radius:999px`,
     actif `linear-gradient(118deg,rgba(232,111,216,.7),rgba(90,114,224,.7))` avec
     pastille 21px blanche à droite ; inactif `rgba(255,255,255,.16)`, pastille à gauche.
     Demanderait une colonne `notifications jsonb` sur `profiles` + une action serveur.
   - **« Supprimer mon compte »** — `border:1px solid rgba(194,39,63,.45)`,
     `background:rgba(70,10,26,.28)`, bouton « Supprimer… ». Demanderait une suppression
     en cascade et une reprise des marques gérées.
   La ligne « Notifications » du rail porte le tag « À VENIR » pour la même raison.

#### 8b — onglet Apparence

Réorganise `ThemePicker.tsx` **sans en changer le comportement** en
`grid-template-columns:minmax(0,1fr) 340px; gap:20px`.

*Colonne gauche — les réglages, en trois blocs `.glass` :*
- **Fond** : titre + bascule Sombre / Clair dans un rail `border-radius:999px; padding:4px`,
  + la phrase existante sur la dilution en mode clair ;
- **Ambiances** : `grid-template-columns:repeat(3,1fr); gap:12px`. Vignette =
  `height:52px` peinte en `linear-gradient(140deg, …les 6 hex…)` + bandeau de nom
  `rgba(255,255,255,.08); padding:9px`. Sélectionnée : `border:1px solid #fff` +
  `box-shadow:0 0 0 3px rgba(255,255,255,.34)` + coche 12px. 5 presets + tuile
  pointillée « Enregistrer ces couleurs ». Les ambiances perso gardent leur bouton de
  suppression en haut à droite (`rgba(20,8,50,.7)`, → `#c2273f` au survol) ;
- **Composer** : les 6 teintes de fond en `repeat(6,1fr); gap:10px` (pastille 44px
  `border-radius:11px` + label Départ / Transition / Cœur / Pic / Retour / Fin en
  800/9.5px majuscules), puis les 3 accents en `repeat(3,1fr)` (Nappe 1-3).

*Colonne droite (340px) :*
- **Aperçu vivant** — cadre `border-radius:20px; overflow:hidden`, `height:210px`, qui
  peint le dégradé courant **avec les nappes animées** ; libellé « APERÇU » en haut à
  gauche ; mini-barre de nav en bas (logo 16px + pastille « Bouton ») pour juger le
  contraste. Sous le cadre, sur `rgba(8,2,30,.42)`, la phrase de `decrire(mouvement)` —
  ici « Le fond dérive à rythme normal, franchement. » ;
- **Mouvement** (`.glass`) — 4 presets en pastilles (Figé / Doux / **Animé** / Vif),
  puis les curseurs **Vitesse** (0,1→3, pas 0,05) et **Ampleur** (0→2, pas 0,05) avec la
  valeur « ×1,00 » alignée à droite de l'étiquette ; l'explication ampleur vs vitesse ;
  le bouton pointillé « Enregistrer ce réglage ». ⚠️ **Conserver impérativement** le
  comportement de `ThemePicker` : rien n'est appliqué pendant le glissement
  (`data-reglage="1"` fige le décor, on ne pose la valeur qu'au relâchement) — c'est une
  protection contre le scintillement, pas un détail d'implémentation ;
- l'avertissement `prefers-reduced-motion` quand le système le demande ;
- « Revenir aux réglages par défaut » en outline.

L'état d'enregistrement (« Enregistrement… » / « Enregistré. ») remonte **dans le rail**,
sous un filet : pastille 7px `#57d99a` avec halo `box-shadow:0 0 0 3px rgba(87,217,154,.22)`
+ « Enregistré » en 800/11.5px.

---

---

### 8. Éditer une marque — badge `9a`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/admin/marques/[id]` ·
**Remplace :** la mise en page de `app/admin/marques/[id]/page.tsx` + `AdminForm.tsx`

**Purpose.** La page actuelle est un formulaire d'un seul tenant : quatre sections
empilées (`<Bloc>`), un unique `SubmitBar` tout en bas, `BrandManagers` détaché en
dessous. Trois problèmes concrets :

1. **On ne sait pas ce qui manque pour publier.** `obstacleAPublication()` connaît la
   réponse, mais elle n'est rendue qu'au moment d'échouer — ou pire, en publication
   groupée, sous la forme « laissées de côté ».
2. **On ne voit pas le résultat.** Une accroche est « affichée sur la carte de
   l'annuaire », mais la carte n'est visible nulle part pendant qu'on la rédige.
3. **On perd le fil.** Rien n'indique qu'on a modifié quelque chose ni où l'on en est.

**Layout.** `grid-template-columns:208px minmax(0,1fr) 320px; gap:20px; align-items:start`,
sous deux barres : la nav d'administration existante, puis un **en-tête de fiche collant**
(`position:sticky`) qui porte le logo 46px, le fil d'Ariane, le nom, le badge d'état,
l'état d'enregistrement, et les actions déjà présentes (`PublishToggle`, Voir la page,
Pièces, Statistiques, Supprimer — ce dernier replié dans un menu `⋮`).

*Colonne 1 — le sommaire (208px, `.glass`).* Une entrée par `<Bloc>`, plus « Les
gérants ». Chaque entrée porte **soit une coche verte** (section complète), **soit une
pastille ambre avec le nombre de champs vides**. C'est un repère, pas une étape : tout
reste modifiable dans n'importe quel ordre. Ancres avec défilement doux — **jamais
`scrollIntoView`**.

*Colonne 2 — le formulaire.* Les `<Bloc>` existants, dans leur ordre actuel (L'identité /
La démarche / Le classement / Liens et publication), chacun dans son propre `.glass`
plutôt qu'un seul grand. Champs : classe `.champ` inchangée. Ajouts de confort :
- **compteur de caractères** sous l'accroche (« 29 / 70 ») + rappel « Vu à droite, dans
  l'aperçu » ;
- **`VisuelCouverture`** en deux tuiles côte à côte — la couverture posée, et une zone de
  dépôt vidéo explicite (« Glisse une vidéo ici · MP4, 10 s max. Elle remplace l'image. »)
  au lieu de deux champs séparés ;
- **catégories en pastilles cochables** (`CheckGroup`) plutôt qu'une liste de cases, avec
  le compte « 2 choisies » ;
- **gamme de prix en segmenté € / €€ / €€€** avec le libellé complet en dessous, au lieu
  d'un `<select>`.

⚠️ Le champ **« Comment on achète » (`acces`) commande la check-list** — il faut que ça se
voie. Une note sous le champ l'explique : « Boutique en ligne » exige un catalogue ;
« sur commande », « bientôt » et « profil Instagram » ne l'exigent pas.

*Colonne 3 — l'aperçu et la check-list.*
- **Aperçu vivant** (`border-radius:20px`, en-tête `rgba(8,2,30,.52)`) qui rend la vraie
  carte d'annuaire — le même composant `BrandCard` — à partir des valeurs en cours de
  saisie. Bascule Carte / Page.
- **« Prêt à publier »** — barre de progression + les **trois** conditions de
  `src/lib/publication.ts`, et rien d'autre :

  | Condition | Prédicat réel |
  |---|---|
  | Un visuel | `cover_url` **ou** `logo_url` |
  | Du texte | `tagline` **ou** `description` |
  | Au moins une pièce | `pieces > 0`, **sauf si `exigeDesPieces === false`** (voir `doitAvoirDesPieces` dans `acces.ts`) |

  ⚠️ **La boutique, les catégories, le pays et le logo seul ne bloquent PAS la
  publication.** Le code le dit explicitement (« Une boutique fermée n'est pas une fiche
  incomplète ») — ne pas les ajouter à la liste. Chaque condition non remplie affiche le
  **message exact renvoyé par `obstacleAPublication()`**, pas une reformulation, et un
  raccourci vers le champ ou l'action qui la lève (ici « Importer depuis la boutique »).
- **`BrandManagers`** remonte dans cette colonne, en carte compacte.

*Barre d'enregistrement flottante*, centrée en bas d'écran, visible **seulement quand il y
a des modifications** : pastille ambre + « 3 modifications non enregistrées » / Annuler /
**Enregistrer** (blanc) / **Enregistrer et publier** (dégradé d'accents, **désactivé tant
que la check-list n'est pas complète**, avec en infobulle le message d'obstacle).

**Comportement à porter.** Détection de l'état modifié (comparaison au `defaultValue`) ;
avertissement avant de quitter ; la check-list se recalcule à la frappe côté client avec
**la même fonction** `obstacleAPublication()` que le serveur — c'est tout l'intérêt d'avoir
une définition unique, et l'importer côté client est explicitement le but du fichier.

---

### 9. Tableau de bord d'administration — badge `9b`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/admin` ·
**Remplace :** `app/admin/page.tsx` + réorganise `StatsPanel.tsx`

**Purpose.** Aujourd'hui : quatre compteurs cliquables, puis `StatsPanel` (quatre
chiffres, un histogramme, quatre classements), puis « Actions rapides » tout en bas. On
ouvre l'administration pour **faire quelque chose**, et l'écran commence par des nombres
qui ne demandent rien. Le titre passe de « Tableau de bord » à **« Ce qui t'attend »**.

**Layout.**

1. **Actions rapides remontées dans l'en-tête**, à droite du titre : Nouvelle marque
   (`.card-light`), Nouveau post, Mettre à jour les catalogues.
2. **La file de travail** — `grid-template-columns:repeat(2,1fr); gap:14px`, quatre cartes
   qui portent chacune un **compte, une phrase concrète, et un lien direct** :

   | Carte | Compte | Fond | Phrase |
   |---|---|---|---|
   | Candidatures à traiter | `applicationsNew` | `.card-light`, pastille `#c2273f` | ancienneté de la plus vieille |
   | Signalements ouverts | signalements non traités | `.card-light`, pastille `#c2273f` | de quoi il s'agit |
   | Brouillons publiables | `peutEtrePubliee()` sur les brouillons | `.glass`, pastille `#1d7a4f` | « déjà cochées à l'arrivée » |
   | Fiches incomplètes | l'inverse | `.glass`, pastille `rgba(240,192,90,.9)` | la répartition par obstacle |

   Les deux dernières mènent à `/admin/marques` **avec le filtre déjà appliqué et la
   sélection déjà faite** — c'est ce qui les rend utiles plutôt que décoratives.
   ⚠️ La répartition (« 9 sans visuel, 6 sans catalogue, 2 sans texte ») doit venir de
   `obstacleAPublication()`, pas d'une heuristique locale.
3. **L'état du site en une seule ligne** — les compteurs de `adminCounts()` en bandeau
   `rgba(8,2,30,.44)`, séparés par des filets 1×38px : chiffre 800/26px, libellé
   700/10px majuscules, note 600/11px. Ils informent, ils ne réclament pas : d'où leur
   passage de quatre grosses cartes à une ligne.
4. **Fréquentation** — `grid-template-columns:minmax(0,1fr) 330px`. À gauche : trois
   chiffres avec **leur évolution** (`#7de2ab` en hausse, `#f0a5b6` en baisse), une bascule
   7 j / 30 j / 90 j, l'histogramme existant (30 barres, `gap:2px`, dégradé blanc vertical,
   dernière barre plus claire), et la note de confidentialité **inchangée**. À droite : les
   `Classement` existants **fusionnés en un seul bloc à onglets** (Clics / Favoris / Vues)
   plutôt que quatre panneaux — même barres, même données.
5. **« Dernières actions »** — ⚠️ **proposition**, signalée comme telle dans le design :
   il n'y a pas de journal d'activité aujourd'hui. Demanderait une table d'audit.

---

### 10. Liste des marques (administration) — badge `9c`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/admin/marques` ·
**Remplace :** la mise en page de `BrandBulkList.tsx`

**Purpose.** Le composant fait déjà le bon travail (filtres cumulables, sélection portant
sur les lignes affichées, confirmation à deux appuis). Ce qui manque est visuel : les
filtres sont repliés derrière un bouton, la barre d'action est **en haut** alors qu'on
coche en bas, et rien dans la ligne ne dit si la fiche est publiable.

**Trois changements, aucun sur la logique.**

1. **Vues enregistrées** en première ligne de filtres, à la place du repli : Toutes 136 ·
   Publiables 11 · Incomplètes 17 · Sans catalogue 22 · À la une 5, plus une tuile
   pointillée « Enregistrer cette vue ». Ce sont des combinaisons de `TESTS` déjà
   existantes, nommées. La recherche et les quatre `<select>` (Pays, Catégorie, Gamme,
   Trier) restent sur la ligne du dessous, **dépliés** — cinq contrôles ne sont pas un mur.
   Les faces `avec`/`sans` de `CRITERES` restent accessibles derrière « Filtres » pour les
   cas fins.
2. **Ligne en tableau**, `grid-template-columns:34px 52px minmax(0,1fr) 190px 130px 100px 34px; gap:14px`,
   avec une ligne d'en-têtes 900/9.5px : case · logo · marque · **Publiable ?** ·
   catalogue · état · flèche. La colonne **Publiable ?** est une barre de progression
   + un libellé tiré de `obstacleAPublication()* : « Prête » / « Complète » en `#1d7a4f`,
   « Sans visuel » en `#c2273f`, etc. Ligne cochée : `outline:3px solid #fff` (l'actuel
   `ring-3 ring-white`).
3. **Barre d'action flottante en bas** (`position:fixed`, centrée, pilule
   `rgba(8,2,30,.72)` + `blur(24px)`) au lieu de la barre en haut : « 3 sélectionnées ·
   sur 11 affichées · Tout cocher » puis Publier / Retirer / Supprimer. Le libellé
   « sur N affichées » rend visible la règle déjà appliquée par le code — la sélection ne
   porte jamais sur des lignes masquées.

---

---

### 11. La barre de navigation publique — badge `10a`

**Fichier :** `NEWAVE - pages.dc.html` · **Remplace :** la mise en page de `Header.tsx` ·
**Classe existante :** `.barre` (à conserver telle quelle)

**Ce qui change.** Trois ajouts, aucune refonte : le **liseré chromé animé** vient border
la pilule (technique décrite dans « Composants partagés ») ; deux **icônes rondes de 36px**
apparaissent à droite des onglets — recherche (ouvre le ⌘K) et favoris — ce qui les rend
atteignables de partout ; et « Connexion » cède la place à une **pastille d'avatar 36px**
en `linear-gradient(140deg, rgba(232,111,216,.5), rgba(90,114,224,.44))` avec l'initiale
en 900/13px.

Les onglets passent de `700 12.5px / padding:8px 13px` à `700 13px / padding:9px 14px`, et
l'inactif s'éclaircit de `rgba(255,255,255,.82)` à `.7` pour que l'onglet actif ressorte
davantage. Le reste — fond composé, dégradé d'accents sur l'onglet actif, CTA blanc — est
identique au code actuel.

⚠️ Ne pas toucher `MobileMenu.tsx` : sur téléphone, la barre garde son tiroir.

---

### 12. La barre du gérant — badge `10d`

**Fichier :** `NEWAVE - pages.dc.html` · **Remplace :** `BarreGerant.tsx`

**Purpose.** Aujourd'hui : trois onglets et deux boutons dans une pilule translucide. Rien
ne dit de **quelle marque** il s'agit (problème réel dès qu'on en gère deux), rien ne dit
qu'elle est en **brouillon**, et rien ne dit **ce qu'il manque** pour la publier — cette
information n'existe qu'au moment d'échouer.

**Structure : une carte à deux étages**, `border-radius:22px`,
`background-color:rgba(6,2,26,.72)`, `backdrop-filter:blur(26px) saturate(1.4)`,
`border:1px solid rgba(255,255,255,.18)`,
`box-shadow:0 18px 44px -16px rgba(12,3,36,.9), inset 0 1px 0 rgba(255,255,255,.16)`.
Beaucoup plus opaque que la barre publique : c'est un outil, pas du décor.

**Filet d'appartenance** — tout en haut, `height:3px`,
`linear-gradient(90deg, rgba(232,111,216,.9), rgba(180,122,234,.85), rgba(90,114,224,.9))`.
C'est le seul signe qui dit « cette zone n'appartient qu'à toi ».

**Premier étage** (`padding:14px 18px`, `display:flex; flex-wrap:wrap; gap:16px`) :
- **logo 42×42px** `border-radius:12px` + `inset 0 0 0 1.5px rgba(255,255,255,.5)` ;
- œil-de-bœuf « TON ESPACE » (900/9px, `.2em`) + **nom** 800/15px `-.02em` + **badge
  d'état** : brouillon = `rgba(240,192,90,.18)` / `inset 0 0 0 1px rgba(240,192,90,.5)` /
  texte `#f5d38f` / point 5px `#f0c05a` ; en ligne = `rgba(125,226,171,.16)` /
  `inset 0 0 0 1px rgba(125,226,171,.45)` / texte `#a6ecc6` / point `#7de2ab` ;
- séparateur 1×34px ;
- **onglets** — `padding:10px 14px; border-radius:13px; gap:8px`, icône 16px + libellé,
  `white-space:nowrap`, actif en `background:#fff; color:#170a33; font:800 13px`. « Mes
  pièces » porte son compteur. La nav est en `flex:0 1 auto` (elle ne porte pas seule le
  rétrécissement) et chaque `<svg>` en `flex:0 0 auto` ;
- **actions** — « Modifier ma fiche » en outline `rgba(255,255,255,.1)`, « Ajouter des
  pièces » en blanc `box-shadow:0 4px 16px -4px rgba(232,111,216,.6)`.

**Second étage, selon l'état** — même hauteur, même place, contenu différent :

*Brouillon* — bandeau `rgba(240,192,90,.12)` : pastille ronde 22px `rgba(240,192,90,.9)`
portant **le nombre de conditions manquantes**, la phrase (« Il te reste une chose avant de
pouvoir publier »), les **trois conditions de `publication.ts`** en pastilles — remplie =
coche `#7de2ab`, manquante = cercle vide `2px solid rgba(240,192,90,.9)` sur
`rgba(240,192,90,.2)` — puis le geste qui lève l'obstacle (« Importer depuis ma
boutique ») et « Publier ma marque » en dégradé d'accents, **à `opacity:.4` et désactivé**
tant que la check-list n'est pas complète.

*En ligne* — bandeau `rgba(255,255,255,.06)`, `gap:22px` : vues sur 7 jours, favoris
gagnés (delta en `#7de2ab`), clics partis vers la boutique, puis « Le détail » aligné à
droite. Ce sont les trois chiffres de `StatsPanel` qui intéressent un créateur.

⚠️ La check-list vient de `obstacleAPublication()`, jamais d'un test local. Les messages
affichés sont **ceux que la fonction renvoie**.

---

### 13. Modifier sa page — badge `11b`

**Fichier :** `NEWAVE - pages.dc.html` · **Remplace :** `PanneauEdition.tsx`

**Purpose.** Le panneau actuel empile douze champs dans un seul défilement, avec un bouton
tout en bas et aucun moyen de voir le résultat. Le commentaire du fichier dit vouloir « voir
sa page, exactement comme les visiteurs la voient, et ouvrir ce panneau pour la retoucher » —
`11b` va au bout de cette intention : **il n'y a plus de panneau du tout.**

**Le principe.** Un mode **retouche**, activé depuis la barre du gérant. Le bouton
« Modifier ma page » devient un état visible (`linear-gradient(118deg, rgba(232,111,216,.6),
rgba(90,114,224,.58))`, « Retouche en cours ») accompagné de la consigne « Clique sur un
texte ou un visuel de ta page pour le changer », et d'un bouton « Quitter la retouche ».

**Chaque bloc de la page devient son propre petit éditeur.**

| Élément de page | Champ | Comportement en retouche |
|---|---|---|
| Couverture | `cover_url` / `cover_video_url` | `box-shadow:0 0 0 2px rgba(232,111,216,.55)` en permanence + badge « MODIFIABLE » ; au survol, voile `rgba(12,4,32,.42)` et deux boutons centrés : « Changer l'image » (blanc) et « Mettre une vidéo » (outline sur fond opaque) |
| Logo | `logo_url` | pastille crayon 30px blanche en bas à droite du logo 88px |
| Accroche | `tagline` | clic → devient un champ **à sa place et à sa taille** : bloc `rgba(12,4,32,.5)`, `box-shadow:0 0 0 2px rgba(232,111,216,.75)`, étiquette flottante « TA PHRASE » en `rgba(232,111,216,.95)`, texte en 500/18px (la taille d'affichage réelle), pied avec « Échap pour annuler · Entrée pour valider », compteur « 29 / 70 » et bouton « Valider » |
| Démarche | `description` | au survol : `box-shadow:0 0 0 1.5px rgba(255,255,255,.28)`, étiquette « TA DÉMARCHE », bouton « Modifier » en haut à droite. En édition, même traitement que l'accroche, en 15px/1.75 |
| Ville, catégories, gamme | `city`, `categories`, `price_tier` | les pastilles de métadonnées déjà affichées sous le nom deviennent cliquables (petit crayon 11px dedans) ; une pastille **pointillée** « + Année de création » pour le champ vide |
| Pièces | — | section « Mes pièces 0 » avec bloc pointillé : « C'est la dernière chose qui te manque pour publier » + « Importer depuis ma boutique » / « Ajouter à la main » |

**Rail de droite (300px)** — pour ce qui n'a pas d'équivalent visible dans la page :
- **« Prêt à publier »** — « 2 sur 3 », barre de progression, les trois conditions, et la
  note « Ta boutique, tes catégories et ton pays ne bloquent pas la publication » ;
- **« Aussi sur cette page »** — la liste des champs restants (Couverture, Logo, Boutique,
  Instagram, Année de création) avec coche verte ou mention « VIDE », chacun ouvrant son
  éditeur.

**Barre d'enregistrement flottante** — `position:fixed`, centrée en bas, pilule
`rgba(6,2,26,.82)` + `blur(24px)`, **visible seulement s'il y a des modifications** :
pastille ambre + « 2 modifications non enregistrées » / « Tout annuler » / « Enregistrer ».

**À porter côté implémentation.**
- Un **brouillon local** (un `useState` par champ, ou un seul objet) : rien ne part au
  serveur avant « Enregistrer », et « Tout annuler » restaure les valeurs d'origine.
- L'envoi reste **`saveBrandPresentation`**, inchangé, avec le même `FormData` — donc les
  mêmes droits relus en base. Le mode retouche ne donne rien à personne.
- Les libellés et textes d'aide restent **ceux de `MOTS`** dans `PanneauEdition.tsx`, y
  compris la voix `administration` : le même mode retouche sert à l'admin sur la fiche
  d'une marque, seuls les mots changent.
- Avertissement avant de quitter la page s'il reste des modifications.
- Sur téléphone, l'édition en place n'est pas praticable pour tous les champs : **garder le
  panneau** `11a`-style (feuille qui monte) en dessous de `sm`, et réserver la retouche en
  place au desktop. Les deux écrivent dans le même brouillon.

---

### 14. Coups de cœur, remasterisée — badge `12a`

**Fichier :** `NEWAVE - pages.dc.html` · **Route :** `/populaires` ·
**Remplace l'écran `7a` décrit plus haut** (`7a` reste la référence pour la suite du
classement en tableau)

**Purpose.** Le problème n'est pas la ligne de rayons, c'est qu'un rayon à « 0 » se présente
exactement comme un rayon à « 400 » : on clique, et on tombe sur du vide. Sur un site qui
vient d'ouvrir, c'est le cas de presque tous. La page doit donc **se comporter autrement
selon ce qu'il y a en base** — pas être refaite à chaque palier.

**Les quatre règles, à implémenter comme des seuils.**

| Règle | Condition | Sinon |
|---|---|---|
| Sélecteur de période (Cette semaine / Ce mois / Depuis toujours) | total ≥ **100 cœurs** | pas de sélecteur du tout |
| Podium à trois places | total ≥ **100 cœurs** | une **liste simple** « Les premières mises de côté », sans rang ni médaille |
| Un rayon dans la ligne principale | ≥ **1 cœur** | il passe dans la zone « Encore aucun cœur » |
| Grille de résultats | le filtre rend ≥ 1 marque | jamais une grille vide — voir ci-dessous |

**La ligne de rayons.** Rangée **par nombre de cœurs décroissant**, la mieux garnie
d'abord — c'est ce qui la rend instinctive : on lit l'ordre avant de lire les mots. Chaque
pastille est un petit bloc `min-width:112px`, `padding:10px 16px 9px`,
`border-radius:15px`, contenant le nom (700/12px `.06em` majuscules), le compte
(900/13px) **et une jauge** `height:3px` `border-radius:999px` sur
`rgba(255,255,255,.16)`, remplie en
`linear-gradient(90deg, rgba(232,111,216,.95), rgba(180,122,234,.9))` à la proportion du
rayon le plus garni. « Tout » est actif par défaut : fond blanc, jauge `#170a33` à 100 %.

**Les rayons vides**, sous un filet, dans une zone préfixée « ENCORE AUCUN CŒUR » : pastille
`border:1px dashed rgba(255,255,255,.3)`, **sans compteur de cœurs** mais avec un libellé
honnête — « Streetwear · 7 marques à découvrir ». ⚠️ Elles restent **cliquables**, et mènent
à **`/marques?cat=streetwear`**, pas à une page de classement vide. La note le dit :
« Cliquer y mène à l'annuaire filtré, pas à une page vide. »

**Sous cent cœurs, la liste plutôt que le podium.** Lignes `.card-light`
`grid-template-columns:60px minmax(0,1fr) 210px 120px 40px; gap:16px` : logo 60px ·
identité · aperçu 4 vignettes · « 8 cœurs » (800/14px avec cœur plein) · bouton favori.
**Pas de numéro de rang**, pas de pastille de médaille : à cette échelle, trois voix d'écart
changeraient tout et un podium mentirait. Titre de section « Les premières mises de côté »,
avec la note « Le podium s'ouvrira à 100 cœurs ».

**Le bloc qui répond au vide — « Le premier cœur est à prendre ».** `.glass`,
`padding:22px`. Œil-de-bœuf « PERSONNE N'A ENCORE VOTÉ POUR ELLES », titre 800/21px,
phrase « Sept marques de l'annuaire n'aucun cœur. Ce ne sont pas les moins bonnes — juste
les moins vues. », bouton « Une autre série » (icône shuffle). Puis **4 cartes**
`.card-light` `border-radius:16px` en `repeat(4,1fr); gap:12px` : visuel `aspect-ratio:4/3`
avec un **bouton cœur 32px** `rgba(23,10,51,.9)` posé en bas à droite (le geste est là,
sur la carte), nom 800/14px, méta 600/10.5px majuscules. Les marques sont tirées au sort
parmi celles à zéro cœur.

**Rail de droite (320px), trois blocs :**
- **« Le classement complet »** — « 34 sur 100 cœurs » + barre de progression + l'explication
  du seuil, en toutes lettres : « En dessous de cent cœurs, un podium ne veut rien dire :
  trois voix d'écart suffiraient à tout changer. » ;
- **« Vient d'être mis de côté »** — 3 lignes, vignette 36px + nom + ancienneté, avec la
  note de confidentialité **« On ne dit jamais qui a mis quoi de côté. »** ;
- **« Ta liste à toi »** — carte `.card-light` vers `/favoris`.

**Ce qu'il faut côté données.**
1. `getMostFavorited()` existe déjà — ajouter le **compte par catégorie** (un agrégat, pas
   un comptage client) et le **total général**, qui pilotent les seuils.
2. La liste des marques publiées **à zéro cœur**, tirée au sort, pour le bloc du bas.
3. Les **derniers favoris ajoutés**, marque et horodatage seuls — ⚠️ jamais l'utilisateur,
   la règle de `favorites.ts` ne change pas.
4. Le delta hebdomadaire n'est nécessaire **qu'au-dessus du seuil** : inutile de le
   construire tant que le sélecteur de période n'apparaît pas.

Les seuils (100 cœurs) sont un point de départ à mettre dans une constante, pas en dur dans
le JSX — ils vont bouger.

## Ce qui reste à ne pas casser dans l'administration

- `src/lib/publication.ts` est **la** définition. Ne pas la dupliquer, ne pas l'assouplir
  dans un chemin (formulaire, bouton de ligne, sélection multiple) : c'est exactement ce
  que le fichier dit vouloir éviter.
- Le `maxDuration = 60` de la fiche marque : enregistrer peut déclencher la lecture d'une
  boutique.
- La confirmation à deux appuis (`useConfirmationCle`) plutôt qu'un `confirm()` natif —
  les navigateurs mobiles escamotent le second.
- `data-no-reveal` sur tout l'espace d'administration : pas d'animation d'apparition sur
  une table de travail.
- La nav d'administration s'enroule sur deux rangs sur mobile, elle ne défile pas
  latéralement.

## Composants partagés

### Barre de nav en verre
`border-radius:999px`, `display:flex; justify-content:space-between; padding:8px 10px 8px 16px`.
Fond composé : `background-color:rgba(8,2,30,.58)` +
`background-image: radial-gradient(130% 240% at 2% 50%, rgba(232,111,216,.3) 0%, transparent 58%), radial-gradient(130% 240% at 98% 50%, rgba(90,114,224,.28) 0%, transparent 58%), linear-gradient(180deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,0) 52%), linear-gradient(180deg, rgba(44,16,100,.62), rgba(44,16,100,.4))`,
`backdrop-filter:blur(28px) saturate(1.6)`,
`box-shadow:0 16px 42px -12px rgba(44,16,100,.62), 0 3px 12px rgba(8,2,30,.32), inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.24)`.
C'est la classe `.barre` existante — ne pas la réécrire.

Liens : `padding:8px 13px; border-radius:999px; font:700 12.5px Archivo; color:rgba(255,255,255,.82)`.
**Onglet actif** : `color:#fff` +
`background-image:linear-gradient(118deg, rgba(232,111,216,.58) 0%, rgba(180,122,234,.52) 52%, rgba(90,114,224,.56) 100%)` +
`box-shadow:inset 0 1px 0 rgba(255,255,255,.34), 0 3px 12px -3px rgba(232,111,216,.55)`.
CTA « Proposer une marque » : `background:#fff; color:#170a33; font:900 12.5px; padding:9px 16px`,
`box-shadow:0 4px 16px -3px rgba(232,111,216,.5), 0 2px 6px rgba(8,2,30,.32)`.
Connecté : pastille d'avatar 34px à la fin.

### Liseré chromé
`position:absolute; inset:0; border-radius:inherit; padding:1.4px` (1.8px sur le podium),
`background:linear-gradient(140deg,#fff 0%,#c9c9d4 14%,#7e7e91 32%,#f4f4f8 47%,#9d9daf 62%,#e9e9f1 76%,#6f6f82 89%,#fff 100%)`,
`background-size:240% 240%`,
`mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)`,
`mask-composite:exclude`, `opacity:.55`, `pointer-events:none`,
`animation:liseré 26s ease-in-out infinite alternate`.

### Décor de fond
Cinq couches empilées dans un conteneur `position:absolute; inset:0; overflow:hidden; pointer-events:none` :
1. dégradé `inset:-25%`, `linear-gradient(168deg, --bg-1 … --bg-6)`, `animation:respire 18s alternate` ;
2. nappe 1 `inset:-26%; filter:blur(26px)`, 3 radial-gradients d'accents,
   `mask-image:radial-gradient(ellipse 62% 62% at 50% 50%, #000 30%, rgba(0,0,0,.55) 58%, transparent 82%)`,
   `animation:nappe1 13s alternate` ;
3. nappe 2, mêmes règles, positions inversées, `animation:nappe2 17s alternate` ;
4. balayage `inset:-32%; filter:blur(30px)`,
   `radial-gradient(ellipse 42% 34% at 50% 50%, rgba(255,255,255,.13), rgba(255,255,255,.05) 45%, transparent 70%)`,
   `animation:balayage 21s alternate` ;
5. **blobs chromés** — `assets/chrome1..3.webp`, 280-315px, débordant les quatre coins
   (`top:-70px; left:-100px` etc.), `filter:drop-shadow(0 18px 34px rgba(45,15,95,.42))`,
   rotations -8° / 14° (+ `scale:-1 1`) / 160° / -166°, `animation:float1 15-17s` ou
   `float2 18-20s` (dont une en `reverse`) ;
6. voile de lisibilité par-dessus :
   `linear-gradient(180deg, rgba(44,16,100,.52) 0%, transparent 26%, transparent 72%, rgba(44,16,100,.6) 100%)`
   + `radial-gradient(ellipse 68% 58% at 50% 48%, rgba(44,16,100,.34), …)`.

Les glyphes défilants (`-+~`) des colonnes latérales sont conservés tels quels
(`Background.tsx`).

### Pied de page
`margin-top:80px; border-top:1px solid rgba(255,255,255,.15); padding-top:40px`,
`display:flex; align-items:flex-end; justify-content:space-between`. À gauche :
`assets/mark-white.webp` `height:40px; opacity:.7` + « © 2026 NEWAVE SPHERE » en 700/10px
`letter-spacing:.22em` majuscules. À droite : Instagram · TikTok ·
contact@newavesphere.fr · À propos · Conditions · Confidentialité · Mentions légales, en
600/12px, `gap:8px 20px`.

## Interactions & Behavior

**Inclinaison au curseur (la signature demandée).** Un unique écouteur
`mousemove` sur `window` (`{ passive: true }`) parcourt les éléments `[data-tilt]` :

```js
const r = el.getBoundingClientRect();
if (r.bottom < -200 || r.top > innerHeight + 200) return;      // hors écran : on saute
const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
const near = Math.abs(dx) < 1.1 && Math.abs(dy) < 1.1;          // ~1 carte de distance
el.style.transition = 'transform .35s cubic-bezier(.2,.8,.3,1)';
el.style.transform = near
  ? \`perspective(900px) rotateY(\${dx * 4.5 * f}deg) rotateX(\${-dy * 3.5 * f}deg) translateY(\${-4 * f}px)\`
  : '';
```

où `f` est l'intensité (1 par défaut). Points d'attention pour le portage :
- **respecter `prefers-reduced-motion`** — à `reduce`, ne pas installer l'écouteur ;
- ne pas l'activer au doigt (pas de `pointermove` tactile) ;
- une carte qui porte déjà un `rotate` statique doit voir ce `rotate` **préservé** et
  composé, pas écrasé.

**Autres comportements.**
- **Recherche ⌘K** — raccourci clavier global ; suggestions dès 2 caractères, groupées
  Marques puis Pièces, préfixe tapé surligné, `Entrée` ouvre le 1ᵉʳ résultat, flèches
  pour naviguer, `Échap` ferme.
- **Recherche et filtres collants** — `position:sticky; top:0` au défilement, avec le
  fond en verre déjà présent (nécessaire : sinon le contenu passe à travers).
- **Index A→Z** — défilement doux vers l'ancre de la lettre ; lettres vides désactivées
  (opacité .24, pas de `href`). ⚠️ **Ne pas utiliser `scrollIntoView`**.
- **Filtres et tri dans l'URL** (`?type=&cat=&prix=&tri=`) pour que la page soit
  partageable et que le retour arrière fonctionne — c'est déjà le principe de
  `BrandDirectory`.
- **Bascule Confort / Grille / Liste** — persistée comme aujourd'hui via `Grille.tsx`
  (mémoire par page).
- **« Tirer une marque »** — navigation vers une marque publiée au hasard.
- **Favori** — reprend `FavoriteButton` : optimiste, et redirige vers `/connexion` sur
  `reason: "non-connecte"`.
- **Curseurs d'apparence** — voir l'avertissement en 8b : appliquer **au relâchement
  seulement**.
- Transitions : `.35s cubic-bezier(.2,.8,.3,1)` pour l'inclinaison, `.2s ease` pour les
  bordures et ombres (déjà la convention de `.champ`), `active:scale(.97)` sur les
  boutons (déjà la convention du site).

**Responsive.** Les prototypes sont dessinés à **1180px de large**, desktop. À porter :
- `< 1024px` — la colonne de filtres de `5a` et le rail de `8a/8b` passent en tiroir
  déclenché par le bouton « Filtres » / un sélecteur d'onglets horizontal ; la colonne de
  droite de `3b` passe sous la colonne principale ;
- `< 768px` — grille de pièces à 2 colonnes, posts en une colonne, lignes de l'annuaire
  reflowées en deux lignes (identité au-dessus, aperçu + actions en dessous) ; l'aperçu 4
  vignettes passe à 3 ;
- les lignes de filtres restent en défilement horizontal (`overflow-x:auto`, barre
  masquée) ;
- **cibles tactiles ≥ 44px** — plusieurs boutons du prototype sont à 36px, à agrandir sur
  mobile.

## State Management

Rien de neuf côté données : les écrans se branchent sur ce qui existe déjà.

| Écran | Données | Source existante |
|---|---|---|
| `2a` annuaire | marques publiées, notes, favoris de l'utilisateur, 4 pièces par marque | `BrandDirectory`, `getNotesMarques`, `getMyFavorites` + **nouveau** : un aperçu de pièces par marque |
| `3b` accueil | marque à la une, 3 pièces au hasard, 3 derniers posts | `getVitrine`, `demo-data` |
| `5a` pièces | pièces + marque de chaque pièce, facettes | `PieceDirectory` |
| `6b` posts | posts + mots-clés | `PostMosaic` |
| `7a` classement | `getMostFavorited()` + **nouveau** : delta sur 7 jours | `src/lib/favorites.ts` |
| `7b` favoris | `getFavoriteBrands()` + date d'ajout | `favorites.created_at` (déjà en base, déjà utilisée pour le tri) |
| `8a/8b` compte | profil, marques gérées, favoris, apparence | `requireUser`, `getManagedBrands`, `lireApparenceDuCompte` |

**Trois ajouts réels à prévoir côté données :**
1. **Aperçu de pièces par marque** (annuaire, classement, favoris) — 4 premières pièces +
   total. À faire en **une** requête pour toute la page, comme `getMyFavorites` le fait
   déjà pour les favoris ; jamais une requête par ligne.
2. **Facettes avec compteurs** — chaque pastille de filtre affiche son nombre de
   résultats. À calculer côté serveur (agrégat), pas en comptant un tableau déjà filtré
   côté client.
3. **Évolution hebdomadaire des cœurs** (classement) — la fonction
   `brand_favorite_counts` ne rend que des totaux. Il faut une seconde fonction rendant
   les totaux à J-7, ou un compteur daté. **Sans casser la règle de confidentialité
   existante : ne jamais exposer qui a mis quoi en favori.**

État local par écran : requête de recherche, suggestions ouvertes/fermées, index du
résultat surligné, filtres actifs, tri, densité, lettre courante, page chargée, onglet de
réglages courant.

## Design Tokens

**Couleurs de thème** (défaut NEWAVE — `src/lib/theme.ts`, à lire via `var(--bg-N)`) :
`#33217f` Départ · `#4e5bc0` Transition · `#9e63d6` Cœur · `#c255c4` Pic · `#5a54c8` Retour ·
`#31217c` Fin. **Accents** : `#e86fd8` Nappe 1 · `#5a72e0` Nappe 2 · `#b47aea` Nappe 3.
Autres ambiances livrées : Nuit, Braise, Forêt, Graphite (hex dans `theme.ts`).

**Encre et surfaces claires :**
`#170a33` encre (`--color-ink`) · `#4a3d6e` / `#4a3a78` corps de texte sur clair ·
`#6a5a92` métadonnées · `#8a7bab` texte tertiaire / prix barré · `#3a2470` flèches et
accents sur clair · `#7b6aa8` légendes de placeholder.
Fond de carte claire : `linear-gradient(160deg,#fff 0%,#f4efff 52%,#e6dcfb 100%)`.
Pied de carte : `linear-gradient(180deg,rgba(124,92,200,.19) 0%,rgba(124,92,200,.09) 45%,rgba(124,92,200,.03) 100%)`.

**États :** `#c2273f` promo / danger · `#1d7a4f` hausse · `#a8455c` baisse ·
`#57d99a` enregistré · `linear-gradient(120deg,#7b52e8,#c05fd8)` badge « À la une ».

**Verre :** `background-color:rgba(8,2,30,.22)` +
`background-image:linear-gradient(150deg,rgba(44,16,100,.48),rgba(44,16,100,.28))` +
`backdrop-filter:blur(18px) saturate(150%)` +
`border:1px solid rgba(255,255,255,.3)` +
`box-shadow:0 10px 30px rgba(45,15,100,.26), inset 0 1px 0 rgba(255,255,255,.3)`.
Variante opaque pour les barres collantes : `rgba(8,2,30,.44)` + `blur(20px)` +
`border:1px solid rgba(255,255,255,.2)`.

**Opacités du blanc**, utilisées de façon systématique :
1 titres · .88-.84 corps · .78-.72 œil-de-bœuf et méta · .6-.55 texte tertiaire ·
.5 désactivé · .3 bordures · .24 bordures faibles · .16-.08 fonds · .12 fonds de pastille.

**Typographie — Archivo uniquement** (400/500/600/700/800/900) :

| Rôle | Spécification |
|---|---|
| h1 de page | 800 · 38px · `line-height:1.05` · `-.03em` |
| h1 de compte | 800 · 34px · 1.05 · `-.03em` |
| Titre de post à la une | 800 · 40px · 1.05 · `-.035em` |
| h2 de section | 800 · 23-26px · 1.15 · `-.03em` |
| Titre de carte | 800 · 16-24px · 1.1-1.2 · `-.02/-.03em` |
| Titre de post en fil | 800 · 21px · 1.2 · `-.025em` |
| Corps | 500 · 14-15px · 1.6 |
| Corps secondaire | 500 · 12.5-13.5px · 1.55-1.65 |
| Œil-de-bœuf (`.eyebrow`) | 900 · 10px · `letter-spacing:.22em` · majuscules |
| Sous-titre de rail | 900 · 9.5px · `.2em` · majuscules |
| Métadonnées de carte | 600 · 11-11.5px · `.05em` · majuscules |
| Surtitre de marque | 700 · 10.5px · `.14em` · majuscules |
| Pastille de filtre | 700/800 · 11-11.5px · `.07em` · majuscules |
| Bouton | 800-900 · 12-14px |
| Nav | 700 · 12.5px |
| Compteur / rang | 800 · 17-20px · `-.02/-.03em` |
| Légende de placeholder | 600 · 9-10px · monospace · `.12-.14em` · majuscules |

**Espacements** (multiples de 2, échelle réelle) : 2 · 4 · 5 · 6 · 8 · 10 · 12 · 14 · 16 ·
18 · 20 · 22 · 26 · 28 · 32 · 34 · 40 · 44 · 48 · 64 · 80 px.
Padding de scène : `14px 28px 44px`. Gouttière de grille : 12-20px. Gap de colonnes : 26-28px.

**Rayons :** 4px (photo de pièce en `5a` — volontairement presque carré) · 8px (lettre
d'index) · 10-11px (vignette, pastille de couleur) · 12-14px (logo, ligne de rail) ·
13px (champ, `.champ`) · 15px (grande recherche) · 18px (ligne, petite carte) · 20px
(carte, section de verre) · 22px (post à la une) · 24px (avatar) · 26px (scène) ·
999px (pilule).

**Ombres :**
`0 8px 22px rgba(52,18,110,.24-.26), inset 0 1px 0 #fff` carte claire ·
`0 10px 30px rgba(45,15,100,.26), inset 0 1px 0 rgba(255,255,255,.3)` verre ·
`0 14px 34px rgba(52,18,110,.32)` carte mise en avant ·
`0 18px 40px -22px rgba(20,6,50,.9)` photo sans cadre ·
`0 24px 60px -26px rgba(20,6,50,.9)` post à la une ·
`0 16px 42px -12px rgba(44,16,100,.62)` barre de nav ·
`0 40px 90px -30px rgba(20,6,50,.8)` scène (artefact de présentation, à ne pas porter).

**Animations** (durées à multiplier par `--vit`, amplitudes par `--amp`) :
`respire` 18s · `nappe1` 13s · `nappe2` 17s · `balayage` 21s · `float1` 15-17s ·
`float2` 18-20s · `liseré` 26s · `defile` 30s (glyphes) · `invite` 2.1s (chevron).
Toutes en `ease-in-out infinite alternate`, sauf `defile` (`linear infinite`).

## Assets

Repris tels quels de `newave-site/public/brand/` :
`logo-white.webp` (logo complet — nav 28px, manifeste 320px) ·
`mark-white.webp` (monogramme — pied de page 40px) ·
`chrome1.webp`, `chrome2.webp`, `chrome3.webp` (blobs chromés du décor).
Ils sont copiés dans `assets/` de ce bundle **uniquement** pour que les fichiers HTML
s'ouvrent seuls — utiliser les originaux du repo.

**Icônes** — dessinées en SVG inline dans le prototype (trait 2.1-2.2, `linecap:round`,
`linejoin:round`, 13-17px) : entonnoir, loupe, chevrons, œil, cœur (trait et plein),
étoile pleine, shuffle, utilisateur, cercle mi-plein, cadenas, cloche, sortie, flèches,
play, coche, plus, grilles de densité. **Les remplacer par `src/components/Icons.tsx`** —
le site a déjà son jeu, et le commentaire du fichier explique pourquoi (pas d'emoji, un
dessin stable d'un appareil à l'autre).

**Aucune photo.** Tous les visuels sont des placeholders rayés à remplacer.

## Files

| Fichier | Contenu |
|---|---|
| `Annuaire NEWAVE.dc.html` | Écran `2a` — l'annuaire à l'échelle. Contient aussi `1a`, la recréation fidèle de l'annuaire **actuel** (utile comme point de comparaison) et les explorations `1b`/`1c`/`1d`, écartées. |
| `NEWAVE - pages.dc.html` | Écrans `3b` accueil · `5a` pièces · `6b` posts · `7a` classement (voir `12a` qui le remplace) · `7b` favoris · `8a`/`8b` compte · `9a` éditer une marque · `9b` tableau de bord · `9c` liste des marques · `10a` barre publique · `10d` barre du gérant · `11b` modifier sa page · `12a` coups de cœur remasterisée. Les tours antérieurs conservent les pistes écartées ; les intitulés indiquent lesquelles ont été retenues. |
| `assets/` | Les 5 fichiers de marque, pour que les HTML s'ouvrent hors ligne. |
| `support.js` | Runtime des fichiers de design. **Aucun intérêt pour l'implémentation** — ne pas le porter. |

Les deux `.dc.html` s'ouvrent directement dans un navigateur. Ils sont organisés en
« tours » empilés, le plus récent en haut, chaque option portant son badge (`2a`, `3b`…)
et un titre qui résume le parti pris. Les tours antérieurs conservent les pistes écartées,
et les intitulés indiquent lesquelles ont été retenues.

## Ordre d'implémentation suggéré

1. **`2a` l'annuaire** — c'est là que sont la recherche, les facettes à compteurs,
   l'index A→Z et l'aperçu de pièces. Les autres écrans réutilisent ces briques.
2. **`5a` les pièces** — réutilise la colonne de filtres persistante.
3. **`3b` l'accueil** — assemble des composants déjà écrits aux étapes 1 et 2.
4. **`6b` les posts** — indépendant, peu de logique.
5. **`7a`/`7b`** — dépendent de l'aperçu de pièces (étape 1) et du delta hebdomadaire.
6. **`9a` la fiche marque** — c'est l'écran le plus utilisé au quotidien, et le seul qui demande une vraie nouveauté fonctionnelle (la check-list live). `9b` et `9c` en découlent : ils réutilisent `obstacleAPublication()` côté client.
7. **`10a` et `10d` les deux barres** — elles encadrent tous les écrans, autant les poser tôt.
8. **`11b` la retouche en place** — dépend de `10d` (c'est de là qu'on entre en retouche).
9. **`8a`/`8b` le compte** — réorganisation de composants existants, aucune donnée
   nouvelle ; c'est le moins risqué, et il peut passer en premier si tu préfères
   commencer petit.
