# Spec — `/compte` et `/admin` sur téléphone

Maquette de référence : `Compte mobile NEWAVE v2.dc.html` (page
autonome, s'ouvre dans un navigateur). Deux écrans retenus :

| Marque | Écran | Ce qu'il montre |
| --- | --- | --- |
| `1b` | Le compte | hub à tuiles, page « Mon compte », Apparence à deux niveaux |
| `1d` | L'administration | console, barre de pied à cinq places, liste, pile, fiche en étapes |

Les pistes écartées (hub à sous-écrans, feuilles) sont restées dans
`Compte mobile NEWAVE.dc.html`, hors de ce dossier — pas à implémenter.

---

## 1. Périmètre

**Concerné** : rendu téléphone de `/compte` et du gabarit `/admin`.

**Non concerné** : tout ce qui est `lg:` et au-delà. Le rail de 250 px
de `CompteEcran`, la barre d'admin sur un rang, la double colonne de
`ThemePicker` (`xl:`) restent tels quels.

**Aucun changement de données.** Pas de migration, pas de nouvelle
action serveur, pas de nouveau champ. `updateDisplayName`,
`enregistrerApparence`, `lireApparenceDuCompte`, `getManagedBrands`,
`getFavoriteBrands` sont appelés exactement comme aujourd'hui.

---

## 2. Le compte (`1b`)

### 2.1 Le hub

De haut en bas :

1. **Bandeau d'identité compact** — pastille 46 px (rayon 16),
   nom 17 px/800, e-mail 12,5 px/600 à 55 % de blanc, badge de rôle à
   droite. Pas de titre « Ton compte » en gros : la page est déjà
   nommée par la navigation.
2. **« Mes espaces »** en tuiles, grille `1fr 1fr`, gouttière 11 px.
   Tuile : hauteur mini 124 px, rayon 20, fond
   `linear-gradient(160deg,#fff,#f4efff,#e6dcfb)`, ombre
   `0 10px 26px -8px rgba(52,18,110,.45)` — c'est `.card-light`.
   Contenu : icône 34 px en haut à gauche, **compteur en 26 px/900** en
   haut à droite, libellé 15,5 px/800 et note 10 px/700 en capitales en
   bas.
   **Parité** : en nombre impair, la dernière tuile prend les deux
   colonnes (`grid-column: span 2`). Un membre simple n'a qu'une tuile
   (les favoris) et c'est le cas le plus fréquent du site : sans cette
   règle, il voit un trou qui se lit comme une case manquante.
3. **« Réglages »** — une carte de verre, trois lignes de 60 px mini
   séparées par un filet `1px solid rgba(255,255,255,.12)` :
   - **Mon compte** → page 2.2. Sous-titre « Nom, email, mot de passe ».
   - **Apparence** → page 2.3. La vignette de gauche (34 px, rayon 11)
     porte **le dégradé de l'ambiance en cours** ; le sous-titre dit
     l'état courant, `« <ambiance> · <clair|sombre> »`.
   - **Notifications** — inerte, 40 % de blanc, pastille « À venir ».
4. **Se déconnecter** — bouton pleine largeur, 52 px, rayon 16, bordure
   `rgba(255,255,255,.3)`, fond `rgba(255,255,255,.09)`.

La suppression de compte n'est plus ici : elle descend au bas de la page
2.2, en lien discret. Elle a besoin de l'adresse pour la faire recopier,
donc elle vit là où l'adresse est affichée.

### 2.2 Page « Mon compte »

Une seule page pour ce qui était deux. Bouton retour en pilule 44 px
(icône `IconBack`), puis **le visuel d'en-tête** (§2.4), puis :

- **Nom affiché** — champ 50 px, rayon 14, bordure
  `rgba(255,255,255,.24)`, fond `rgba(255,255,255,.09)`, texte 15,5 px.
- **Adresse email** — même champ. Note dessous :
  « Il faudra ouvrir un lien dans l'ancienne boîte et un dans la
  nouvelle. » **Ce texte n'est pas décoratif** : `AccountForms.tsx`
  explique que sans lui, quelqu'un ouvre un seul lien, voit que rien n'a
  bougé, et écrit au support.
- **Mot de passe** — une ligne, pas un formulaire : libellé + phrase
  « On t'envoie un lien par mail » + bouton « Envoyer » (44 px, pilule
  blanche). Le flux serveur est inchangé (`LienReinitialisation`).
- **Supprimer mon compte** — lien souligné, 12,5 px, 45 % de blanc.
- **Barre d'enregistrement collante** en bas : dégradé
  `rgba(20,8,52,0) → rgba(20,8,52,.82)`, `backdrop-filter: blur(10px)`,
  bouton blanc 52 px.

