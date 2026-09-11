# Index alphabétique au doigt — spécification

Un seul chantier pour `newave-site` : sur téléphone, le rail A→Z du bord
droit de `/marques` disparaît et devient **un bouton sous le pouce + une
feuille**. Option `2a` de `Index alphabet NEWAVE.dc.html`, dans ce dossier.

La maquette s'ouvre directement dans un navigateur, il n'y a rien à
installer. Elle est la référence visuelle ; ce document est la référence
de comportement. En cas de contradiction, ce document gagne.

> ⚠️ Ce chantier **annule le §2.6 « Le mobile ne bouge pas »** du brief
> précédent (`handoff_curseur_barre`). La barre « requête » et l'index
> justifié du grand écran, déjà livrés, ne sont pas touchés ici : tout ce
> qui suit est sous `sm`.

---

## 1. Le problème

Le rail actuel (`IndexAlphabet` dans `BrandGrid.tsx`, l. 417) empile
vingt-sept boutons de 22 px dans une pilule fixée au bord droit. Trois
conséquences, toutes mesurables :

1. **Il défile sur lui-même.** `max-h-[calc(100svh-150px)]` +
   `overflow-y-auto` : dès qu'un téléphone est court (iPhone SE, ou
   n'importe quel écran avec la barre d'URL dépliée), les dernières
   lettres passent hors de la pilule. Une liste qui défile dans une
   liste qui défile est le geste le plus raté du mobile.
2. **Il coûte une gouttière de 30 px en permanence**, posée à quatre
   endroits différents (§6), y compris sur des éléments qui n'ont rien à
   voir avec l'index.
3. **Une cible de 22 px**, quand la recommandation tactile est 44.
   Sur un « W » de onze pixels de large, l'erreur de visée est la règle.

## 2. Le principe retenu

**Rien ne change dans la liste.** Les grands titres de lettre restent où
ils sont, le filtrage reste un filtrage (il ne fait pas défiler), l'ordre
alphabétique du mode liste reste la condition de l'index.

**Seul le rail disparaît.** À sa place, un bouton unique en bas à droite
qui porte la lettre posée — ou « A–Z » au repos. On le touche, l'alphabet
monte en feuille : vingt-sept cibles de 44 px, **toutes visibles quelle
que soit la hauteur d'écran**, puisqu'une grille de sept colonnes sur
quatre rangées tient dans 200 px.

Le geste devient celui d'un menu, pas d'une visée. Et il est déjà dans le
site : c'est exactement le couple bouton + feuille de la vitrine
(`PieceDirectory.tsx`, l. 893).

## 3. Ce qui ne change pas — les invariants

Rien de cette liste ne doit bouger. Chaque point est le résultat d'une
correction antérieure ; les commentaires du code en disent la raison.

- **Une lettre filtre, elle ne fait pas défiler** (`allerA`, `BrandGrid.tsx`).
  Sauter à « W » obligeait à charger les cent quarante marques qui
  précèdent, et Safari vidait l'onglet. Ne pas « améliorer » ça en
  `scrollIntoView`.
- **L'ordre alphabétique en mode liste**, et le mélange dans les autres
  densités.
- **Les lettres vides restent visibles mais éteintes**, non cliquables.
  Les retirer ferait glisser les suivantes sous le doigt d'une recherche
  à l'autre.
- **La lettre retombe à `null` quand les filtres changent** (l'effet sur
  `[brands]`), sauf au premier rendu — `?lettre=a` doit survivre au
  chargement.
- **`?lettre=` dans l'adresse**, tenue par `BrandDirectory` et passée en
  `lettre` / `onLettre`. Un lien partagé rouvre le même écran.
- **L'index n'existe qu'en densité `liste`.** Il est rendu dans la
  branche `densite === "liste"` de `Grille` : la condition est déjà là,
  ne pas la redoubler.
- **`prefers-reduced-motion`** coupe l'animation d'entrée de la feuille,
  pas la feuille.

## 4. Le bouton

