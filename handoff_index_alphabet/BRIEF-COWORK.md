# Brief — l'index alphabétique au doigt

Un chantier sur `newave-site`, validé en maquette. Il ne concerne **que
le téléphone**, et **que la page `/marques`**.

Sur petit écran, l'index A→Z de l'annuaire est aujourd'hui un rail de
vingt-sept lettres dressé au bord droit. Il a deux défauts qui ne se
corrigent pas par le style : il **défile sur lui-même** dès que l'écran
est court (une liste qui défile dans une liste qui défile), et ses cibles
font 22 px là où il en faudrait 44. Il coûte en plus une gouttière de
30 px posée en permanence à quatre endroits du code.

On le remplace par **un bouton unique en bas à droite** — il porte la
lettre posée, ou « A–Z » — **qui ouvre l'alphabet en feuille** : vingt-sept
cibles de 44 px sur quatre rangées, toutes visibles quelle que soit la
hauteur d'écran. C'est le couple bouton + feuille que tu as déjà écrit
pour les filtres de la vitrine.

**Le reste de la page ne change pas** : mêmes grands titres de lettre dans
la liste, même filtrage, même `?lettre=` dans l'adresse, et l'index
justifié du grand écran reste exactement tel qu'il est.

> Ce chantier **annule le §2.6 « Le mobile ne bouge pas »** du brief
> précédent. C'en est la suite, pas une reprise.

## Ce qu'on attend de toi

1. **Lis `README.md` en entier avant de toucher au code.** Il contient la
   spec, les valeurs exactes, les quatre gouttières à retirer et — c'est
   le plus important — la **liste des invariants** à ne pas casser
   (§3). Une lettre filtre, elle ne fait pas défiler : ça, surtout, c'est
   une correction de bogue, pas un choix de style.
2. **Ouvre la maquette** (`Index alphabet NEWAVE.dc.html`) dans un
   navigateur. Page autonome, rien à installer. L'écran retenu est le
   **premier**, marqué `2a`. Touche le bouton, choisis une lettre, ressors
   par « Tout afficher ». Les trois écrans du dessous (`1a`, `1b`, `1c`)
   sont les pistes écartées — ils sont là pour le contexte, pas à
   implémenter.
3. **Deux points demandent ton avis avant de coder**, et ils sont
   argumentés dans le README :
   - le §7 : le rail et la rangée partagent aujourd'hui les mêmes
     boutons pour ne pas doubler la liste aux lecteurs d'écran. Ce
     chantier casse cette unité ; je propose de faire décider le
     JavaScript (`auDoigt` descendu depuis `BrandDirectory`) plutôt que
     les classes. Dis-moi si tu vois mieux.
   - le §6 : le commentaire de `.barre-pied` interdisait explicitement
     une pilule fixée en bas. J'explique pourquoi l'objection tombe —
     vérifie-le sur un vrai téléphone plutôt que de me croire.
4. **Reviens avec ton plan avant de coder**, dans l'ordre où tu prends les
   fichiers et avec les régressions que tu redoutes.

## Ce qu'il ne faut pas faire

- **Ne pas écrire une deuxième feuille.** On réutilise
  `feuille/FeuilleFiltres.tsx`, qui porte déjà le geste « tirer vers le
  bas ». Ce composant ne reçoit **qu'un ajout** : un `titre` pour son
  `aria-label`. Rien d'autre.
- **Ne pas transformer le filtre en défilement.** `scrollIntoView` sur la
  lettre ferait charger tout ce qui précède, et Safari viderait l'onglet.
  C'est documenté dans `BrandGrid.tsx`, ça a déjà été corrigé une fois.
- **Ne pas retirer les lettres vides** de la grille : elles s'éteignent,
  elles ne disparaissent pas.
- **Ne pas toucher au grand écran.** La barre « requête », les jetons, le
  sélecteur de densité et la rangée de lettres justifiée sont livrés et
  validés. Si le diff les touche, on est allé trop loin.
- **Ne pas oublier le rembourrage bas de la liste.** Le bouton flotte
  au-dessus de la dernière marque : sans les 96 px, elle devient
  inatteignable. C'est le bogue le plus probable de ce chantier.