> Attention : le nom et l'adresse partent vers **deux endroits
> différents** — la base pour le nom, Supabase Auth pour l'adresse — et
> n'échouent pas ensemble. Le commentaire de `compte/page.tsx` dit
> pourquoi il y avait deux boutons. Si tu n'en gardes qu'un, il faut
> deux messages d'état distincts sous les champs concernés ; une seule
> ligne « Enregistré » mentirait dans la moitié des cas.

### 2.3 Apparence, à deux niveaux

**Niveau 1, visible :**

- **Aperçu collant** en haut, 150 px, rayon 22 — il ne défile pas avec
  les réglages. On juge une couleur en même temps qu'on la choisit.
- **Sombre / Clair** en segmenté, deux parts égales, 42 px mini.
- **Ambiances** en grille `1fr 1fr`, vignette 70 px + nom 13 px. La
  sélection est un anneau `0 0 0 2px #fff` plus une coche.
- **« Composer la mienne »** — ligne en tirets vers le niveau 2.

**Niveau 2, « Composer » :** six teintes de fond (grille de 3,
hauteur 56 px), trois nappes, puis les deux curseurs Vitesse et Ampleur
et la phrase « Une ampleur à zéro fige tout ». C'est le contenu actuel
de `ThemePicker`, simplement sorti du premier écran.

Les réglages fins — enregistrer une ambiance sous un nom, les presets de
mouvement, « Revenir aux réglages par défaut » — restent au niveau 2.

### 2.4 Le visuel d'en-tête des deux catégories

Les deux pages s'ouvrent sur **un bloc de 150 px, rayon 22**, à la place
du gros titre. Même géométrie, même ombre
(`0 14px 34px -10px rgba(45,15,100,.55)`), bordure
`1px solid rgba(255,255,255,.22)` : c'est ce qui fait que les deux
catégories se ressemblent sans se confondre.

**Mon compte** — fond : le chrome de `--chrome-edge` de `globals.css`,
repris au caractère près, sous un voile
`linear-gradient(170deg, rgba(20,8,52,.68), rgba(20,8,52,.78) 52%, rgba(20,8,52,.92))`.
Le voile commence sombre **parce que le chrome commence par du blanc pur
en haut à gauche**, exactement là où se pose l'œil-de-bœuf ; plus clair,
le libellé tombe sous le rapport de contraste exigé.
Dessus : œil-de-bœuf « MON COMPTE » en 9,5 px/900 blanc pur, badge de
rôle à droite, et en bas une plaque 58 px (rayon 18) portant l'initiale
en 23 px/900.

**La plaque porte le dégradé d'accents, pas celui du fond :**
`linear-gradient(140deg, rgba(232,111,216,.5), rgba(90,114,224,.44))`
— celui de `compte/page.tsx`, donc en production
`rgba(var(--accent-1),.5)` / `rgba(var(--accent-2),.44)`. Avec le
dégradé du thème, une ambiance claire lavait le monogramme, et le même
compte se retrouvait peint de deux façons entre le hub et cette carte.

**Apparence** — fond : le dégradé de l'ambiance choisie, comme l'aperçu
de `ThemePicker`. Œil-de-bœuf « APPARENCE » **sur sa propre pastille
`rgba(8,2,30,.42)`** : le fond est choisi par la personne, et une
ambiance claire effacerait un libellé posé à même le dégradé. C'est
exactement ce que fait déjà le label « Aperçu » de `ThemePicker.tsx`.
À droite, une pastille avec l'état courant ; en bas, la mini-barre de
nav (logo + bouton blanc) qui sert à juger le contraste sur un bouton
plutôt que sur un aplat.

---

## 3. Vocabulaire visuel

Tout vient du site ; rien n'est inventé.

- **Carte de verre** : `rgba(8,2,30,.5)` + voile
  `linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,0) 52%)`
  + `backdrop-filter: blur(24px) saturate(1.5)` + bordure
  `rgba(255,255,255,.16)` + ombre `0 14px 36px -14px rgba(44,16,100,.6)`.
  Rayon 18 pour les cartes de liste, 20-22 pour les visuels.
- **Œil-de-bœuf de groupe** : 9,5 px/900, `letter-spacing: .2em`,
  capitales, 60-65 % de blanc.
- **Ligne de liste** : 56-60 px de haut minimum, icône 34 px en
  rayon 11 sur `rgba(255,255,255,.13)`, libellé 15 px/700, valeur
  courante 12,5 px/600 à 50 %, chevron 16 px à 42 %.
