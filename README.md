# NEWAVE SPHERE — le site

Média + annuaire de marques indépendantes. Next.js 15, Supabase, déployé sur Vercel.
L'identité visuelle est reprise de la page de liens (`newavesphere.fr`) : même violet,
même dégradé animé, mêmes blobs chromés.

---

## Démarrer en local

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000

**Le site tourne sans Supabase.** Tant que `.env.local` est absent, il affiche des marques
et des posts de démonstration (`src/lib/demo-data.ts`). C'est fait exprès : tu peux
travailler le design avant de t'occuper de la base. En revanche les comptes et l'admin
ont besoin de Supabase.

---

## Brancher Supabase — dans cet ordre

### 1. Créer le projet

Sur [supabase.com](https://supabase.com), **New project**. L'offre gratuite suffit largement.
Note bien le mot de passe de la base, tu ne le reverras pas.

### 2. Créer les tables et la sécurité

**SQL Editor → New query** → colle tout `supabase/schema.sql` → **Run**.

Le fichier est rejouable : tu peux le relancer plus tard sans rien casser.
Il crée les tables, les règles d'accès, le bucket d'images et le déclencheur qui
fabrique un profil à chaque inscription.

Puis, dans une nouvelle requête, colle `supabase/seed.sql` → **Run**.
Tu as deux marques et deux posts de départ.

### 3. Récupérer tes clés

Le bouton vert **Connect**, en haut du tableau de bord, affiche les deux valeurs :

- **Project URL**
- **Publishable key**, de la forme `sb_publishable_…`

Duplique `.env.local.example` en `.env.local`, colle les deux, puis relance `npm run dev`.

La clé publishable est publique par nature, elle est faite pour être dans le navigateur.
Ce qui protège tes données, ce sont les règles RLS du fichier `schema.sql`.
**Ne mets jamais la Secret key (`sb_secret_…`) dans ce projet** : elle contourne toutes
ces règles.

### 4. Créer ton compte

Va sur http://localhost:3000/connexion → **Créer un compte** → utilise
`contact@newavesphere.fr`.

Supabase t'envoie un lien de confirmation par email. Clique dessus.

> Si tu ne veux pas t'embêter avec les emails pendant le développement :
> **Authentication → Providers → Email**, décoche *Confirm email*. Remets-le
> avant la mise en ligne, sinon n'importe qui peut créer un compte avec l'adresse
> de quelqu'un d'autre.

### 5. Te passer administrateur

À l'inscription, tout le monde est **membre**. C'est volontaire : personne ne peut
se nommer admin depuis le site, un déclencheur en base l'interdit.

**SQL Editor** → colle `supabase/admin.sql` → **Run**.

Recharge le site : le lien **Admin** apparaît dans le menu.

---

## Les deux types de comptes

| | Membre | Admin |
|---|---|---|
| Mettre des marques en favori | oui | oui |
| Voir les brouillons | non | oui |
| Créer et publier posts et marques | non | oui |
| Lire les candidatures reçues | non | oui |
| Envoyer des images | non | oui |

La distinction ne tient pas au fait d'être connecté, mais à la colonne `role`
de la table `profiles`. Les règles RLS s'appuient sur la fonction `is_admin()`.

---

## Le back-office

`/admin`, visible uniquement si ton compte est admin.

- **Posts** — tes publications Instagram : visuel, légende, mots-clés, marque associée,
  liens vers l'original. Les mots-clés servent de filtres sur la page publique.
- **Marques** — la fiche complète : description, origine, catégories, gamme de prix,
  liens, logo, mise à la une.
- **Candidatures** — les dossiers reçus via `/candidature`, avec un statut à faire évoluer.

Tout ce qui est créé part en **brouillon**. Rien n'est public tant que tu ne passes
pas l'état sur *Publié*.

Les images partent dans le bucket `media` de Supabase. Seul un admin peut en envoyer.

---

## Structure

```
src/
  app/
    page.tsx              accueil
    marques/              annuaire + fiche marque (posts liés)
    posts/                grille de posts + page de post
    candidature/          formulaire des marques
    favoris/              les favoris du membre connecté
    connexion/            connexion et inscription
    admin/                back-office (protégé)
      actions.ts          toutes les écritures passent par là
    auth/                 callback de confirmation, déconnexion
    globals.css           ← le design system, tous les tokens de marque
  components/
    Background.tsx        dégradé animé, glyphes, blobs chromés
    BrandDirectory.tsx    recherche + filtres de l'annuaire
    PostGrid.tsx          filtre par mot-clé
    FavoriteButton.tsx
    admin/                champs de formulaire, envoi d'images
  lib/
    taxonomy.ts           ← catégories et mots-clés : LE fichier à éditer
    queries.ts            lectures publiques, avec repli sur la démo
    admin-queries.ts      lectures admin, brouillons inclus
    favorites.ts          favoris
    auth.ts               profil et garde-fous de route
    supabase/             clients navigateur et serveur
  middleware.ts           rafraîchit la session à chaque navigation
supabase/
  schema.sql              tables, sécurité RLS, stockage
  seed.sql                données de départ
  admin.sql               te passer administrateur
public/brand/             logo, marque, blobs chromés
```

---

## L'intro de l'accueil

La même entrée que la page de liens : le logo apparaît en chrome sur fond de nuit, un
reflet coule dessus, l'intérieur de son ovale s'allume et l'on y voit déjà le site. Puis
l'ovale se détache et grandit jusqu'à sortir de l'écran, comme une porte qu'on passe.
Le logo, lui, reste au centre pendant tout le passage, devient blanc, et glisse jusqu'à
sa place dans le manifeste pendant que la page monte.

- **Une fois par onglet.** Pour la revoir : `https://newavesphere.fr/#intro`.
- **Passable** d'un tap, d'un clic, de la molette ou d'une touche.
- **Jamais jouée** pour qui a figé les animations ou demandé moins de mouvement,
  pour les robots, ni sur un lien `/#la-suite`.
- **Rien à télécharger de plus** : l'anneau et le trou sont deux ellipses écrites dans
  le CSS, le logo est celui du manifeste.

| Fichier | Rôle |
|---|---|
| `src/lib/intro.ts` | la décision et le minutage (testé : `tests/intro.test.mjs`) |
| `src/components/IntroPortail.tsx` | la scène et le script, rendus par le layout sur l'accueil |
| `src/app/globals.css`, section « l'entrée sur le site » | le dessin |

Pour changer le rythme : `MINUTAGE` dans `lib/intro.ts`, et les trois variables du même
nom en tête de la section CSS (un test vérifie qu'elles restent d'accord).

## Les changements de page

**En profondeur.** On clique : l'ancienne page recule et s'efface, la barre du haut ne
bouge pas, la nouvelle arrive d'un peu plus près et se pose, son titre puis ses blocs
suivent l'un après l'autre.

**L'écran d'attente.** Presque toutes les pages sont lues à la demande, donc on attend à
chaque clic. Si ça dure plus de 180 ms, le logo apparaît en chrome, une lumière fait le
tour de son anneau, et une phrase dit ce qu'on prépare (« On ouvre l'annuaire des
marques… », puis « On repasse les cols… » si ça traîne). Il s'efface en reculant quand la
page arrive.

