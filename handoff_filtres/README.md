# Filtres marques & pièces — spécification

Options `2a` et `2b` de `Filtres NEWAVE.dc.html`, dans ce dossier. La
maquette est la référence visuelle et ce document la référence de
comportement. En cas de contradiction, c'est ce document qui gagne.

Les valeurs de la maquette (comptes, noms de marques, photos) sont
fictives. Seule la structure compte.

---

## 1. `/marques` — option 2a

### Ce qui part du panneau (`BrandDirectory.tsx`, contenu du panneau ≈ l. 876–1110)

| Bloc | Lignes env. | Sort |
|---|---|---|
| « Ce qu'elle vend » (familles + types dépliés) | 934–1039 | **retiré** |
| « Vestiaire » | 1041–1063 | **retiré** |
| « Gamme de prix » | 1065–1087 | **retiré** |
| « Catégorie » | 900–932 | **gardé, refait** (§1.2) |

Ils partent aussi de l'état et des calculs :

- `vendus` / `setVendus`, `familleOuverte`, `ventes`, `vendTout`
- `audience` / `setAudience`, `vestiaires`
- `tier` / `setTier`, `gammes`
- leurs `useEffect` d'auto-effacement, leurs branches dans `jetons`,
  `tousCriteres`, `poser`, `retirer`, `reinitialiser`, `actifs`
- le filtre `results` et le tri par poids `vendus`, qui ne servent plus
  à rien
- `rayonsDesTags` : la prop n'a plus d'usage dans l'annuaire. Il faut la
  retirer de `BrandDirectory` et de son calcul dans `app/marques/page.tsx`
  (l. 72–116).

Les suggestions de la barre de requête ne proposent donc plus que des
styles. C'est voulu.

### 1.2 La ligne de styles

- **Une seule rangée qui passe à la ligne** (`flex flex-wrap gap-2`),
  sans titre de groupe, sans colonnes.
- **Exclus du filtre** : `Bijoux`, `Accessoires`, `Chaussures`. Ce sont
  des produits, pas des styles, et c'est la vitrine qui y répond. On les
  masque par une constante locale
  (`const HORS_FILTRE = ["Bijoux","Accessoires","Chaussures"]`), sans
  toucher à `BRAND_CATEGORIES`.
- **Ordre** : celui de `categories` aujourd'hui, du plus fréquent au plus
  rare, puis par ordre alphabétique. Rien à changer.
- **10 visibles**, puis un lien **« + N autres »** (Archivo 700 13px,
  blanc, souligné, `text-underline-offset: 4px`) qui déplie le reste.
  Une fois déplié, il devient « Réduire ».
- **Un style coché reste toujours visible**, même s'il est au-delà du
  10e : on remonte les cochés en tête des 10. Sinon, un style posé
  depuis l'adresse disparaîtrait au rendu.
- Le bouton « Toutes » en tête disparaît : la ligne ne montre plus que
  des styles, et « Tout effacer » plus les croix des jetons font déjà
  ce travail.
- Chaque pastille reprend `chip` / `chipOn` / `chipOff`, avec le compte à
  droite en `opacity-55`. Rien de neuf.

### 1.3 Ce qui ne change pas

- **Les catégories se cumulent en ET** (commentaire l. 256).
- **Le comptage sans soi-même** : une pastille ne s'affiche que si elle
  garde au moins une marque.
- **L'amorçage par l'adresse** : `?cat=` et `?f=style:…`.
- **`?lettre=`**, l'index, la densité.

### 1.4 Les anciens liens

`jetonsDemandes` lit encore `vestiaire:`, `prix:` et `vend:`. Il faut
**ignorer ces jetons sans erreur**, en gardant la lecture de `style:`. Un
lien copié avant le chantier doit ouvrir l'annuaire, simplement sans ces
filtres. `Jeton.tsx` n'a rien à changer : il affiche la famille qu'on
lui passe.

---

## 2. `/pieces` — option 2b