- **Cible tactile** : 44 px minimum, partout. C'est la raison d'être de
  `min-h-11` dans le code existant.
- **Type** : Archivo, comme le site. Jamais en dessous de 11,5 px, et
  seulement pour une note.

---

## 4. L'administration (`1d`)

### 4.1 La barre de pied

Cinq places, pilule fixée : `left:12px; right:12px; bottom:22px`,
rayon 22, rembourrage 7, fond `rgba(8,2,30,.7)` + voile clair +
`backdrop-filter: blur(28px) saturate(1.6)`. Chaque onglet fait 54 px
mini, icône 19 px au-dessus du libellé 9,5 px/800. L'onglet actif est
**blanc sur encre** (`#fff` / `#170a33`), les autres à 68 % de blanc.

| Place | Icône | Va vers |
| --- | --- | --- |
| Bord | `IconGrid` | `/admin` |
| Marques | `IconTag` | `/admin/marques` |
| Posts | `IconImage` | `/admin/posts` |
| Pile | `IconInbox` | candidatures + signalements, badge de compte |
| Plus | `IconPlus` | feuille : Comptes, Catalogues, Fréquentation, Déconnexion |

L'onglet Marques reste allumé quand on est sur une fiche : une fiche est
un détail de la liste, pas une sixième destination.

**Le badge de « Pile » est la moitié du chantier.** Il porte la somme
candidatures non traitées + signalements ouverts. C'est ce qui fait
qu'un signalement ne peut plus passer inaperçu.

### 4.2 Le point à vérifier avant de coder

Le commentaire de `.barre-pied` interdit une pilule fixée en bas. Mon
raisonnement : l'objection portait sur la lecture d'un post, où la zone
du bas est déjà prise par `ProgressionLecture` et où un élément fixe
intercepte le geste. L'admin n'a ni l'un ni l'autre. **Vérifie-le sur un
vrai téléphone** — iOS Safari avec la barre d'adresse qui se réduit est
le cas qui casse d'habitude. Si ça ne tient pas, la solution de repli est
la même barre en `sticky bottom-0` dans le conteneur de page.

### 4.3 Le tableau de bord

- Titre « Console », sous-titre qui **compte ce qui attend** :
  « Six choses attendent une décision. »
- **« La file »** — une carte `.card-light` par pile : pastille de
  couleur, titre, **compte en 26 px/900**, la phrase de `anciennete()`
  (« la plus ancienne attend depuis 11 jours »), et un bouton encre
  pleine largeur. Les phrases existent déjà dans `admin/page.tsx`, on ne
  les réécrit pas.
- **« L'état du site »** — grille `1fr 1fr`, quatre compteurs :
  chiffre 24 px/900, libellé 10 px en capitales.
- **Fréquentation** — une ligne, pas un graphique. On l'ouvre quand on
  la cherche.

### 4.4 Les listes

Recherche et filtres **collants en haut**, la liste défile dessous :

- champ de recherche 14 px de rayon, qui dit le volume
  (« Chercher dans 136 fiches… ») ;
- **une seule rangée** de pastilles de filtre qui défile latéralement —
  ici le défilement est acceptable parce que le premier filtre est le
  plus utile et que rien n'y est caché d'essentiel ;
- un compte au-dessus de la liste (« 17 brouillons ») ;
- ligne de 66 px : vignette 42 px, nom 14,5 px/800, puis **pastille
  d'état + phrase d'obstacle** (« brouillon · sans visuel »). La phrase
  vient de `obstacleAPublication()`, résumée comme le fait déjà
  `RESUME_OBSTACLE` — **pas d'une seconde définition de « publiable »**.
  `publication.ts` explique pourquoi il n'en existe qu'une.

### 4.5 La pile

Deux groupes sur un écran. Candidatures : une ligne par dossier avec la
phrase d'ancienneté et **deux boutons 44 px** (accepter / refuser,
`IconCheck` / `IconCross`, avec `aria-label`). Signalements : cadre
rouge `rgba(194,39,63,.18)`, fanion `IconDrapeau`, nature et nombre.

Le geste accepter/refuser directement dans la liste est à confirmer :
si la décision demande de lire le dossier, le bouton doit ouvrir la
candidature, pas la trancher.

### 4.6 La fiche en étapes

Au lieu d'un formulaire de trois écrans : une rangée d'étapes qui défile
(Identité · Visuels · Catalogue · Publication), **chacune avec une
pastille verte ou rouge** selon qu'elle est complète. Sous la rangée,
l'obstacle à la publication en clair. En bas, barre collante :
« Enregistrer » (blanc) + « Publier » (désactivé tant qu'il reste un
obstacle).

