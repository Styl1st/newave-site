# Brief — les réglages d'apparence, deux blocs à simplifier

Un seul chantier sur `newave-site`, validé en maquette. Il ne touche
qu'à l'espace compte, onglet Apparence : les blocs **Composer** et
**Mouvement du fond**. Le reste de la page ne bouge pas.

**Le problème.** Composer demande neuf couleurs à la suite, nommées
Départ / Transition / Cœur / Pic / Retour / Fin pour le fond et
« nappes » pour les accents. Personne ne sait ce que veut dire « pic »
ni où il tombe dans la page. Mouvement du fond demande deux curseurs,
vitesse et **ampleur** — et l'ampleur, en particulier, ne se comprend
qu'en la bougeant d'un bout à l'autre pour voir. Onze commandes pour
un réglage qu'on fait une fois.

**Ce qu'on garde.** Les données. `theme.bg` reste un tableau de six
couleurs, `theme.accents` un tableau de trois, le mouvement reste
`{ vitesse, ampleur }`. **Rien à migrer, rien à écrire en base.** Ce qui
change est entièrement au-dessus : ce que l'interface demande à
l'utilisateur, et comment elle en déduit les neuf valeurs.

**Ce qu'on livre.** Option retenue : **`2a`**, en haut de la maquette.

- Le fond se règle en **trois teintes nommées par leur place réelle** —
  Haut, Cœur, Bas. Les trois autres arrêts sont interpolés. Un repli
  « Voir les six teintes » montre le résultat calculé, en lecture seule.
- Les accents gardent leur mot, **Halos**, et leurs trois pastilles,
  posées sur une ligne avec une phrase qui dit ce que c'est.
- Le mouvement devient **une seule barre**, de « Figé » à « Vif ». Les
  quatre mots sous la barre sont cliquables et se rejoignent au
  glissement. L'ampleur n'est plus demandée : elle est dérivée.
- Un **aperçu plein format** en haut du bloc, animé à la vitesse
  choisie, avec une barre de navigation en réduction pour qu'on voie le
  fond *sous* l'interface et pas en abstrait.

Onze commandes deviennent six pastilles et une barre.

## Ce qu'on attend de toi

1. **Lis `README.md` en entier avant de toucher au code.** Il tient la
   spec, les formules de dérivation, les fichiers concernés et les
   invariants.
2. **Ouvre la maquette** (`Apparence NEWAVE.dc.html`) dans un
   navigateur. Page autonome, rien à installer. Elle s'ouvre sur `2a`,
   qui est vivant : change les teintes, glisse la barre, l'aperçu
   suit. Les tours du dessous sont les étapes écartées, gardées pour le
   contexte — ne code pas dessus.
3. **Reviens vers moi avec ton plan avant de coder**, en particulier sur
   la façon dont tu comptes traiter les thèmes déjà enregistrés par des
   utilisateurs (voir README, « Le cas des thèmes existants »). C'est le
   seul point réellement ouvert.

## Ce qu'il ne faut pas faire

- **Ne pas changer la forme de `theme`.** Pas de champ en plus, pas de
  passage à trois couleurs en base. L'interface demande trois teintes,
  le composant en écrit six. Un thème enregistré par l'ancienne
  interface doit continuer de s'afficher exactement pareil.
- **Ne pas supprimer l'ampleur du modèle.** Elle reste dans `theme`,
  elle reste lue par le fond animé ; elle n'est simplement plus
  *demandée*. Si on l'enlève, tous les thèmes existants sautent.
- **Ne pas appliquer le thème pendant le glissement.** Le comportement
  actuel — on applique à la fin du geste, pas à chaque pixel — est là
  pour une raison, il est coûteux à recomposer. Le garder tel quel.
- **Ne pas toucher aux autres blocs de l'onglet Apparence** (ambiances
  enregistrées, typographie, curseur). Ils ne font pas partie de ce
  chantier.
- **Ne pas rendre les six teintes du repli modifiables.** C'est un
  affichage. Si on les rend éditables, on a refait l'ancienne interface
  à côté de la neuve, et les deux se contrediront.
