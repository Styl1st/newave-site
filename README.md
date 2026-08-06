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

**Le site tourne sans Supabase.** Tant que `.env.local` est absent, il affiche deux marques
et deux articles de démonstration (`src/lib/demo-data.ts`). C'est fait exprès : tu peux
travailler le design avant de t'occuper de la base.

---

## Brancher Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) — l'offre gratuite suffit largement.
2. **SQL Editor → New query** → colle `supabase/schema.sql` → **Run**.
3. Recommence avec `supabase/seed.sql` pour avoir deux marques de départ.
4. **Project Settings → API** : copie l'URL et la clé `anon public`.
5. Duplique `.env.local.example` en `.env.local` et colle les deux valeurs.
6. Relance `npm run dev`. Les données de démonstration disparaissent d'elles-mêmes.

La clé `anon` est publique par nature, elle a vocation à être dans le navigateur.
Ce qui protège les données, ce sont les politiques RLS du fichier `schema.sql` :
le public lit ce qui est publié, et ne peut rien écrire à part déposer une candidature.
**Ne mets jamais la clé `service_role` dans ce projet.**

---

## Structure

```
src/
  app/
    page.tsx                  accueil (manifeste + marques à la une + journal)
    marques/                  annuaire + fiche marque
    journal/                  liste d'articles + article
    candidature/              formulaire de candidature des marques
    mentions-legales/
    globals.css               ← le design system, tous les tokens de marque
  components/
    Background.tsx            dégradé animé, glyphes, blobs chromés
    Header.tsx / Footer.tsx
    BrandCard.tsx
    BrandDirectory.tsx        recherche + filtres (composant client)
    ApplicationForm.tsx
  lib/
    types.ts                  les types partagés
    queries.ts                accès aux données, avec repli sur la démo
    demo-data.ts              données de démonstration
    supabase/                 clients navigateur et serveur
supabase/
  schema.sql                  tables + sécurité RLS
  seed.sql                    données de départ
public/brand/                 logo, marque, blobs chromés
```

---

## Ajouter une marque

Dans Supabase → **Table Editor → brands → Insert row**.
Mets `status` sur `published` et remplis `published_at`, sinon elle reste invisible.
`categories` est un tableau : `{Denim,Streetwear}`.

Les candidatures reçues arrivent dans la table `applications`.

---

## Déployer

1. Pousse le projet sur GitHub.
2. Sur [vercel.com](https://vercel.com), **Add New → Project**, choisis le dépôt.
3. Dans **Environment Variables**, remets `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_SITE_URL`.
4. Deploy. Vercel te donne une URL en `.vercel.app`.

**Vérifie le site sur cette URL temporaire avant de toucher au DNS.**
La bascule de `newavesphere.fr` depuis GitHub Pages vers Vercel se fait en dernier,
et la page de liens deviendra alors `newavesphere.fr/links`. Un domaine ne peut pas
être servi par GitHub Pages et Vercel en même temps.

---

## Ce qui viendra après

- `/links` : la page de liens actuelle, rapatriée ici au moment de la bascule DNS
- `/api/go` : redirection tracée pour compter les clics sortants vers les marques
  (la table `outbound_clicks` est déjà prête)
- back-office pour éditer marques et articles sans passer par Supabase
- newsletter branchée sur un vrai service
