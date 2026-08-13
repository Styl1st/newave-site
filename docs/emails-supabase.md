# Les emails envoyés par le site

Trois gabarits à coller dans Supabase, aux couleurs de NEWAVE SPHERE.

**Où** : Supabase → Authentication → **Emails** (ou *Email Templates*).
Chaque gabarit a son onglet. Tu remplaces l'objet et le contenu, tu
enregistres.

---

## Deux choses différentes, à ne pas confondre

**Le contenu du message** se règle dans les gabarits ci-dessous.
Gratuit, immédiat, aucune condition.

**L'expéditeur** — le nom et l'adresse qui s'affichent dans la boîte de
réception — ne se change **pas** ici. Tant que tu utilises l'expéditeur
intégré de Supabase, tes emails partiront de
`noreply@mail.app.supabase.io` au nom de « Supabase Auth », quel que
soit le contenu. Pour qu'ils viennent de `contact@newavesphere.fr`, il
faut brancher ton propre serveur d'envoi dans Authentication → **SMTP
Settings**, avec les identifiants de ton OVH.

Fais-le avant d'ouvrir la bêta, pour deux raisons : l'expéditeur
intégré est limité à quelques messages par heure, et un email de
confirmation venant d'un domaine inconnu finit souvent dans les
indésirables.

---

## Les variables disponibles

| Variable | Ce qu'elle contient |
| --- | --- |
| `{{ .ConfirmationURL }}` | Le lien à cliquer. Le plus important. |
| `{{ .Email }}` | L'adresse de la personne. |
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
  <body style="margin:0;padding:0;background-color:#2a1160;">
    <!-- Le texte d'aperçu, celui qu'on lit dans la liste des messages
         avant même d'ouvrir. Masqué dans le corps du mail. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Un clic et ton compte est actif.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background-color:#2a1160;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="max-width:560px;background-color:#33217f;border-radius:20px;
                        border:1px solid rgba(255,255,255,0.22);">
            <tr>
              <td style="padding:36px 32px 8px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;
                          letter-spacing:2px;text-transform:uppercase;color:#b49bf0;">
                  NEWAVE SPHERE
                </p>
                <h1 style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                           font-size:26px;line-height:1.2;color:#ffffff;">
                  {{ if .Data.display_name }}Bienvenue {{ .Data.display_name }}.{{ else }}Bienvenue.{{ end }}
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px 0 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                          line-height:1.65;color:#e6dcfb;">
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
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background-color:#ffffff;border-radius:999px;">
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
                          line-height:1.6;color:#b49bf0;">
                  Le bouton ne fonctionne pas ? Copie cette adresse dans ton
                  navigateur :
                </p>
                <p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                          font-size:12px;line-height:1.5;word-break:break-all;color:#8fa8f0;">
                  {{ .ConfirmationURL }}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:26px 32px 34px 32px;">
                <p style="margin:0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.18);
                          font-family:Arial,Helvetica,sans-serif;font-size:12.5px;
                          line-height:1.6;color:#b49bf0;">
                  Tu n'as rien demandé ? Ignore ce message, aucun compte ne sera créé.
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:22px 0 0 0;font-family:Arial,Helvetica,sans-serif;
                    font-size:11.5px;color:#9a86c9;">
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

Reprends exactement le gabarit ci-dessus en remplaçant le titre, le
paragraphe, le bouton et la dernière ligne :

```html
<h1 style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;
           font-size:26px;line-height:1.2;color:#ffffff;">
  Un nouveau mot de passe
</h1>
```

```html
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;
          line-height:1.65;color:#e6dcfb;">
  Quelqu'un a demandé à réinitialiser le mot de passe du compte
  <strong style="color:#ffffff;">{{ .Email }}</strong>. Si c'est toi, choisis-en
  un nouveau. Le lien ne sert qu'une fois et expire vite.
</p>
```

```html
<a href="{{ .ConfirmationURL }}"
   style="display:inline-block;padding:14px 30px;
          font-family:Arial,Helvetica,sans-serif;font-size:15px;
          font-weight:bold;color:#170a33;text-decoration:none;">
  Choisir un nouveau mot de passe
</a>
```

```html
<p style="margin:0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.18);
          font-family:Arial,Helvetica,sans-serif;font-size:12.5px;
          line-height:1.6;color:#b49bf0;">
  Tu n'as rien demandé ? Ignore ce message. Ton mot de passe actuel reste
  valable, et personne d'autre ne peut le changer sans ce lien.
</p>
```

---

## 3. Changement d'adresse email

**Objet**

```
Confirme ta nouvelle adresse
```

Même gabarit, avec `{{ .NewEmail }}` à la place de `{{ .Email }}` — cette
variable n'existe que dans ce modèle-là.

---

## Ce qu'il faut savoir avant de bricoler ces gabarits

**Écris en tableaux, pas en `flex` ni en `grid`.** Les clients mail sont
restés en 2005 : Outlook rend le HTML avec le moteur de Word. Le
`flex` y est simplement ignoré, et la mise en page s'effondre.

**Tous les styles en ligne.** Une feuille de style externe, ou même une
balise `<style>`, est retirée par Gmail dans certains cas.

**Pas de dégradé, pas de flou, pas de police web.** Le fond uni violet
du gabarit n'est pas un choix de paresse : c'est le seul qui s'affiche
pareil partout. Arial est présente sur toutes les machines.

**Toujours laisser l'adresse en clair sous le bouton.** Certaines
messageries d'entreprise réécrivent les liens, et le bouton devient
alors inopérant.

**Un détail à connaître** : certains antivirus de messagerie ouvrent les
liens des emails avant toi, pour les vérifier. Comme le lien de
confirmation ne sert qu'une fois, il est parfois consommé avant que la
personne ne clique, et elle voit alors « lien expiré ». Si ça remonte
souvent, dis-le-moi : on passera à un code à six chiffres, qui ne
souffre pas de ce problème.

**Teste sur toi d'abord.** Crée un compte avec une adresse jetable et
regarde le rendu sur téléphone autant que sur ordinateur. C'est le seul
moyen fiable.
