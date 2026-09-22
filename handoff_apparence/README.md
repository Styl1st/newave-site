# Spec — Apparence : Composer & Mouvement du fond

Maquette de référence : `Apparence NEWAVE.dc.html`, option **`2a`** (en
haut de la page). Tout ce qui est décrit ici est visible et manipulable
dans cette maquette ; en cas de doute entre ce texte et elle, **c'est
elle qui fait foi** — elle calcule réellement, elle n'illustre pas.

---

## 1. Où ça se passe

| Quoi | Où |
| --- | --- |
| Les deux blocs à refaire | `src/components/ThemePicker.tsx` |
| Le modèle de thème et ses valeurs par défaut | `src/lib/theme.ts` |
| Le fond animé qui consomme `vitesse` / `ampleur` | le fond global, inchangé |
| Le curseur | `src/components/Curseur.tsx` + `globals.css` |

Aucun autre fichier n'est concerné. Le chantier tient dans
`ThemePicker.tsx`, plus un glyphe dans `Curseur.tsx` (§5).

---

## 2. Le modèle ne change pas

```
theme.bg       : [string × 6]   // inchangé
theme.accents  : [string × 3]   // inchangé
theme.vitesse  : number         // inchangé
theme.ampleur  : number         // inchangé, mais plus demandé à l'écran
```

L'interface neuve **écrit les mêmes objets**. Elle demande moins, et
déduit le reste. C'est tout le chantier.

---

## 3. Le bloc Fond

### 3.1 Ce qu'on demande

Trois sélecteurs de couleur, en ligne, à égalité — 62 px de haut, coins
à 15 px, écart de 11 px. Sous chacun son mot, en capitales 11 px :

**Haut** · **Cœur** · **Bas**

Ces trois mots sont le cœur du chantier. Ils disent *où* la couleur
tombe dans la page, ce que « Départ / Transition / Pic » ne disait pas.
Au-dessus, une ligne : « Trois teintes suffisent : le reste du dégradé
se calcule. »

### 3.2 Ce qu'on en déduit

Les six valeurs de `theme.bg`, dans l'ordre :

```
bg[0] = haut
bg[1] = mix(haut,  cœur, 0.55)
bg[2] = cœur
bg[3] = mix(cœur,  #ffffff, 0.16)   // l'ancien « pic », éclairci
bg[4] = mix(cœur,  bas,  0.55)
bg[5] = bas
```

`mix(a, b, t)` est une interpolation linéaire composante par composante
en sRGB — la maquette le fait exactement comme ça, inutile de partir en
OKLCH pour ce cas, les écarts sont invisibles à cette échelle.

Le dégradé rendu reste celui d'aujourd'hui :
`linear-gradient(168deg, bg0 0%, bg1 22%, bg2 44%, bg3 62%, bg4 82%, bg5 100%)`.

### 3.3 Le repli « Voir les six teintes »

Un bouton texte, 44 px de haut, chevron à gauche. Il ouvre une grille de
six pastilles de 34 px, **en lecture seule**, avec la phrase « Calculées
depuis les trois teintes, du haut vers le bas. »

C'est là pour la confiance, pas pour le réglage : on montre qu'on n'a
rien caché. Ne pas les rendre éditables (voir le brief).

### 3.4 Les Halos

Le mot **Halos** reste, avec sa phrase « Les lumières qui dérivent. » et
ses trois pastilles rondes de 44 px à droite, sur une ligne séparée par
un filet. Ce sont `theme.accents`, tels quels, dans l'ordre.

On a essayé de les dériver eux aussi : c'était pire. Les accents sont ce
qu'on remarque en premier sur la page, les retirer du contrôle direct
donne l'impression que le thème décide à ta place. Trois pastilles et un
mot juste suffisent.

---

## 4. Le bloc Mouvement

### 4.1 Ce qu'on demande

Un titre **Mouvement**, avec à sa droite le nom de l'état courant en
gras — c'est le retour de lecture. Puis **une seule barre**, 0 → 100,
pas de 1, rail de 6 px, poignée blanche de 24 px. Sous la barre, les
quatre mots à intervalle régulier :

**FIGÉ** · **DOUX** · **ANIMÉ** · **VIF**

Ils sont cliquables (32 px de hauteur de frappe) et ils s'allument selon
la valeur — le mot actif passe en blanc plein, les autres restent à
`rgba(255,255,255,.68)`. Une ligne dessous : « Tout à gauche, le fond ne
bouge plus. »

