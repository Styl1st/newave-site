# Forum NEWAVE — spécification

Maquette : `Forum NEWAVE.dc.html` (écrans `1a`, `1d`–`1g`, `2a`–`2d`).
La maquette est la référence visuelle, ce document la référence de
comportement. En cas de contradiction, ce document gagne. Les noms,
comptes et photos de la maquette sont fictifs.

---

## 1. Principes

- **Publier** : tout compte connecté. Un·e gérant·e de marque
  (`brand_managers`) peut publier **au nom de sa marque** → badge MARQUE.
- **Publication directe**, pas de validation préalable. La modération
  passe par les signalements (§7).
- **Vote positif uniquement**, un par personne et par annonce/commentaire,
  retirable. Pas de vote sur ses propres contenus.
- **Répondre à une annonce = message privé.** Les commentaires publics
  servent aux questions, pas à s'échanger des coordonnées.
- **La réputation** d'un membre = total des votes reçus (annonces +
  commentaires). Affichée sur le profil, **jamais classée** entre membres.

## 2. Routes

| Route | Écran | Notes |
|---|---|---|
| `/forum` | `1a` / `1g` | Fil. Paramètres `?tri=populaires\|tendance\|recentes&ville=…&rubrique=…&q=…` |
| `/forum/[id]` | `1d` | Annonce + commentaires. Slug facultatif `/forum/[id]-[slug]` |
| `/forum/publier` | `1e` | Connexion requise → redirection `/connexion?suite=/forum/publier` |
| `/forum/membre/[handle]` | `1f` | Profil public |
| `/messages` | `2a` / `2c` | Boîte. `?c=[conversationId]` ouvre une conversation (`2d` sur mobile) |

Header : ajouter `{ href: "/forum", label: "Forum" }` dans les liens de
`Header.tsx` (après « Coups de cœur »), et l'icône Messages avec pastille
de non-lus à gauche de l'avatar (connecté seulement). Même ajout dans
`MobileMenu.tsx`.

## 3. Rubriques et villes

Constante unique, dans un nouveau `src/lib/forum.ts` :

| Clé | Libellé | Pastille | Détails propres (`1e`) |
|---|---|---|---|
| `casting` | Casting | rose `#e58ad8` | date, rémunération, profils |
| `photo` | Photo & stylisme | bleu `#8fa8f0` | date, rémunération, portfolio |
| `collab` | Collab | lavande `#b49bf0` | — |
| `evenement` | Événement | `#f0a860` | dates, adresse, entrée |
| `idees` | Idées pour NEWAVE | crème `#f2ecff` | — |
| `discussion` | Discussion | `#6fd0b0` | — |

Rémunération : `remunere` · `echange` · `benevole` · `tenues` (tenues
offertes). Affichée en pastille verte sur la carte si ≠ `benevole`.

Villes : liste fermée pour que le filtre marche (Paris, Lyon, Marseille,
Bordeaux, Lille, Nantes, Toulouse, En ligne…) + « Autre » libre.
Voir §9.

## 4. Le fil (`1a`, `1g`)

- **Grille en colonnes façon mosaïque** (`columns-3 gap-[18px]`, cartes
  `break-inside-avoid mb-[18px]`), comme la vitrine des pièces : pas de
  trous sous les cartes courtes. 2 colonnes en tablette, 1 en mobile.
- **Carte avec photo** : image 4:3, pastille rubrique posée dessus.
  **Carte sans photo** : pastille en tête + extrait de 2–3 lignes
  (c'est ce qui l'empêche d'avoir l'air vide).
- Pied de carte : bouton vote (▲ + total), nombre de réponses,
  pastille rémunération à droite.
- **Tris** :
  - Populaires : `votes desc`
  - Récentes : `created_at desc`
  - Tendance : `votes / (heures + 2)^0.8` — calcul en SQL (vue ou RPC),
    pas en JS, pour que la pagination tienne.
- **Filtres desktop** : tri en segmenté, villes en pastilles, rubriques
  en pastilles avec leur couleur.
- **Filtres mobile** (`1g`) : **pas de défilement horizontal**. Une
  barre de recherche plein largeur, puis deux menus natifs côte à côte
  (Ville · Rubrique), hauteur 52px. Bouton « + Publier une annonce »
  flottant en bas.