Rendu **uniquement sous `sm`** (voir §7 sur le comment), au-dessus de la
liste.

- Position : `fixed`, `right: calc(env(safe-area-inset-right, 0px) + 16px)`,
  `bottom: calc(env(safe-area-inset-bottom, 0px) + 20px)`. La même
  formule que le bouton « Filtres » de la vitrine — les deux ne se
  croisent jamais (un est à droite, l'autre centré, et ils ne sont pas
  sur la même page).
- `z-40`. Au-dessus de la liste, **sous** les feuilles (`z-[80]`) : quand
  la feuille de recherche ou celle des filtres s'ouvre, le voile le
  recouvre, il n'y a pas de condition à écrire.
- Géométrie : hauteur **54 px**, `padding: 0 8px 0 20px`, rayon `999px`,
  fond blanc plein, encre `var(--color-ink)`.
- Le libellé : Archivo **900, 19 px**, `letter-spacing: -.01em`. Il porte
  la lettre posée, ou **« A–Z »** au repos. Le tiret est un demi-cadratin
  et l'espace un insécable.
- À droite, un rond de **38 px** en `var(--color-ink)`, icône trois
  barres blanches (17 px, `stroke-width: 2.4`, la dernière plus courte).
  C'est ce rond qui dit « ça ouvre quelque chose » ; sans lui le bouton
  se lit comme une étiquette.
- Ombre : reprendre celle de la vitrine,
  `0 14px 34px -10px rgba(12,3,36,.9)`, et `active:scale-[.97]`.
- **Il s'efface quand le menu de téléphone est ouvert**, comme la
  progression de lecture : `html[data-menu="1"] &  { opacity: 0 }` — ou
  la classe utilitaire équivalente. Un bouton blanc flottant par-dessus
  le menu plein écran est le genre de détail qu'on ne voit qu'en recette.
- Accessibilité : `aria-haspopup="dialog"`, `aria-controls` = l'`id` de
  la feuille, `aria-expanded`, et un `aria-label` explicite — « Aller à
  une lettre » au repos, « Lettre W — changer » quand une lettre est
  posée. Le libellé visuel seul (« W ») ne dit rien hors contexte.

**Mode clair** (`html[data-clair="1"]`) : un bouton blanc sur un fond
devenu clair perd son contour. Lui donner
`border: 1px solid rgba(34,16,70,.12)` et l'ombre
`0 14px 30px -12px rgba(34,16,70,.28)`. À vérifier avant la revue.

## 5. La feuille

**Réutiliser `feuille/FeuilleFiltres.tsx`. Ne pas en écrire une seconde.**
Ce composant porte le geste « tirer vers le bas pour refermer », qui a
coûté cher à faire marcher (écouteurs `touchmove` non passifs, cf. son
en-tête) ; une deuxième copie divergerait en six mois. Il donne aussi le
portail, le voile, `Échap`, le blocage du défilement du corps et la
poignée.

```tsx
<FeuilleFiltres
  ouvert={auDoigt && feuille}
  onFermer={() => setFeuille(false)}
  id="index-alphabet"
  titre="Aller à une lettre"
  pied={/* voir plus bas */}
>
  …
</FeuilleFiltres>
```

**Une seule modification au composant** : ajouter un `titre?: string`
(défaut `"Filtres"`) utilisé pour son `aria-label`. Une feuille d'index
annoncée « Filtres » est un contresens pour un lecteur d'écran. Rien
d'autre ne bouge dans ce fichier.

**Contenu**, dans l'ordre :

1. Une ligne d'en-tête : **« ALLER À LA LETTRE »** en Archivo 900 `10px`,
   `letter-spacing: .2em`, capitales, `rgba(255,255,255,.72)` ; à droite,
   **« Tout afficher »** en Archivo 700 `12.5px`, blanc, souligné,
   `text-underline-offset: 3px`. Ce bouton appelle `onTout` et referme.
   Il n'apparaît que si une lettre est posée.
