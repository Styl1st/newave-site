# Les emails envoyés par le site

Trois gabarits à coller dans Supabase, aux couleurs de NEWAVE SPHERE.

**Où** : Supabase → Authentication → **Emails** (ou *Email Templates*).
Chaque gabarit a son onglet. Tu remplaces l'objet et le contenu, tu
enregistres.

---

## Comment le décor du site arrive dans un email

Le fond du site est un dégradé animé, trois nappes floues qui dérivent
et changent de teinte. Rien de tout cela n'existe dans un email : ni
animation, ni flou, ni dégradé fiable, ni variable CSS. Un client mail
n'est pas un navigateur.

On le **rend donc en image**, une fois pour toutes. Deux fichiers, dans
`public/emails/` :

| Fichier | Rôle |
| --- | --- |
| `fond-email.jpg` | Le décor complet, 600 × 1200. Il occupe toute la surface du message. |
| `fond-carte.jpg` | **La même image, au même endroit**, davantage floutée et voilée. Elle habille le panneau central. |

C'est ce deuxième point qui fait tout l'effet : la carte n'a pas un fond
à elle, elle montre la portion exacte de décor qu'elle recouvre, en plus
sombre et en plus flou. C'est précisément ce que fait un panneau de
verre sur le site. Deux images sans rapport auraient donné deux
rectangles superposés.

Le voile n'est pas uniforme non plus, il **suit la clarté** : là où le
décor est déjà sombre, la couleur reste franche ; là où il vire au rose
clair, il est retenu. Un voile plat obligeait à choisir entre un fond
joli et un texte lisible. Celui-ci garde les deux.

Les deux fichiers pèsent vingt kilo-octets à eux deux.

**Pour les régénérer** après un changement de palette dans
`globals.css` : le script est `scripts/fond-emails.py`, il reprend les
mêmes couleurs et réécrit les deux images.

### Deux points de vigilance

**L'adresse des images est absolue et pointe vers le site.** Tant que la
bêta vit sur `preview.newavesphere.fr`, c'est cette adresse-là qui est
écrite dans les gabarits. **Le jour où le site passe sur
`newavesphere.fr`, il faut la changer dans les trois gabarits**, sinon
les images cesseront de s'afficher.

Elles passent bien le mot de passe d'accès : le `matcher` du
`middleware.ts` laisse sortir les fichiers image sans vérification.
C'est voulu, et c'est ce qui permet à Gmail d'aller les chercher.

**Une image peut être bloquée.** Certaines messageries ne les chargent
pas tant qu'on ne l'a pas demandé. Chaque tableau porte donc une couleur
de repli : `#31217c` pour le fond, `#2c1a67` pour la carte. Le message
reste alors sobre, mais entier et lisible.

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
| `{{ .Token }}` | Un code à six chiffres, alternative au lien. |

Le `{{ if ... }}` autour du prénom n'est pas une précaution inutile :
sans lui, une personne qui n'en a pas saisi verrait s'afficher
`<no value>` en toutes lettres.

---

## 1. Confirmation d'inscription

**Objet**

```
Confirme ton adresse pour rejoindre NEWAVE SPHERE
```

**Contenu**

