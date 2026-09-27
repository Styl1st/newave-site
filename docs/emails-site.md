# Les emails que le site envoie lui-même

Trois messages que Supabase ne connaît pas, parce qu'ils ne parlent pas
d'authentification mais de ce qui se passe sur le site. Le code les
envoie directement par l'**API de Resend**, le service qui porte déjà
les envois de Supabase.

| Message | Gabarit | Quand il part |
| --- | --- | --- |
| Bienvenue | `emails/b/bienvenue.html` | À la toute première confirmation d'adresse (ou première connexion Google). Une seule fois par compte. |
| Candidature reçue | `emails/b/candidature-recue.html` | Juste après le dépôt d'un dossier sur `/candidature`. Au plus un par adresse et par jour. |
| Candidature acceptée | `emails/b/candidature-acceptee.html` | Quand tu acceptes un dossier dans l'admin, **si la personne dirige la marque**. Rien pour une simple recommandation. |

Le code est dans `src/lib/emails.ts`.

---

## Mise en route (une fois)

**1. Une clé d'API Resend.** resend.com → **API Keys** → *Create API
Key*. Droit : **Sending access**, domaine : `newavesphere.fr`. Une clé qui
ne sait qu'envoyer, et seulement depuis ce domaine : si elle fuit, on ne
peut rien en faire d'autre.

**2. La donner à Vercel.** Projet → Settings → **Environment Variables**
→ `RESEND_API_KEY`, environnement *Production*. Puis redéploie : une
variable ajoutée ne s'applique qu'aux déploiements suivants.

**3. Lancer `supabase/migration-40.sql`** dans le SQL Editor. Sans elle,
l'accusé de réception des candidatures ne part pas (les deux autres,
si).

En local, laisse la clé vide : le site tourne normalement, il écrit
juste dans le terminal qu'il n'a rien envoyé.

---

## Modifier un message

Tout se passe dans le fichier HTML, rien à toucher dans le code :

- **l'objet** du message, c'est le `<title>` du fichier ;
- **les variables** s'écrivent entre doubles accolades, sans espace
  obligatoire : `{{marque}}`, `{{prenom}}`, `{{email}}`, `{{date}}`,
  `{{lien_dossier}}` ;
- une variable mal orthographiée arrive **vide**, jamais avec ses
  accolades (et un avertissement part dans les journaux Vercel).

Les valeurs sont échappées avant d'entrer dans le HTML : une marque qui
s'appellerait `<a href=...>` s'affiche en toutes lettres, elle ne glisse
pas son lien dans notre message.

La version texte (celle que lisent les montres, les lecteurs d'écran et
certains filtres anti-spam) est fabriquée à partir du HTML, rien à faire.

### Les variables de chaque gabarit

| Gabarit | Variables |
| --- | --- |
| `bienvenue.html` | `{{prenom}}` : le prénom saisi à l'inscription, sinon celui de Google. Sans prénom, « C'est fait, {{prenom}}. » devient « C'est fait. » |
| `candidature-recue.html` | `{{marque}}`, `{{email}}`, `{{date}}` (ex. « 28 septembre 2026 ») |
| `candidature-acceptee.html` | `{{marque}}`, `{{lien_dossier}}` : l'espace marque, ou la page de connexion si la personne n'a pas encore de compte |

---

## Quand un message ne part pas

Les emails ne bloquent jamais rien : une candidature déposée reste
déposée même si Resend est en panne. L'échec est écrit dans les
**journaux Vercel** (Logs), toujours préfixé `[emails]` :

| Dans les journaux | Ce que ça veut dire |
| --- | --- |
| `RESEND_API_KEY n'est pas renseignée` | La variable manque sur Vercel, ou le site n'a pas été redéployé depuis. |
| `Resend refuse … (401)` / `(403)` | Clé invalide, ou pas le droit d'envoyer depuis ce domaine. |
| `Resend refuse … (429)` | Quota Resend atteint. Il est **partagé avec les emails de Supabase** : à surveiller. |
| `candidature_a_accuser (migration-40 lancée ?)` | La migration 40 n'a pas été lancée. |

Côté Resend, l'onglet **Emails** montre chaque message parti, avec son
statut de livraison.