Les paliers : `Figé = 0`, `Doux = 22`, `Animé = 55`, `Vif = 88`.
Les seuils de nommage : `0` → Figé, `< 34` → Doux, `< 71` → Animé,
sinon Vif.

### 4.2 Ce qu'on en déduit

```
si v === 0 :  vitesse = 0      ampleur = 0
sinon      :  vitesse = 0.35 + (v / 100) × 2.2
              ampleur = 0.40 + (v / 100) × 1.1
```

L'ampleur suit la vitesse. C'est le pari du chantier, et il tient : dans
les faits, personne ne veut un fond qui bouge vite et à peine, ou
lentement et énormément. Les deux réglages décrivaient une seule
sensation. Si un cas d'usage prouve le contraire plus tard, la donnée
est toujours là pour rouvrir un réglage fin.

### 4.3 L'aperçu

Au-dessus du bloc Fond, un aperçu de 168 px de haut, coins à 22 px :
le dégradé calculé, les trois halos flous en `blur(26px)` qui dérivent
en boucle alternée, et **une barre de navigation en réduction** posée
dessus (verre dépoli, logo, un bouton blanc).

Cette barre compte : sans elle on juge un dégradé, avec elle on juge le
fond *de son site*. La durée d'animation est `13s / vitesse`, et
`animation-play-state: paused` quand la vitesse est nulle.

---

## 5. Le curseur

Deux choses à ajouter à `Curseur.tsx`, dans la famille existante
(`fleche`, `main`, `poing`) et au même traitement — remplissage
`--color-ink`, contour blanc 2.6, `paint-order: stroke` :

- **`doigt`** — index tendu, la pointe sur le point visé. Il ne
  remplace **pas** la flèche sur tout ce qui se clique : il ne paraît
  que sur ce qu'on *choisit* du doigt, ici les six pastilles de couleur.
  Les boutons, liens et replis gardent la flèche, qui grossit de 20 %.
  Dans la maquette, l'élément le déclenche par un attribut
  `data-doigt` ; côté site, un modificateur sur l'élément fait pareil.
- **`regler`** — double flèche horizontale, sur la barre de mouvement
  et sur tout `input[type=range]`.

Les deux prennent la **teinte de l'ambiance assombrie** quand ils sont
actifs, comme la flèche aujourd'hui : dans la maquette,
`mix(accent[2], ink, 0.55)`, recalculé à chaque changement de couleur —
le curseur change donc avec le fond.

---

## 6. Le cas des thèmes existants

Le seul point ouvert, à trancher ensemble avant de coder.

Un thème enregistré avant ce chantier a six couleurs libres, qui ne
sont pas forcément l'interpolation de trois d'entre elles. À
l'ouverture de l'interface neuve :

- **`bg[0]`, `bg[2]`, `bg[5]` alimentent Haut, Cœur, Bas.** C'est direct
  et fidèle pour l'écrasante majorité des thèmes, qui ont été faits à la
  souris en suivant une progression.
- Mais tant que l'utilisateur ne touche à rien, **on n'écrit rien** : le
  thème reste affiché avec ses six valeurs d'origine. Ce n'est qu'au
  premier changement d'une des trois teintes qu'on recalcule les six et
  qu'on enregistre.

Autrement dit : on ne réécrit jamais un thème que l'utilisateur n'a pas
touché. S'il y touche, il accepte le nouveau modèle — et le repli des
six teintes lui montre ce qui a changé.

À voir avec toi : si le thème d'origine s'écarte beaucoup de ce que
l'interpolation produirait, faut-il le dire ? Mon avis est non — ça
ajoute une alerte pour un cas rare, et le repli suffit. Mais c'est un
appel produit, pas technique.

---

## 7. Récapitulatif de ce qui disparaît de l'écran

- Les six libellés Départ / Transition / Cœur / Pic / Retour / Fin
- Six sélecteurs de couleur sur neuf
- Le mot « nappes »
- Le curseur **Ampleur** et sa phrase « Une ampleur à zéro fige tout »
- Les quatre pastilles de mode de mouvement, fondues dans la barre
- Le bouton « Enregistrer ce réglage » — l'apparence se garde toute
  seule, comme le reste de l'onglet

Rien de tout cela ne disparaît des **données**.
