# Envoyer les emails du site depuis OVH

À faire **avant** d'ouvrir la bêta. Compte une heure, plus vingt-quatre
heures d'attente pour que le DNS se propage.

---

## Pourquoi ce n'est pas optionnel

Ce n'est pas une question de confort ni de limite haute. L'expéditeur
intégré de Supabase a deux restrictions, et la première est
rédhibitoire.

**Il refuse d'écrire à qui n'est pas membre de ton projet Supabase.**
Toute autre adresse reçoit l'erreur *Email address not authorized*.
Autrement dit : si tu lançais la bêta aujourd'hui, **personne** ne
recevrait son email de confirmation, sauf toi. Les inscriptions
échoueraient toutes, en silence pour l'utilisateur.

**Et il plafonne à deux messages par heure.** Pas quelques dizaines :
deux.

C'est écrit dans leur documentation : ce service est prévu pour tester
des gabarits, pas pour un site ouvert.

---

## Étape 0 — Vérifie que tu as bien une adresse email OVH

Posséder un domaine chez OVH ne suffit pas. Il te faut une **adresse
email** créée dessus, par exemple `contact@newavesphere.fr`.

Espace client OVH → **Web Cloud** → **Emails**. Si tu vois ton domaine
avec une offre MX Plan et au moins une adresse, tu es prêt. Sinon,
crée-la : MX Plan est généralement inclus avec un domaine OVH.

Utilise une adresse **dédiée aux envois du site**, pas ta boîte
personnelle. `contact@` fait l'affaire, `noreply@` est plus classique.
Si l'envoi automatique pose un jour problème, tu ne veux pas que ta
messagerie personnelle soit prise dedans.

---

## Étape 1 — Brancher OVH dans Supabase

Supabase → Authentication → **SMTP Settings** → active *Enable Custom
SMTP*.

| Champ | Valeur |
| --- | --- |
| Sender email | `contact@newavesphere.fr` |
| Sender name | `NEWAVE SPHERE` |
| Host | `ssl0.ovh.net` |
| Port | `465` |
| Username | `contact@newavesphere.fr` — l'adresse **entière** |
| Password | le mot de passe de cette adresse email |

Deux pièges classiques. Le nom d'utilisateur est l'adresse complète, pas
la partie avant l'arobase. Et le mot de passe est celui de la **boîte
mail**, pas celui de ton compte OVH.

Enregistre.

---

## Étape 2 — Relever la limite d'envoi

Dès qu'un serveur personnalisé est branché, Supabase impose par
précaution **30 messages par heure**. Pour une bêta annoncée sur
Instagram, c'est trop bas : trente inscriptions dans l'heure et les
suivantes échouent.

Supabase → Authentication → **Rate Limits** → monte l'envoi d'emails à
**100 par heure** pour commencer.

Ne mets pas un chiffre énorme « au cas où ». Cette limite est aussi ce
qui te protège si un robot tente de créer des comptes en rafale : sans
elle, il consommerait ton quota OVH et abîmerait ta réputation
d'expéditeur.

---

## Étape 3 — Les trois enregistrements qui décident si tes emails arrivent

**C'est l'étape que tout le monde saute, et c'est celle qui compte le
plus.** Sans elle, tes emails partent bien mais atterrissent dans les
indésirables, et tu croiras que le site est cassé.

Un serveur de réception se pose trois questions : ce serveur a-t-il le
droit d'écrire au nom de ce domaine (SPF), le message a-t-il été altéré
en route (DKIM), et que faire si ça ne colle pas (DMARC).

Espace client OVH → **Web Cloud** → **Noms de domaine** →
`newavesphere.fr` → onglet **Zone DNS**.

### SPF

Cherche un enregistrement **TXT** sur le domaine racine commençant par
`v=spf1`. S'il existe déjà, ne le double pas — deux SPF valent pire
qu'aucun, les serveurs rejettent alors les deux. S'il manque, ajoute un
TXT sur le domaine racine :

