# Brief — le Forum

Un nouveau chantier sur `newave-site`, validé en maquette : une page
**`/forum`** où les membres **et les marques** publient des annonces
(casting, recherche de photographe, collab, pop-up, idées pour le site,
discussion), les votent, les commentent, et se répondent **en privé**.

C'est un gros morceau : nouvelles tables, nouvelles routes, une
messagerie. Rien de ce qui existe n'est cassé, tout s'ajoute.

## Ce qu'on attend de toi

1. **Lis `README.md` en entier avant de toucher au code.** Il contient la
   spec, le modèle de données proposé et les invariants.
2. **Ouvre la maquette** (`Forum NEWAVE.dc.html`) dans un navigateur :
   page autonome, rien à installer, tout est cliquable (votes, tris,
   filtres, envoi de messages).
   - **Tour 2** (en haut) : messagerie — `2a` desktop, `2b` premier
     message, `2c`/`2d` mobile.
   - **Tour 1** : `1a` le fil (retenu), `1d` page annonce, `1e` création,
     `1f` profil, `1g` mobile.
3. **Découpe en trois lots**, livrables séparément :
   - **Lot A** — fil, annonce, création, votes, commentaires (1a, 1d, 1e, 1g).
   - **Lot B** — messagerie privée (2a–2d).
   - **Lot C** — profil membre et réputation (1f).
4. **Six points demandent ton avis avant de coder** (README §9), dont les
   deux plus lourds : **il n'y a pas de pseudo `@handle` dans
   `profiles`**, et **le bucket `media` n'accepte que les admins**.
5. **Reviens avec ton plan avant de coder** : les migrations, l'ordre des
   fichiers, les régressions que tu crains.

## Ce qu'il ne faut pas faire

- **Ne pas réutiliser `product_likes`** pour les votes. Les coups de cœur
  expirent à 7 jours ; les votes du forum sont permanents. Table à part.
- **Pas de vote négatif.** Un seul geste : faire monter, ou retirer son vote.
- **Ne pas créer une deuxième pile de modération.** On étend
  `signalements` (migration 19) avec de nouvelles cibles, on ne fait pas
  de table à côté.
- **Ne pas décider des droits dans le code.** Comme partout sur le site,
  c'est la RLS qui tranche ; les server actions transmettent.
- **Pas de nouvelle palette.** Tout est déjà dans `globals.css`
  (violet, lavande, rose, bleu, crème, ink). Les cinq pastilles de
  rubrique en sont tirées.