- Le recul de l'ancienne page passe par les transitions de vue du navigateur (Chrome,
  Edge, Safari 18, Firefox récent). Ailleurs, la nouvelle page arrive quand même, seule.
- Rien de tout ça pour qui a figé les animations ou demandé moins de mouvement : les
  pages apparaissent en fondu, l'écran d'attente est immobile.
- Un lien peut refuser le passage avec `data-sans-transition`.

| Fichier | Rôle |
|---|---|
| `src/components/PageTransition.tsx` | le recul de l'ancienne page, la barre de progression |
| `src/lib/traversee.ts` | quels liens y ont droit (testé : `tests/traversee.test.mjs`) |
| `src/components/EcranChargement.tsx`, `src/app/loading.tsx` | l'écran d'attente |
| `src/lib/phrases-attente.ts` | les phrases (testé : `tests/phrases-attente.test.mjs`) |
| `src/app/globals.css`, sections « le passage d'une page à l'autre » et « l'écran d'attente » | le dessin |

Pour ajouter une phrase : la liste `PHRASES` (le vestiaire) ou `CONTEXTE` (une par page)
dans `lib/phrases-attente.ts`.

---

## Déployer

1. Pousse sur GitHub.
2. Sur [vercel.com](https://vercel.com) : **Add New → Project**, choisis le dépôt.
3. **Environment Variables** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   et `NEXT_PUBLIC_SITE_URL` avec l'adresse réelle du site.
4. Deploy.

Puis dans Supabase, **Authentication → URL Configuration** : ajoute l'adresse Vercel
dans **Site URL** et **Redirect URLs**. Sans ça les liens de confirmation d'email
renverront vers `localhost` et personne ne pourra valider son compte.

**Vérifie tout sur l'URL temporaire `.vercel.app` avant de toucher au DNS.**
La bascule de `newavesphere.fr` depuis GitHub Pages vers Vercel se fait en dernier,
et la page de liens deviendra `newavesphere.fr/links`. Un domaine ne peut pas être
servi par GitHub Pages et Vercel en même temps.

---

## Ce qui viendra après

- `/links` : la page de liens actuelle, rapatriée ici au moment de la bascule DNS
- `/api/go` : redirection tracée pour compter les clics sortants vers les marques
  (la table `outbound_clicks` est déjà prête)
- newsletter branchée sur un vrai service
- les pièces : la table `products` et son affichage sur la fiche marque sont prêts,
  mais la gestion depuis `/admin` a été retirée. À réactiver quand tu voudras
  montrer des vêtements, avec l'affiliation via le champ `shop_url`.