2. **La grille** : `grid-template-columns: repeat(7, 1fr)`, `gap: 6px`.
   Vingt-sept cellules, `height: 44px`, rayon `12px`, Archivo 800 `15px`,
   centrées. Trois états :

   | | fond | encre |
   |---|---|---|
   | lettre posée | `#fff` | `var(--color-ink)` |
   | disponible | `rgba(255,255,255,.12)` | `#fff` |
   | vide | `rgba(255,255,255,.03)` | `rgba(255,255,255,.24)` |

   Les vides sont `disabled`, `cursor: default`, et gardent leur place.
3. **La légende**, en Archivo 700 `10.5px`, `letter-spacing: .1em`,
   capitales, `rgba(255,255,255,.55)`, centrée : « Les lettres pâles
   n'ont aucune marque avec ces filtres ». C'est le seul endroit qui
   explique que l'alphabet suit les filtres — sur grand écran elle est
   déjà là (`hidden sm:block` dans `IndexAlphabet`), au doigt elle passe
   dans la feuille. Retirer le `hidden` ne suffit pas : c'est le même
   texte, rendu à deux endroits différents selon la forme.

**Le pied** est le slot obligatoire de `FeuilleFiltres`. Il porte
**« Voir les N marques »** — le compte de ce que la page affiche derrière,
comme sur la vitrine et sur les filtres de l'annuaire. Il ne fait que
refermer.

**Toucher une lettre referme la feuille** et pose le filtre dans le même
geste. Pas de validation : le pied est une sortie, pas une étape.
Re-toucher la lettre déjà posée la retire (comportement actuel de
`allerA`, conservé) et referme aussi.

## 6. La gouttière de 30 px — à retirer

Le rail parti, `pr-[30px]` / `mr-[30px]` n'ont plus d'objet. Ils sont à
**quatre** endroits, et il faut les quatre — un seul oublié laisse une
marge droite que plus rien ne justifie :

| Fichier | Ligne env. | À retirer |
|---|---|---|
| `BrandGrid.tsx` | 305 | `pr-[30px] sm:pr-0` sur le `<h2 id="lettre-…">` |
| `BrandGrid.tsx` | 320 | `pr-[30px] sm:pr-0` sur le `div.ligne-eco` |
| `BrandGrid.tsx` | 357 | `enListe ? "mr-[30px]" : ""` sur `.barre-pied` — et l'`enListe` devenu inutile avec, s'il ne sert plus à rien d'autre |
| `BrandDirectory.tsx` | 903 | `densite === "liste" ? "mr-[30px] sm:mr-0" : ""` sur le bloc de la barre |

Les commentaires qui les expliquent partent avec.

**Dans `globals.css`** : supprimer le bloc `.rail-index` (l. 1798), son
`@media (min-width: 640px)` (l. 1804) et l'override
`html[data-clair="1"] .rail-index` (l. 2033). La rangée du grand écran
n'a plus de matière à annuler, elle n'a donc plus besoin de la classe.

**Le commentaire de `.barre-pied`** dit « une pilule fixée en bas
recouvrirait en permanence la dernière ligne de la liste, et croiserait
la zone sensible de `ProgressionLecture` ». Les deux objections tombent,
mais pour des raisons à vérifier plutôt qu'à croire :

- La zone de `ProgressionLecture` fait 14 px et n'est
  `pointer-events: auto` que sous `@media (pointer: fine)` — au doigt
  elle n'intercepte jamais rien. Le bouton est 20 px au-dessus d'elle.
- Le bouton recouvre bien la dernière ligne : c'est pour ça que la liste
  garde un `padding-bottom` généreux. Prévoir **96 px** de rembourrage
  bas sur la colonne en mode liste au doigt (la maquette en a 96), ou le
  poser sur le pied de pagination. Sans ça, la dernière marque est sous
  le bouton et on ne peut pas l'atteindre.

## 7. Une seule balise, ou deux ? — le point à trancher proprement

`IndexAlphabet` rend aujourd'hui **les mêmes boutons** dans les deux
formes, redressés par les classes. Le commentaire dit pourquoi : rendre
deux fois vingt-sept lettres ferait annoncer cinquante-quatre boutons aux
lecteurs d'écran.