```
v=spf1 include:mx.ovh.com ~all
```

### DKIM

**Ne l'écris pas à la main.** OVH génère lui-même la clé et son nom.
Va dans **Emails** → ton domaine → onglet **Diagnostic** ou
**Configuration**, et active DKIM. OVH ajoute les enregistrements tout
seul dans ta zone.

### DMARC

Un TXT nommé `_dmarc`, avec pour valeur :

```
v=DMARC1; p=none; rua=mailto:contact@newavesphere.fr
```

`p=none` veut dire « observe et rapporte, ne rejette rien ». C'est le
bon réglage pour commencer : tu reçois des rapports sans risquer de
bloquer tes propres messages. On durcira plus tard, une fois que tu
auras vérifié que tout passe.

**Compte jusqu'à vingt-quatre heures** avant que ces trois changements
soient pris en compte partout. D'où l'intérêt de le faire maintenant et
pas la veille du lancement.

---

## Étape 4 — Activer la confirmation, et tester pour de vrai

Supabase → Authentication → **Settings** → coche **Confirm email**.

Puis teste avec une adresse qui n'est **pas** la tienne et qui n'est
**pas** chez OVH. Une adresse Gmail va très bien, c'est le service le
plus sévère.

Ce qu'il faut vérifier :

1. L'email arrive, et en boîte de réception, pas en indésirables.
2. L'expéditeur affiché est bien `NEWAVE SPHERE`.
3. Le lien ouvre le site et connecte le compte.
4. Le rendu tient sur téléphone.

Dans Gmail, ouvre le message, menu **⋮** → **Afficher l'original**. Tu
dois lire `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. Trois `PASS`, tu es
tranquille. Un seul `FAIL` et il faut y retourner.

---

## Ce qu'OVH ne sait pas faire, et quand en changer

Sois lucide sur ce que tu utilises : **MX Plan est une messagerie, pas
un service d'envoi automatique**. Il est fait pour qu'un humain écrive
quelques dizaines de messages par jour.

Concrètement, cela veut dire :

- OVH applique ses propres limites anti-spam, non publiées et
  susceptibles de changer. Un pic d'inscriptions peut être ralenti,
  voire bloqué.
- Tu n'as aucun tableau de bord : pas de taux d'ouverture, pas de
  gestion des adresses qui n'existent plus.
- Si OVH suspend l'adresse pour excès de volume, **ta messagerie du
  domaine est touchée en même temps**.

Pour une bêta de quelques dizaines de personnes, ça passe très bien, et
c'est déjà payé. Ne complique pas.

**Les trois signes qu'il faut passer à un service dédié** — Resend,
Brevo ou Postmark, tous avec une offre gratuite suffisante pour
commencer :

1. Des inscrits te disent ne rien recevoir alors que tes trois `PASS`
   sont bons.
2. Tu dépasses régulièrement la centaine d'emails par jour.
3. Tu veux envoyer autre chose que de l'authentification — une
   newsletter, par exemple.

Ce dernier point mérite d'être anticipé : **ne mélange jamais les
emails d'inscription et les emails d'information**. Si une campagne se
fait signaler comme indésirable, elle emporte avec elle tes emails de
confirmation, et plus personne ne peut créer de compte. Le jour où tu
lances une newsletter, elle part d'un autre service et d'une autre
adresse.

---

## Récapitulatif avant d'ouvrir

- [ ] Adresse email OVH créée et dédiée au site
- [ ] SMTP branché dans Supabase, testé
- [ ] Limite d'envoi montée à 100 par heure
- [ ] SPF, DKIM et DMARC en place depuis plus de 24 h
- [ ] Trois `PASS` vérifiés dans Gmail
- [ ] Gabarits d'emails personnalisés (voir `emails-supabase.md`)
- [ ] **Confirm email** activé
- [ ] Un compte de test créé de bout en bout, depuis une adresse Gmail
