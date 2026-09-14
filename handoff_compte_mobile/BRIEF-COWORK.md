# Brief — le compte et l'admin au doigt

Un chantier sur `newave-site`, validé en maquette. Il ne concerne **que
le téléphone** (en dessous de `lg`), et **deux endroits** : la page
`/compte` et le gabarit `/admin`.

Le grand écran ne bouge pas. Ni le rail de 250 px de `CompteEcran`, ni
la barre d'admin quand elle tient sur un rang.

## Le problème, dit simplement

Sur `/compte`, on empile aujourd'hui : un rail d'onglets qui défile à
l'horizontale, trois cartes de raccourci, **puis les mêmes trois liens
une seconde fois** dans ce rail, puis l'identité, puis le mot de passe,
puis la suppression. L'onglet Apparence, à lui seul, fait quatre écrans
de haut. Résultat : on défile longtemps, et deux boutons différents font
la même chose.

Sur `/admin`, les six entrées de navigation s'enroulent sur deux rangs
en haut de page. Le commentaire de `admin/layout.tsx` dit déjà pourquoi
on a renoncé au défilement latéral — « les deux dernières, dont les
signalements, n'existaient pas pour qui ne pensait pas à balayer ». Deux
rangs valent mieux qu'un rang caché, mais ça reste une navigation qu'il
faut viser en haut de l'écran, avec le pouce en bas.

## Ce qu'on met à la place

**Sur `/compte`** — un hub. Les trois destinations (favoris, espace
marque, administration) passent en **tuiles** sous le pouce ; les
réglages tiennent en **trois lignes** en dessous ; identité, adresse
e-mail et mot de passe se retrouvent sur **une seule page** au lieu de
deux ; et l'Apparence se coupe en deux niveaux — ambiances et
clair/sombre visibles, réglage fin des couleurs derrière « Composer ».
**Chaque lien n'existe plus qu'une fois.** Le hub tient sans défilement.

**Sur `/admin`** — une console. Les six entrées deviennent une **barre
de pied à cinq places**, toujours sous le pouce : Bord, Marques, Posts,
Pile, Plus. « Pile » réunit candidatures et signalements avec un badge de
compte — c'est la réponse directe au problème des signalements enterrés.
Comptes et Catalogues, qu'on ouvre une fois par semaine, descendent dans
« Plus ».

## Ce qu'on attend de toi

1. **Lis `README.md` en entier avant de toucher au code.** Il contient la
   spec, les valeurs exactes, et — c'est le plus important — la **liste
   des invariants** à ne pas casser (§5). Deux d'entre eux sont des
   corrections de bogue déjà payées une fois : la colonne de grille
   écrite au premier palier, et le curseur d'Apparence qui n'applique
   rien tant qu'on le tient.
2. **Ouvre la maquette** (`Compte mobile NEWAVE v2.dc.html`) dans un
   navigateur. Page autonome, rien à installer. Deux téléphones côte à
   côte : **`1b`** = le compte, **`1d`** = l'admin. Tout est cliquable —
   touche « Mon compte », « Apparence », « Composer », et en bas de `1d`
   les cinq onglets.
3. **Deux points demandent ton avis avant de coder**, argumentés dans le
   README :
   - le §4.2 : la barre de pied d'admin est une pilule fixée en bas.
     Le commentaire de `.barre-pied` interdisait explicitement ça. Je
     pense que l'objection ne tient pas ici (l'admin n'a pas de
     `ProgressionLecture`), mais vérifie-le sur un vrai téléphone
     plutôt que de me croire.
   - le §6.1 : les deux volets de `CompteEcran` restent montés
     aujourd'hui, exprès, pour ne pas relancer la lecture des
     préférences. Un hub qui pousse des sous-pages change ça. Je
     propose de garder les volets montés et de ne déplacer que
     l'affichage ; dis-moi si tu vois mieux.
4. **Reviens avec ton plan avant de coder**, dans l'ordre où tu prends
   les fichiers et avec les régressions que tu redoutes.

## Ce qu'il ne faut pas faire

- **Ne pas afficher un lien deux fois.** C'est tout le chantier. La
  liste des espaces est construite une fois dans `compte/page.tsx` et
  ne se rend qu'à un seul endroit.
- **Ne pas laisser une colonne de grille implicite au premier palier.**
  `grid-cols-[minmax(0,1fr)]` dès le mobile, comme l'explique en long le
  commentaire de `CompteEcran.tsx`. Une colonne implicite prend la
  largeur de son contenu le plus large, et toute la page déborde.
- **Ne pas faire appliquer les curseurs pendant le glissement.** C'est
  écrit noir sur blanc dans `ThemePicker.tsx` : un clignotement répété
  est un risque réel pour les personnes photosensibles. On applique au
  relâchement, décor en pause pendant ce temps.
- **Ne pas rendre la ligne Notifications cliquable.** Rien ne les
  enregistre encore. Elle reste annoncée, inerte et marquée « À venir »,
  hors du `tablist`.
- **Ne pas inventer d'icônes.** Elles viennent toutes de
  `src/components/Icons.tsx` : la maquette en reprend les chemins au
  caractère près. Si un dessin manque, on l'ajoute au jeu, on ne le
  dessine pas à côté.
- **Ne pas oublier le rembourrage bas.** La barre de pied d'admin flotte
  au-dessus de la dernière ligne de liste : sans les 108 px, elle devient
  inatteignable. C'est le bogue le plus probable de ce chantier.
