# Les emails d'authentification (Supabase)

Les gabarits vivent dans **`emails/b/`**, un fichier par message. Ouvre-les
dans un navigateur pour les relire.

Il y en a six, en deux familles :

| Fichier | Qui l'envoie |
| --- | --- |
| `confirmation.html` | **Supabase**, à coller dans son tableau de bord (ci-dessous) |
| `mot-de-passe.html` | **Supabase** |
| `changement-email.html` | **Supabase** |
| `bienvenue.html` | **Le site**, par Resend : voir `emails-site.md` |
| `candidature-recue.html` | **Le site** |
| `candidature-acceptee.html` | **Le site** |

Ce document parle des trois premiers.

---

## Coller un gabarit dans Supabase

Supabase → Authentication → **Emails** (ou *Email Templates*). Chaque
gabarit a son onglet :

| Onglet Supabase | Fichier | Objet |
| --- | --- | --- |
| Confirm signup | `emails/b/confirmation.html` | `Confirme ton adresse pour rejoindre NEWAVE SPHERE` |
| Reset password | `emails/b/mot-de-passe.html` | `Réinitialise ton mot de passe NEWAVE SPHERE` |
| Change email address | `emails/b/changement-email.html` | `Confirme ta nouvelle adresse` |

Pour chacun : ouvre le fichier dans un éditeur de texte (pas dans le
navigateur), copie **tout** son contenu, colle-le à la place de l'ancien
dans l'onglet, recopie l'objet, enregistre.

Supabase ne lit pas le dépôt : **une retouche d'un de ces trois fichiers
ne part qu'une fois recollée** dans le tableau de bord. Les trois autres,
eux, partent avec le déploiement.

---

## Comment le décor du site arrive dans un email

Le fond du site est un dégradé animé, trois nappes floues qui dérivent
et changent de teinte. Rien de tout cela n'existe dans un email : ni
animation, ni flou, ni dégradé fiable, ni variable CSS. Un client mail
n'est pas un navigateur.

On le **rend donc en image**, une fois pour toutes :
`public/emails/fond-email.jpg`, 600 × 1200, qui occupe toute la surface
du message. Les gabarits de `emails/b/` posent le texte directement
dessus, sans panneau. (`fond-carte.jpg`, le panneau de verre des
premiers gabarits, n'est plus utilisé.)

**Pour régénérer l'image** après un changement de palette dans
`globals.css` : le script est `scripts/fond-emails.py`, il reprend les
mêmes couleurs.

### Deux points de vigilance

**L'adresse de l'image est absolue et pointe vers le site** :
`https://newavesphere.fr/emails/fond-email.jpg`. Si le domaine change un
jour, il faut la changer dans les six gabarits.

**Une image peut être bloquée.** Certaines messageries ne les chargent
pas tant qu'on ne l'a pas demandé. Le tableau porte donc une couleur de
repli, `#31217c`. Le message reste alors sobre, mais entier et lisible.

**Outlook ignore les couleurs transparentes** (`rgba`). Chaque filet
porte donc deux fois sa couleur : une pleine (`#796faa`) pour Outlook,
puis la transparente pour les autres, qui gardent la dernière.

---

## Deux choses différentes, à ne pas confondre

**Le contenu du message** se règle dans les gabarits ci-dessous.

**L'expéditeur** — le nom et l'adresse qui s'affichent dans la boîte de
réception — ne se change **pas** ici, mais dans Authentication → **SMTP
Settings**. C'est fait : les messages partent de
`contact@newavesphere.fr` via Resend.

---

## Les variables disponibles

| Variable | Ce qu'elle contient |
| --- | --- |
| `{{ .ConfirmationURL }}` | Le lien à cliquer. Le plus important. |
| `{{ .Email }}` | L'adresse de la personne. |
| `{{ .NewEmail }}` | La nouvelle adresse — **seulement** dans le gabarit de changement d'email. |
| `{{ .Data.display_name }}` | Le prénom saisi à l'inscription, s'il y en a un. |
| `{{ .SiteURL }}` | L'adresse du site, celle réglée dans URL Configuration. |
| `{{ .Token }}` | Un code à six chiffres. **Pas utilisé** : le site n'a aucun champ pour le saisir. |

Le `{{ if ... }}` autour du prénom n'est pas une précaution inutile :
sans lui, une personne qui n'en a pas saisi verrait s'afficher
`<no value>` en toutes lettres.

---

## Ce qu'il faut savoir avant de bricoler ces gabarits

**Écris en tableaux, pas en `flex` ni en `grid`.** Les clients mail sont
restés en 2005 : Outlook rend le HTML avec le moteur de Word. Le
`flex` y est simplement ignoré, et la mise en page s'effondre.

**Tous les styles en ligne.** Une feuille de style externe, ou même une
balise `<style>`, est retirée par Gmail dans certains cas.

**Pas de dégradé CSS, pas de flou, pas de police web.** C'est justement
pourquoi le décor est une image : `linear-gradient` n'est pas rendu par
la moitié des clients, et une image l'est par tous.

**Toujours laisser l'adresse en clair sous le bouton.** Certaines
messageries d'entreprise réécrivent les liens, et le bouton devient
alors inopérant.

**Un détail à connaître** : certains antivirus de messagerie ouvrent les
liens des emails avant toi, pour les vérifier. Comme le lien de
confirmation ne sert qu'une fois, il est parfois consommé avant que la
personne ne clique, et elle voit alors « lien expiré ». Si ça remonte
souvent, on passera à un code à six chiffres, qui ne souffre pas de ce
problème.

**Teste sur toi d'abord.** Une adresse Gmail suffit, avec l'astuce du
plus : `tonadresse+test2@gmail.com` arrive dans la même boîte mais
compte comme un compte différent. Regarde le rendu sur téléphone autant
que sur ordinateur.