Le code est **déjà proche** : `LigneRayon` sait dessiner un rayon, un
type rangé dessous (`sous`) et le « +2 » des types cochés quand le menu
est replié (`indice`). Ce qui change, c'est le **geste**.

### 2.1 Rayon et type, un seul menu (`PieceDirectory.tsx` ≈ l. 1143–1250)

Aujourd'hui, sur grand écran, le nom du rayon **coche** et un chevron à
part **déplie**. Ça fait deux cibles pour une seule idée. Désormais :

- **Le chevron passe à gauche du nom, dans la même ligne, et la ligne
  entière est le bouton.** Chevron vers la droite quand le rayon est
  fermé, vers le bas quand il est ouvert. Le bouton chevron séparé et
  son espace vide de 28 px partent.
- **Cliquer un rayon fermé** : le rayon est posé en filtre, il se
  déroule, et tout autre rayon ouvert se replie et se retire. **Un seul
  rayon à la fois.**
- **Cliquer le rayon ouvert** : il se replie et se retire, ses types
  avec lui. On revient à « Tout ».
- **Les types** se cochent à plusieurs. Ils s'affichent en retrait sous
  leur rayon, avec la bordure gauche `border-white/15`, et gardent la
  case à cocher dessinée de la maquette : 14 px, rayon 4, blanche une
  fois cochée.
- **Rayon posé sans type coché** : on filtre sur tout le rayon, et le
  jeton affiche « Hauts ». **Dès qu'un type est coché**, le jeton devient
  « Hauts · Chemises » et le jeton du rayon seul disparaît.
- **« Tout voir »** en tête, aligné sur le texte des rayons (retrait de
  la largeur du chevron) : il vide le rayon et les types.
- Les types sont triés **du plus fourni au moins fourni**, et affichés
  **tous** : le plus long rayon, Accessoires, en compte 13, ce qui tient
  sans défilement dans un menu déroulé.

⚠️ **C'est un changement de sémantique** : aujourd'hui `rayons` est un
tableau et on peut en cocher plusieurs. Il passe à **un seul rayon**.
Côté API, `p.getAll("rayon").slice(0, 12)` fonctionne toujours avec une
seule valeur, donc pas besoin de toucher `/api/pieces`. Par contre, un
ancien lien avec deux `?rayon=` doit garder **le premier** et ignorer
les autres.

**Au doigt** (la feuille), c'est la même chose : la pastille de rayon
pose et déplie à la fois, un seul rayon est ouvert, et ses types
s'affichent en pastilles sous la grille, comme aujourd'hui (l. 1229).

### 2.2 Taille et prix, repliés

Deux sections repliables sous le menu des pièces : on clique sur le titre,
le contenu s'ouvre ou se ferme.

- Titre en eyebrow (`TAILLE`, `PRIX`). À droite, **la valeur posée**,
  lisible même quand la section est fermée, puis `+` ou `−`.
- **Repliées par défaut.** Une seule ouverte à la fois.
- **Prix** : on garde `CurseurPrix` tel quel, dans la section. Quand
  elle est fermée et qu'un prix est posé, la plage (« 50 € — 120 € »)
  remonte sur la ligne du titre, comme le fait déjà `apres` au doigt.
- **Taille** : pastilles `XS … XXL`, un seul choix. **Voir §6.1**, ce
  filtre n'existe pas encore.
- **Disponibilité, Marque, Tri** : pas dans la maquette, mais **on les
  garde** tels qu'ils sont, sous Taille et Prix.

### 2.3 Pas de vestiaire

La maquette de départ en affichait un, mais la vitrine n'en a pas dans
le code. Il n'y a **rien à retirer**, seulement à ne pas en ajouter.

---

## 3. Visuel, commun aux deux

Tout reprend les classes existantes. Les valeurs de la maquette, pour
référence :