La pastille et le blocage viennent tous les deux de
`obstacleAPublication()`. Même source, même verdict : un bouton
« Publier » actif sur une fiche non publiable est pire que pas de bouton.

---

## 5. Invariants — à ne pas casser

1. **`grid-cols-[minmax(0,1fr)]` dès le premier palier.** Une colonne
   implicite est dimensionnée en `auto`, donc à la largeur de son
   contenu le plus large. C'est ce qui a fait déborder la page entière
   une fois. Vaut pour `CompteEcran` et pour `ThemePicker`.
2. **Les curseurs n'appliquent rien pendant le glissement.** Valeur
   retenue en état local, posée au relâchement, décor en pause via
   `data-reglage`. Raison : un clignotement répété est un risque pour
   les personnes photosensibles.
3. **L'écriture vers le compte est temporisée** (700 ms) et la copie
   locale est toujours tenue à jour : c'est elle qui peint les bonnes
   couleurs avant que le JavaScript démarre.
4. **Le compte fait foi sur le stockage local** pour l'apparence. Le
   local ne reprend la main que pour un visiteur sans compte.
5. **Les volets ne se démontent pas** au changement d'onglet — sinon
   « Enregistré. » disparaît à l'instant où il s'affiche.
6. **Notifications reste hors du `tablist`** : l'y laisser ferait
   annoncer « onglet 3 sur 3 » pour une ligne morte.
7. **Le rayon de `.card-light` se pose en ligne** (`style`), pas en
   classe Tailwind : la classe déclare le sien hors couche CSS.
8. **Les icônes viennent de `Icons.tsx`.** Correspondances retenues :
   identité → `IconUser`, apparence → `IconImage`, mot de passe →
   `IconInbox` (le flux est un lien par mail), notifications →
   `IconClock` (« À venir »), favoris → `IconCoeur`, espace marque →
   `IconTag`, administration → `IconGrid`, retour → `IconBack`,
   recherche → `IconLoupe`.
9. **Les cibles tactiles à 44 px**, y compris les pastilles de couleur
   et les boutons de la pile.
10. **108 px de rembourrage bas** sur toute liste d'admin qui passe sous
    la barre de pied, 110 px sur une page à barre d'enregistrement.

---

## 6. Fichiers à prendre, dans l'ordre

1. `src/components/CompteEcran.tsx` — le plus gros morceau. Le rail
   devient un hub sur téléphone et garde sa colonne à partir de `lg`.
   L'état d'onglet reste, mais sur téléphone il désigne une page.
2. `src/app/compte/page.tsx` — `raccourcis` ne se rend plus deux fois ;
   le volet Profil se coupe en « Mon compte » et le visuel d'en-tête
   apparaît. La liste `espaces` reste construite une seule fois.
3. `src/components/ThemePicker.tsx` — coupe en deux niveaux. Rien de la
   logique ne change : ni `poser()`, ni `ajuster()`, ni `relacher()`.
4. `src/app/admin/layout.tsx` — barre de pied à cinq places sur
   téléphone, barre du haut conservée à partir de `lg`.
5. Nouveau : la page « Pile » (candidatures + signalements réunis). Elle
   lit `adminGetApplications()` et `getSignalements()`, déjà appelés par
   `admin/page.tsx`.
6. `src/components/admin/BrandBulkList.tsx` et les listes sœurs —
   recherche et filtres collants, lignes de 66 px.
7. `src/components/editeur/EditeurFiche.tsx` — la fiche en étapes.

### 6.1 Le point à trancher

Aujourd'hui les deux volets restent montés et l'on masque celui qu'on ne
regarde pas (invariant 5). Un hub qui pousse des sous-pages voudrait
plutôt démonter. **Ma proposition : garder les volets montés et ne
déplacer que l'affichage** — le hub et les pages sont des états d'un même
composant, pas des routes. Ça préserve l'invariant sans rien réécrire
de `ThemePicker`. Si tu préfères de vraies routes (`/compte/apparence`),
dis-le : c'est plus propre côté navigation, mais il faut alors régler la
perte du message « Enregistré » autrement.

---

## 7. Ce qu'on ne fait pas dans ce chantier

- Les notifications. Rien ne les enregistre ; la ligne reste inerte.
- Les vues enregistrées de l'écran `9c` (le paramètre d'adresse posé
  dans `admin/page.tsx` n'est toujours pas lu).
- Le grand écran, sous toutes ses formes.
- Le balayage pour valider/refuser dans les listes : envisagé, pas
  retenu pour ce tour. Deux boutons visibles d'abord.