Ce chantier casse cette unité, puisque les deux formes ne sont plus la
même chose. La règle devient donc : **une seule des deux formes est
rendue à la fois, et c'est le JavaScript qui décide**, pas un
`hidden sm:block`.

Reprendre le mécanisme qui existe déjà dans `BrandDirectory` (l. 313) —
`matchMedia` + état `auDoigt`, avec le même point de bascule — plutôt que
d'en inventer un autre. En pratique, le plus simple est que
`BrandDirectory` passe `auDoigt` à `BrandGrid`, qui le passe à
`IndexAlphabet` : l'information est déjà calculée une fois, au bon
endroit, et on évite un deuxième écouteur de redimensionnement.

Côté lecteur d'écran, le résultat est meilleur qu'aujourd'hui : au doigt
il n'y a plus vingt-sept boutons dans la page, il y en a un — et
vingt-sept dans un dialogue, qui n'existent que pendant qu'il est ouvert.

## 8. Le compte par lettre dans les titres

La maquette ajoute, à droite de chaque grand titre de lettre, le compte
du groupe : « 3 MARQUES », Archivo 700 `10px`, `letter-spacing: .12em`,
capitales, `rgba(255,255,255,.45)`, aligné sur la ligne de base du titre.

C'est le seul ajout visuel de ce chantier, et il a une raison : le rail
parti, plus rien ne dit l'épaisseur des groupes pendant qu'on descend.
Le titre devient `flex justify-between items-baseline`.

À livrer avec le reste, mais **isolable** : si le temps manque, c'est ce
qui se coupe.

## 9. Fichiers concernés

| Fichier | Ce qui change |
|---|---|
| `components/BrandGrid.tsx` | `IndexAlphabet` : la forme au doigt devient bouton + feuille ; la rangée du grand écran est inchangée. Les deux `pr-[30px]` et le `mr-[30px]` du pied partent. Le titre de lettre gagne son compte (§8) |
| `components/feuille/FeuilleFiltres.tsx` | **un seul ajout** : `titre?: string` pour l'`aria-label`. Le geste, le voile, le portail : rien |
| `components/BrandDirectory.tsx` | le `mr-[30px]` de la barre part ; `auDoigt` descend dans `BrandGrid` (§7) |
| `app/globals.css` | les trois blocs `.rail-index` partent |

`useRecherche.ts`, `Suggestions.tsx`, `Jeton.tsx`, `densite.tsx`,
`FeuilleRecherche.tsx` : **rien**. Si un diff les touche, c'est qu'on est
parti trop loin.

## 10. Ordre d'implémentation

1. Le `titre` de `FeuilleFiltres`. Deux lignes, aucun risque.
2. Le bouton seul, qui ouvre une feuille contenant la grille — sans
   toucher au rail. Les deux coexistent un instant : c'est laid, mais ça
   permet de comparer les deux gestes sur un vrai téléphone avant de
   supprimer quoi que ce soit.
3. Retirer le rail et les quatre gouttières (§6) + le rembourrage bas.
4. La légende dans la feuille, le `Tout afficher`, le pied qui compte.
5. Le compte par lettre (§8).

## 11. À vérifier avant la revue

- **Un écran court** : iPhone SE, barre d'URL dépliée. C'est le cas qui
  motive tout le chantier ; la grille doit tenir sans défiler.
- **Les six ambiances et le mode clair.** Le bouton blanc en mode clair
  est le point faible (§4).
- **`env(safe-area-inset-bottom)`** sur un téléphone à encoche, en
  portrait et en paysage.
- **Au clavier** : `Tab` atteint le bouton, la feuille prend le focus,
  `Échap` referme et le focus revient sur le bouton.
- **La dernière marque de la liste est atteignable**, bouton compris.
- **`?lettre=w` au chargement** : le bouton porte « W », la liste est
  filtrée, la feuille est fermée.
- **Le lecteur d'écran** n'annonce qu'un bouton d'index hors dialogue.