```html
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#31217c;">
    <!-- Le texte d'aperçu, celui qu'on lit dans la liste des messages
         avant même d'ouvrir. Masqué dans le corps du mail. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Un clic et ton compte est actif.
    </div>

    <!-- Le décor du site. L'attribut `background` est là pour les
         clients anciens, la propriété CSS pour les autres, et
         `bgcolor` pour le cas où l'image serait bloquée. -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           bgcolor="#31217c"
           background="https://preview.newavesphere.fr/emails/fond-email.jpg"
           style="background-color:#31217c;
                  background-image:url('https://preview.newavesphere.fr/emails/fond-email.jpg');
                  background-position:top center;background-repeat:no-repeat;
                  background-size:cover;">
      <tr>
        <td align="center" style="padding:30px 14px 36px 14px;">

          <!-- Le panneau de verre : la même image, au même endroit,
               en plus flou et en plus sombre. -->
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
                 bgcolor="#2c1a67"
                 background="https://preview.newavesphere.fr/emails/fond-carte.jpg"
                 style="width:100%;max-width:560px;background-color:#2c1a67;
                        background-image:url('https://preview.newavesphere.fr/emails/fond-carte.jpg');
                        background-position:top center;background-repeat:no-repeat;
                        background-size:cover;border-radius:22px;
                        border:1px solid #6d5cae;">
            <tr>
              <td style="padding:38px 32px 8px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                          letter-spacing:2.4px;text-transform:uppercase;color:#cbb8ff;">
                  NEWAVE SPHERE
                </p>
                <h1 style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                           font-size:27px;line-height:1.18;color:#ffffff;">
                  {{ if .Data.display_name }}Bienvenue {{ .Data.display_name }}.{{ else }}Bienvenue.{{ end }}
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                          line-height:1.65;color:#eee7ff;">
                  Il reste une chose à faire : confirmer que
                  <strong style="color:#ffffff;">{{ .Email }}</strong> est bien ton
                  adresse. Un clic, et ton compte est actif.
                </p>
              </td>
            </tr>

            <!-- Le bouton en tableau : c'est la seule forme qu'Outlook
                 affiche correctement. -->
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#ffffff"
                        style="background-color:#ffffff;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:14px 30px;
                                font-family:Arial,Helvetica,sans-serif;font-size:15px;
                                font-weight:bold;color:#170a33;text-decoration:none;">
                        Confirmer mon adresse
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 32px 0 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                          line-height:1.6;color:#c3b2f0;">
                  Le bouton ne fonctionne pas ? Copie cette adresse dans ton
                  navigateur :
                </p>
                <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                          font-size:12px;line-height:1.5;word-break:break-all;color:#a8c0ff;">
                  {{ .ConfirmationURL }}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 32px 34px 32px;">
                <p style="margin:0;padding-top:20px;border-top:1px solid #5b4a9c;
                          font-family:Arial,Helvetica,sans-serif;font-size:12.5px;
                          line-height:1.6;color:#c3b2f0;">
                  Tu n'as rien demandé ? Ignore ce message, aucun compte ne sera créé.
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:22px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                    font-size:11.5px;color:#d3c6f5;">
            NEWAVE SPHERE · média indépendant fait par et pour les indépendants
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2. Mot de passe oublié

**Objet**

```
Réinitialise ton mot de passe NEWAVE SPHERE
```

**Contenu**

```html
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#31217c;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Choisis un nouveau mot de passe.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           bgcolor="#31217c"
           background="https://preview.newavesphere.fr/emails/fond-email.jpg"
           style="background-color:#31217c;
                  background-image:url('https://preview.newavesphere.fr/emails/fond-email.jpg');
                  background-position:top center;background-repeat:no-repeat;
                  background-size:cover;">
      <tr>
        <td align="center" style="padding:30px 14px 36px 14px;">

          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
                 bgcolor="#2c1a67"
                 background="https://preview.newavesphere.fr/emails/fond-carte.jpg"
                 style="width:100%;max-width:560px;background-color:#2c1a67;
                        background-image:url('https://preview.newavesphere.fr/emails/fond-carte.jpg');
                        background-position:top center;background-repeat:no-repeat;
                        background-size:cover;border-radius:22px;
                        border:1px solid #6d5cae;">
            <tr>
              <td style="padding:38px 32px 8px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                          letter-spacing:2.4px;text-transform:uppercase;color:#cbb8ff;">
                  NEWAVE SPHERE
                </p>
                <h1 style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                           font-size:27px;line-height:1.18;color:#ffffff;">
                  Un nouveau mot de passe
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                          line-height:1.65;color:#eee7ff;">
                  Quelqu'un a demandé à réinitialiser le mot de passe du compte
                  <strong style="color:#ffffff;">{{ .Email }}</strong>. Si c'est toi,
                  choisis-en un nouveau. Le lien ne sert qu'une fois et expire vite.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#ffffff"
                        style="background-color:#ffffff;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:14px 30px;
                                font-family:Arial,Helvetica,sans-serif;font-size:15px;
                                font-weight:bold;color:#170a33;text-decoration:none;">
                        Choisir un nouveau mot de passe
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 32px 0 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                          line-height:1.6;color:#c3b2f0;">
                  Le bouton ne fonctionne pas ? Copie cette adresse dans ton navigateur :
                </p>
                <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                          font-size:12px;line-height:1.5;word-break:break-all;color:#a8c0ff;">
                  {{ .ConfirmationURL }}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 32px 34px 32px;">
                <p style="margin:0;padding-top:20px;border-top:1px solid #5b4a9c;
                          font-family:Arial,Helvetica,sans-serif;font-size:12.5px;
                          line-height:1.6;color:#c3b2f0;">
                  Tu n'as rien demandé ? Ignore ce message. Ton mot de passe actuel reste
                  valable, et personne ne peut le changer sans ce lien.
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:22px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                    font-size:11.5px;color:#d3c6f5;">
            NEWAVE SPHERE · média indépendant fait par et pour les indépendants
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 3. Changement d'adresse email

**Objet**

```
Confirme ta nouvelle adresse
```

**Contenu**

Reprends le gabarit n° 2 en changeant seulement le titre, le
paragraphe, le bouton et la dernière ligne :

```html
<h1 style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;
           font-size:27px;line-height:1.18;color:#ffffff;">
  Ta nouvelle adresse
</h1>
```

```html
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
          line-height:1.65;color:#eee7ff;">
  Ton compte va utiliser
  <strong style="color:#ffffff;">{{ .NewEmail }}</strong> à la place de
  <strong style="color:#ffffff;">{{ .Email }}</strong>. Confirme depuis cette
  boîte, et le changement sera pris en compte.
</p>
```

```html
<a href="{{ .ConfirmationURL }}"
   style="display:inline-block;padding:14px 30px;
          font-family:Arial,Helvetica,sans-serif;font-size:15px;
          font-weight:bold;color:#170a33;text-decoration:none;">
  Confirmer ma nouvelle adresse
</a>
```

```html
<p style="margin:0;padding-top:20px;border-top:1px solid #5b4a9c;
          font-family:Arial,Helvetica,sans-serif;font-size:12.5px;
          line-height:1.6;color:#c3b2f0;">
  Tu n'as rien demandé ? Ignore ce message. Ton adresse actuelle reste la
  bonne tant que ce lien n'a pas été ouvert.
</p>
```

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