- Pagination : défilement infini par 24, comme la vitrine.
- État vide : encadré pointillé « Rien dans cette ville pour cette
  rubrique. Soyez le premier à publier. »

## 5. Annonce (`1d`) et création (`1e`)

**Page annonce** : photo(s), rubrique · ville · date, titre, texte,
bandeau de détails (4 cases max, selon la rubrique), puis boutons
**Vote**, **Répondre en privé** (dégradé rose→violet), Partager,
Signaler. Colonne droite : carte auteur (votes reçus, nb d'annonces,
lien fiche marque si c'en est une) + 2–3 annonces de la même rubrique.

**Commentaires** : triés par votes. Un seul niveau de réponse (pas
d'arbre). La réponse de l'auteur de l'annonce porte le badge AUTEUR.
Votables comme les annonces.

**Clôture** : l'auteur peut marquer l'annonce « Clôturée ». Elle reste
visible et lisible, sort des tris Tendance, et le bouton « Répondre en
privé » disparaît.

**Création** : une seule page, pas d'étapes. Rubrique (6 tuiles) →
titre (90 car. max, compteur) → ville → photos (4 max, facultatif) →
description → bloc « Détails » qui change selon la rubrique. **Aperçu
de la carte en direct** à droite (colonne sticky), mis à jour à la
frappe. Publier → redirection vers l'annonce.

Si la personne gère une marque : un sélecteur « Publier en tant que
Moi / [Marque] » au-dessus du bouton.

## 6. Messagerie (`2a`–`2d`)

- **Une conversation = deux personnes + une annonce.** Elle naît du
  bouton « Répondre en privé » (`2b`) et garde l'annonce **épinglée en
  haut** avec son état (Active / Clôturée / Votre annonce).
- Relancer « Répondre en privé » sur la même annonce rouvre la
  conversation existante, n'en crée pas une deuxième.
- **Premier message** (`2b`) : fenêtre sur la page annonce, texte +
  3 phrases rapides qui s'ajoutent au clic + pièce jointe (PDF/image,
  10 Mo). Mention « [Auteur] verra votre profil et vos votes reçus ».
- **Boîte** : onglets Toutes · Non lues · Mes annonces. Ligne =
  avatar, nom (+ MARQUE), heure, « ↳ titre de l'annonce », aperçu du
  dernier message (gras si non lu, pastille rose).
- **Non lu** : une conversation n'est jamais non lue si le dernier
  message est le vôtre. Ouvrir = lu.
- Entrée envoie, bouton Envoyer aussi. Pièces jointes via le bouton +.
- Rappel sous le champ : « Ne partagez jamais de coordonnées bancaires
  ici » + lien Signaler la conversation.
- **Mobile** : `2c` boîte (barre d'onglets en bas : Forum · Publier ·
  Messages · Profil), `2d` conversation plein écran, annonce épinglée
  en bandeau compact, zone de saisie collée en bas (cibles 44px).
- Bloquer une personne (menu ⋯) : plus aucun message d'elle.

## 7. Modération

On **étend `signalements`** (migration 19) au lieu de créer une table :

- nouvelles colonnes nullable `annonce_id`, `commentaire_id`,
  `conversation_id` (FK `on delete cascade`) ;
- la contrainte devient
  `num_nonnulls(review_id, product_id, brand_id, annonce_id, commentaire_id, conversation_id) = 1` ;
- trois index uniques partiels de plus, sur le modèle existant ;
- `CibleSignalement` += `"annonce" | "commentaire" | "conversation"`,
  avec leurs motifs dans `signalement.ts` (spam, arnaque, insultant,
  hors-sujet, faux casting, autre).

**Masquage automatique** : une annonce ou un commentaire qui atteint
**3 signalements distincts non traités** passe `masque = true` (trigger)
et disparaît des listes jusqu'à décision admin. L'auteur voit un
bandeau « en cours de relecture ». Voir §9.

L'admin tranche depuis la pile existante (`moderation.ts`) : retirer ou
classer sans suite (classer sans suite remet `masque = false`).

## 8. Modèle de données proposé

À écrire en `migration-37.sql`, rejouable, dans le style des
précédentes (commentaires en français, `if not exists`, `drop policy if
exists`).

```
profiles            + handle text unique (a-z0-9._, 3–24)
                    + ville text, bio text (≤ 160), avatar_url text

forum_annonces      id, auteur_id → auth.users, marque_id → brands (null = en son nom)
                    rubrique text check (…), titre (≤ 90), texte (≤ 4000)
                    ville text, images text[] default '{}'
                    details jsonb default '{}'   -- date, remuneration, profils…
                    cloturee boolean default false, masque boolean default false
                    created_at, updated_at

forum_commentaires  id, annonce_id → forum_annonces cascade, auteur_id,
                    parent_id → forum_commentaires (1 niveau, check parent.parent_id is null)
                    texte (≤ 2000), masque, created_at

forum_votes         user_id, annonce_id   pk (user_id, annonce_id)
forum_votes_com     user_id, commentaire_id  pk (user_id, commentaire_id)

conversations       id, annonce_id → forum_annonces, a_id, b_id,
                    unique (annonce_id, least(a_id,b_id), greatest(a_id,b_id))
                    dernier_message_at
conversation_lus    conversation_id, user_id, lu_at   -- pour les non-lus
messages            id, conversation_id cascade, auteur_id, texte (≤ 2000),
                    piece_jointe text null, created_at
blocages            user_id, bloque_id  pk
```

Vues / RPC :
- `forum_fil(tri, ville, rubrique, q, limite, decalage)` — renvoie les
  annonces non masquées avec `votes`, `commentaires`, `a_vote` (pour
  l'utilisateur courant). Tendance calculée ici.
- `reputation(user_id)` — somme des votes reçus.

RLS (principe) :
- annonces / commentaires : lecture publique si `masque = false` (ou
  auteur, ou admin) ; insert si `auteur_id = auth.uid()` et, si
  `marque_id`, `manages_brand(marque_id)` ; update/delete par l'auteur
  ou admin.
- votes : insert/delete ses propres lignes, **refus si on est l'auteur** ;
  lecture publique des totaux via la RPC (pas de liste nominative
  exposée, contrairement à `product_likes`).
- conversations / messages : lecture et écriture **uniquement** par
  `a_id` / `b_id` ; admin en lecture seule **seulement** si la
  conversation est signalée ; refus d'insert si un blocage existe.

Storage : le bucket `media` n'accepte l'écriture que des admins
(schema.sql l. 298). Ajouter une policy d'insert pour `authenticated`
limitée au préfixe `forum/{auth.uid()}/…` (et `messages/{uid}/…` pour
les pièces jointes, idéalement dans un **bucket privé** séparé).

## 9. À trancher avant de coder

1. **Pseudo `@handle`** : `profiles` n'a que `display_name`. Il faut une
   colonne unique et un écran pour la choisir (première visite du
   forum ? page compte ?). Proposer le parcours.
2. **Upload membre** : ouvrir `media` sur un préfixe, ou créer un bucket
   `forum` ? Pièces jointes de messages : bucket **privé** + URL
   signées, recommandé.
3. **Temps réel** de la messagerie : Supabase Realtime sur `messages`,
   ou rafraîchissement toutes les 15 s ? Dis-moi ce que ça coûte.
4. **Notifications e-mail** (nouveau message, réponse à mon annonce) :
   l'infrastructure OVH SMTP existe (`docs/emails-ovh-smtp.md`). Au lot
   B, ou plus tard ?
5. **Seuil de masquage** : 3 signalements, à confirmer.
6. **Villes** : liste fermée + « Autre », ou champ libre normalisé ?

## 10. Correspondance écrans → fichiers

| Écran | Nouveau / touché |
|---|---|
| `1a` `1g` | `app/forum/page.tsx`, `components/forum/Fil.tsx`, `CarteAnnonce.tsx`, `FiltresForum.tsx`, `BoutonVote.tsx` |
| `1d` | `app/forum/[id]/page.tsx`, `components/forum/Commentaires.tsx` · réutilise `BoutonSignaler` |
| `1e` | `app/forum/publier/page.tsx`, `components/forum/FormulaireAnnonce.tsx` (aperçu = `CarteAnnonce`) |
| `1f` | `app/forum/membre/[handle]/page.tsx` |
| `2a`–`2d` | `app/messages/page.tsx`, `components/messages/Boite.tsx`, `Conversation.tsx`, `PremierMessage.tsx` |
| partout | `lib/forum.ts` (constantes + server actions), `lib/messages.ts`, `Header.tsx`, `MobileMenu.tsx`, `signalement.ts`, `moderation.ts` |