| Élément | Valeur |
|---|---|
| Pastille style au repos | fond `rgba(255,255,255,.12)`, Archivo 700 13px, `padding 6px 12px 7px`, rayon 999 |
| Pastille style cochée | fond `#fff`, encre `--color-ink`, Archivo 800 |
| Compte dans la pastille | Archivo 800 10px, `opacity .66` au repos, `#6a5a92` quand cochée |
| Rayon ouvert | fond `#1a0840` (≈ `--color-ink`), Archivo 800 13.5px |
| Type (sous-ligne) | Archivo 700 13px, `padding 6px 8px`, rayon 8 |
| Jeton actif | fond blanc, rayon 8, Archivo 800 12px, `×` en `#6a5a92` |

Il n'y a pas de couleur nouvelle et pas de police nouvelle.

## 4. Fichiers concernés

| Fichier | Ce qui change |
|---|---|
| `components/BrandDirectory.tsx` | panneau réduit aux styles (§1), états et calculs morts retirés, `jetonsDemandes` tolérant |
| `app/marques/page.tsx` | le calcul `rayonsDesTags` et sa prop partent |
| `components/PieceDirectory.tsx` | un rayon à la fois, ligne-bouton avec chevron à gauche (§2.1), sections Taille/Prix repliables (§2.2) |
| `app/api/pieces/route.ts` | **seulement si** la taille est retenue (§6.1) |

Ne changent pas : `Jeton.tsx`, `FeuilleFiltres.tsx`, `CurseurPrix.tsx`,
`lib/taxonomy.ts` et le schéma de la base.

## 5. Ordre d'implémentation

1. `/marques` : retirer « Ce qu'elle vend », le vestiaire et le prix du
   panneau et de l'état. Rendre `jetonsDemandes` tolérant.
2. `/marques` : la ligne de styles, les 10 visibles et « + N autres ».
3. `/pieces` : un seul rayon à la fois, la ligne-bouton et son chevron.
4. `/pieces` : Prix en section repliable.
5. `/pieces` : Taille, si le §6.1 est tranché.

## 6. Points à trancher

### 6.1 La taille

`products.sizes` est rempli (`[{label, available}]`, migration 04),
mais les libellés sont bruts : « M », « 42 », « TU », « 38/40 »… Pour un
filtre XS–XXL, il faut :

- une normalisation des libellés (au moins pour les vêtements) ;
- un paramètre `taille` dans `/api/pieces` qui filtre sur le jsonb ;
- et une décision : **n'afficher la section que pour les rayons
  habillés** (Hauts, Bas, Vestes, Maille, Robes), sinon « Bijoux + M »
  ne veut rien dire.

Si c'est trop lourd pour ce chantier, **livre sans la taille** et dis-le.
Le reste ne dépend pas d'elle.

### 6.2 Le prix, en curseur ou en tranches

La maquette montre des tranches (< 50 €, 50–100 €…), parce que c'est plus
rapide à maquetter. **Je propose de garder `CurseurPrix`** : il existe,
il est réglé (le `crantDe`, le différé `REPOS_RAIL`), et des tranches
feraient perdre de la précision.

### 6.3 Les anciens liens

Voir §1.4 et §2.1 : `vestiaire:`, `vend:`, `prix:` sont ignorés sur
`/marques`, et seul le premier `?rayon=` est gardé sur `/pieces`.

## 7. À vérifier avant la revue

- `/marques` : aucune trace de vestiaire, de prix ou de « vend » dans le
  panneau, les suggestions et les jetons.
- Un style posé via `?cat=` au-delà du 10e **reste visible**.
- Ancien lien `?f=style:streetwear,vestiaire:femme,prix:premium` : la
  page s'ouvre sur Streetwear, sans erreur dans la console.
- `/pieces` : ouvrir « Hauts » puis « Bas » replie Hauts et remet ses
  types à zéro.
- `/pieces` : les jetons « Hauts » puis « Hauts · Chemises » s'affichent
  comme décrit en §2.1.
- Tester dans les six ambiances et en mode clair. Au doigt, vérifier la
  feuille : rayon, types en pastilles, prix.
- Au clavier : `Tab` passe d'un rayon à l'autre, `Entrée` ouvre ou
  ferme, et chaque bouton de rayon porte `aria-expanded`.
