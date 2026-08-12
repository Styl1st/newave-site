# Activer la connexion Google et Apple

Le code du site est prêt. Il ne manque que les autorisations à demander
chez Google et chez Apple, puis à recopier dans Supabase.

Tant qu'un fournisseur n'est pas activé, son bouton affiche un message
qui te dit d'aller le régler. Rien ne casse en attendant.

---

## Étape 0 — Deux choses à noter d'abord

Ouvre ton projet sur [supabase.com/dashboard](https://supabase.com/dashboard).

**Ta référence de projet.** Elle est dans l'adresse du tableau de bord,
et dans Settings → General. C'est une suite de lettres du genre
`abcdefghijklmnopqrst`. Partout dans ce guide, remplace
`<ton-projet>` par cette valeur.

**Ton adresse de retour Supabase.** C'est la même pour Google et pour
Apple :

```
https://<ton-projet>.supabase.co/auth/v1/callback
```

Tu la retrouves telle quelle sur la page du fournisseur dans Supabase,
Authentication → Providers, prête à copier. C'est plus sûr que de la
retaper.

---

## Étape 1 — Autoriser tes adresses de retour dans Supabase

**À faire en premier, et ne la saute pas.** Sans elle, la connexion
fonctionne côté Google mais te renvoie sur la mauvaise page, ou
échoue sans expliquer pourquoi.

Supabase → Authentication → **URL Configuration**.

### Site URL

**Mets l'adresse où le SITE tourne, pas celle de ta marque.**

Tant que `newavesphere.fr` sert le linktree, écris :

```
https://preview.newavesphere.fr
```

Le jour où le site remplacera le linktree sur le domaine principal,
tu reviendras ici mettre `https://newavesphere.fr`.

**Ce champ ne redirige personne.** Il ne touche ni à ton domaine, ni à
tes liens Instagram, ni à ton linktree : Supabase n'a aucun pouvoir sur
eux. Il sert à deux choses, et à rien d'autre.

1. C'est l'adresse que Supabase glisse dans les liens des emails qu'il
   envoie — confirmation d'inscription, réinitialisation de mot de
   passe.
2. C'est là qu'il ramène quelqu'un après une connexion, quand le code
   ne lui a pas dit où aller.

D'où l'erreur à éviter : si tu mets `newavesphere.fr` maintenant, le
lien de confirmation reçu par email enverrait les gens sur ton
linktree, qui n'a pas de page `/auth/callback` pour les accueillir. Ils
verraient une page qui ne les connecte pas.

### Redirect URLs

Une par ligne :

```
http://localhost:3000/**
https://newavesphere.fr/**
https://preview.newavesphere.fr/**
https://newave-site-woad.vercel.app/**
```

Le `/**` autorise toutes les pages du domaine. Sans lui, seule
l'adresse exacte passerait, et le site renvoie vers
`/auth/callback?suite=…`, donc vers une adresse avec des paramètres.

Tu peux laisser `newavesphere.fr` dans cette liste dès maintenant, même
si le site n'y est pas encore : une adresse autorisée qui ne sert pas
ne gêne rien, et elle sera prête le jour du basculement.

Si tu utilises les déploiements de test de Vercel, ajoute aussi
`https://*-ton-compte.vercel.app/**`.

### Le jour où tu bascules le domaine

Quand le site prendra la place du linktree sur `newavesphere.fr`, il y
aura trois choses à changer, et une seule est ici :

1. **Site URL** → `https://newavesphere.fr`
2. Chez Google, ajouter `https://newavesphere.fr` aux *Authorized
   JavaScript origins*
3. Retirer `SITE_PASSWORD` sur Vercel pour ouvrir le site, ce qui
   supprimera aussi le `noindex` qui empêche Google de l'indexer

---

## Étape 2 — Google

Gratuit. Compte une vingtaine de minutes.

### 2.1 Créer le projet

Va sur [console.cloud.google.com](https://console.cloud.google.com/home/dashboard)
et crée un projet, appelle-le NEWAVE SPHERE. Un compte Google normal
suffit, rien à payer.

### 2.2 Régler la plateforme d'authentification

Tout se passe maintenant dans **Google Auth Platform**, et non plus
dans l'ancien menu « APIs & Services » — si un tutoriel te parle
d'« OAuth consent screen », il date d'avant.

**Audience** ([lien](https://console.cloud.google.com/auth/audience)) :
choisis **External**, sinon seuls les comptes de ton organisation
pourraient se connecter. Laisse en mode Testing tant que tu es en
bêta ; tu ajoutes les adresses de tes testeurs dans la liste des
utilisateurs de test. Passe en Production le jour de l'ouverture.

**Data Access / Scopes** ([lien](https://console.cloud.google.com/auth/scopes)) :
il en faut exactement trois, pas un de plus.

| Scope                        | État                  |
| ---------------------------- | --------------------- |
| `openid`                     | à ajouter à la main   |
| `.../auth/userinfo.email`    | déjà présent          |
| `.../auth/userinfo.profile`  | déjà présent          |

N'en ajoute aucun autre. Les scopes dits « sensibles » déclenchent une
vérification par Google qui prend des semaines, et tu n'en as pas
besoin : tu veux juste un nom et une adresse email.

**Branding** ([lien](https://console.cloud.google.com/auth/branding)) :
mets le nom NEWAVE SPHERE et le logo. Sans ça, l'écran de Google
affiche `<ton-projet>.supabase.co`, ce qui ressemble à une tentative
d'hameçonnage et fait fuir les gens. La validation du logo prend
quelques jours ouvrés, lance-la tôt.

### 2.3 Créer l'identifiant

[Clients](https://console.cloud.google.com/auth/clients) → **Create
client** → type **Web application**.

**Authorized JavaScript origins** — les domaines d'où part le clic :

```
http://localhost:3000
https://newavesphere.fr
https://preview.newavesphere.fr
```

**Authorized redirect URIs** — une seule ligne, celle de Supabase :

```
https://<ton-projet>.supabase.co/auth/v1/callback
```

C'est le point qui trompe tout le monde : ce n'est **pas** l'adresse de
ton site. Google renvoie vers Supabase, et c'est Supabase qui renvoie
ensuite vers toi.

Valide. Google affiche un **Client ID** et un **Client Secret**. Garde
la fenêtre ouverte.

### 2.4 Recopier dans Supabase

Supabase → Authentication → Providers → **Google** → active, colle les
deux valeurs, enregistre.

Teste sur `http://localhost:3000/connexion`. Le bouton doit t'emmener
chez Google puis te ramener connecté.

---

## Étape 3 — Apple

Payant : **99 $ par an** pour le compte développeur Apple. Plus long
et plus fastidieux que Google. Si le budget n'est pas là tout de
suite, laisse le bouton en place, il expliquera de lui-même qu'il
n'est pas encore actif.

Il te faut cinq choses, dans cet ordre.

**1. Le Team ID.** Dix caractères, en haut à droite de la console
développeur Apple.

**2. Les sources d'email.** Dans
[Services](https://developer.apple.com/account/resources/services/list),
section *Sign in with Apple for Email Communication*, déclare ton
domaine. C'est ce qui permet à Apple de relayer les emails des gens qui
choisissent de masquer leur adresse.

**3. Un App ID.** Dans
[Identifiers](https://developer.apple.com/account/resources/identifiers/list/bundleId),
en forme de nom de domaine à l'envers : `fr.newavesphere.app`. Coche
**Sign in with Apple** dans la liste des capacités. Laisse le champ
*Server-to-Server notification endpoint* vide, Supabase ne le gère pas.

**4. Un Services ID.** Dans
[Identifiers](https://developer.apple.com/account/resources/identifiers/list/serviceId),
rattaché à l'App ID : `fr.newavesphere.web`. Configure ses **Website
URLs** avec le domaine de **Supabase**, pas le tien :

- Domain : `<ton-projet>.supabase.co`
- Return URL : `https://<ton-projet>.supabase.co/auth/v1/callback`

**5. Une clé de signature.** Dans
[Keys](https://developer.apple.com/account/resources/authkeys/list),
crée une clé avec Sign in with Apple. Tu télécharges un fichier
`AuthKey_XXXXXXXXXX.p8`, **une seule fois**. Range-le en lieu sûr.

Puis Supabase → Authentication → Providers → **Apple** : le Services ID
va dans *Client IDs*, et le secret se génère à partir du `.p8` avec
l'outil fourni sur la page de documentation Apple de Supabase.

### Le piège à noter dans ton agenda

**Le secret Apple expire tous les six mois.** Passé ce délai, la
connexion Apple cesse de fonctionner du jour au lendemain, sans
prévenir. Mets un rappel récurrent maintenant, pendant que tu y penses,
et garde le `.p8` : c'est lui qui sert à régénérer le secret.

Autre limite à connaître : par le flux web, **Apple ne donne jamais le
nom** de la personne. Prévois de le demander toi-même après la première
connexion, ou contente-toi de l'adresse email.

---

## Étape 4 — La validation par email

Supabase → Authentication → Settings → **Confirm email**.

Tes deux comptes actuels ne sont pas concernés : la règle ne vaut que
pour les nouvelles inscriptions. Le site sait déjà quoi faire — écran
« vérifie ta boîte », bouton pour renvoyer le lien, et message clair si
quelqu'un tente de se connecter sans avoir confirmé.

**Avant d'ouvrir la bêta**, branche un vrai serveur d'envoi. L'expéditeur
intégré de Supabase est limité à quelques messages par heure : au-delà,
les inscriptions échouent en silence. Authentication → **SMTP Settings**,
avec les identifiants de ton OVH.

---

## Si ça ne marche pas

| Ce que tu vois | Ce que c'est |
| --- | --- |
| « Unsupported provider » | Le fournisseur n'est pas activé dans Supabase. |
| `redirect_uri_mismatch` chez Google | L'adresse de retour saisie chez Google ne correspond pas exactement à celle de Supabase. Recopie-la depuis Supabase, sans rien retaper. |
| Retour sur la page de connexion sans erreur | L'adresse manque dans **Redirect URLs** (étape 1). |
| `invalid_client` chez Apple | Le secret a expiré, ou le Services ID n'est pas le premier de la liste *Client IDs*. |
| Ça marche en local mais pas en ligne | Le domaine de production manque dans les origines Google ou dans les Redirect URLs. |
