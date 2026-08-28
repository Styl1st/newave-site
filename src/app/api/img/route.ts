import { NextResponse } from "next/server";
import { hoteConnu } from "@/lib/hotes-images";

/**
 * Les images des marques, servies depuis NEWAVE.
 *
 * POURQUOI CETTE ROUTE EXISTE. Les visuels sont hébergés chez les
 * marques : quatre-vingt-dix-huit noms de domaine différents pour une
 * seule page d'annuaire. Chacun coûte une résolution DNS, une poignée de
 * main TLS et une connexion neuve, avant même le premier octet d'image.
 * Aucun ne renvoie d'en-tête de cache utilisable, et la plupart ne
 * savent pas redimensionner : on télécharge une photo de deux mille
 * pixels pour la montrer dans une vignette de trois cents.
 *
 * En passant par ici, tout arrive d'un seul domaine, sur une connexion
 * déjà ouverte, en WebP à la bonne taille, et avec un cache d'un an.
 *
 * ELLE NE PEUT PAS CASSER UNE IMAGE, ET C'EST SA PROPRIÉTÉ LA PLUS
 * IMPORTANTE. La dernière tentative de faire ça, avec l'optimiseur de
 * Next, avait remplacé la moitié des couvertures de l'annuaire par des
 * cadres vides : passé son quota mensuel, il renvoie une erreur, et le
 * navigateur affiche le texte alternatif. Ici, le moindre imprévu (hôte
 * injoignable, réponse qui n'est pas une image, fichier trop lourd,
 * hébergeur qui refuse les robots) se solde par une redirection vers
 * l'adresse d'origine. Dans le pire des cas, on retombe exactement sur
 * ce que le site affichait avant cette route.
 *
 * CE QU'ELLE NE FAIT PAS : aller chercher n'importe quoi. L'hébergeur
 * doit déjà figurer dans ta base, seul le https public est accepté, les
 * adresses locales sont refusées, les redirections sont suivies à la
 * main et revalidées à chaque saut, et la réponse doit se déclarer comme
 * une image. Elle refuse enfin d'être ouverte comme une page, pour ne
 * pas servir de tremplin à un lien piégé.
 */

// `sharp` est un module natif : il lui faut le vrai Node, pas l'exécution
// allégée en périphérie.
export const runtime = "nodejs";

/**
 * Les largeurs qu'on accepte de produire.
 *
 * Laisser passer n'importe quel nombre, c'est autoriser n'importe qui à
 * fabriquer des milliers de variantes de la même image et à remplir le
 * cache avec. On s'aligne sur les tailles réellement demandées par le
 * site, et l'on arrondit tout le reste au palier supérieur.
 */
const LARGEURS = [64, 160, 320, 400, 500, 600, 640, 800, 1000, 1200, 1600, 2400];

/** Au-delà, on ne télécharge pas : on renvoie vers la source. */
const POIDS_MAX = 12 * 1024 * 1024;

/** Un an. L'adresse contient la largeur, donc le contenu ne change jamais. */
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

/**
 * Ce qu'on ne touche pas du tout, et qu'on renvoie donc chez l'hébergeur.
 *
 * Un SVG est un fichier texte : le rasteriser l'abîmerait, et le relayer
 * tel quel était pire encore, puisqu'il arrivait alors SANS compression
 * alors que son CDN d'origine le gzippait. C'est ce qui a fait tomber le
 * taux de ressources compressées de 100 % à 12 %.
 *
 * Un GIF animé, lui, perdrait son animation en passant par sharp, et le
 * relayer entier ferait transiter tout son poids par le serveur pour
 * n'économiser strictement rien.
 *
 * Dans les deux cas l'hébergeur fait mieux que nous. On lui rend la
 * main.
 */
const A_LA_SOURCE = ["image/svg+xml", "image/gif"];

/**
 * De combien un logo doit maigrir pour qu'on garde la version rognée.
 *
 * Sous ce seuil, l'image n'avait pas vraiment de marge : on préfère
 * alors l'original, parce qu'un rognage qui ne sert à rien peut quand
 * même mordre d'un pixel sur un trait fin.
 */
const ROGNAGE_UTILE = 0.08;

/** Les adresses qu'un serveur n'a aucune raison d'aller chercher. */
function estInterdite(u: URL): boolean {
  if (u.protocol !== "https:") return true;

  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // Une adresse IP écrite en clair, v4 comme v6.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":") || h.startsWith("[")) return true;

  return false;
}

/** Une adresse lisible, ou rien. Ne lève jamais. */
function adresseOuRien(brute: string | null): string | null {
  if (!brute) return null;
  try {
    return new URL(brute).toString();
  } catch {
    return null;
  }
}

/**
 * L'ULTIME FILET.
 *
 * Chaque opération risquée est déjà protégée en dessous, mais « chaque
 * opération que j'ai pensé à protéger » n'est pas la même chose que
 * « toutes ». Une exception oubliée sort en erreur 500, et une erreur
 * 500 dans un attribut `src`, c'est un cadre cassé sur la carte d'une
 * marque.
 *
 * La promesse de cette route est qu'elle ne peut pas casser une image.
 * Elle ne tient que si elle est vraie même quand je me suis trompé.
 */
export async function GET(requete: Request) {
  try {
    return await servir(requete);
  } catch {
    const cible = adresseOuRien(new URL(requete.url).searchParams.get("u"));
    if (cible) return NextResponse.redirect(cible, 302);
    return new NextResponse("Image indisponible", { status: 400 });
  }
}

async function servir(requete: Request) {
  /*
   * CETTE ROUTE SERT DES IMAGES, PAS DES PAGES.
   *
   * Elle peut rediriger vers l'adresse d'origine, et c'est indispensable
   * pour ne jamais casser un visuel. Mais une redirection ouverte, c'est
   * aussi le classique du hameçonnage : on envoie un lien qui commence
   * par newavesphere.fr, la victime le croit sur parole, et elle atterrit
   * ailleurs. Google finit d'ailleurs par signaler les sites qui en
   * laissent traîner.
   *
   * Le navigateur dit lui-même ce qu'il est en train de faire.
   * `Sec-Fetch-Dest` vaut `image` quand la demande vient d'une balise
   * `img`, et `document` quand quelqu'un a cliqué sur un lien. On refuse
   * le second cas : le visiteur d'un lien piégé tombe sur un refus, et
   * les images du site continuent de s'afficher normalement.
   *
   * L'en-tête absent est traité comme une image. Un vieux navigateur qui
   * ne l'envoie pas doit voir le site ; c'est la navigation ANNONCÉE
   * qu'on bloque, pas l'anonymat.
   */
  const destination = requete.headers.get("sec-fetch-dest");
  if (destination && destination !== "image" && destination !== "empty") {
    return new NextResponse("Cette adresse ne sert qu'à afficher des images.", {
      status: 400,
      // Surtout pas de mise en cache d'un refus : la même adresse doit
      // rester servie normalement à la balise `img` de la page.
      headers: { "cache-control": "no-store", vary: "Sec-Fetch-Dest" },
    });
  }

  const params = new URL(requete.url).searchParams;
  const brute = params.get("u");
  if (!brute) return new NextResponse("Adresse manquante", { status: 400 });

  let source: URL;
  try {
    source = new URL(brute);
  } catch {
    return new NextResponse("Adresse illisible", { status: 400 });
  }

  /**
   * Le repli, employé à chaque contrariété : l'image telle qu'elle est.
   *
   * La redirection est gardée une heure. Un hébergeur qui nous refuse
   * l'entrée nous la refusera encore dans dix minutes, et sans ce cache
   * chaque affichage de la page relancerait la fonction pour aboutir au
   * même constat.
   */
  const versLaSource = () =>
    NextResponse.redirect(source.toString(), {
      status: 302,
      headers: { "cache-control": "public, max-age=3600", vary: "Sec-Fetch-Dest" },
    });

  /*
   * REFUSER D'ALLER CHERCHER UNE IMAGE N'EST PAS UNE RAISON DE LA
   * CASSER, et c'est la leçon d'Aldente Lisboa.
   *
   * Je répondais 400 sur tout ce que je n'avais pas le droit de
   * récupérer, à commencer par les adresses en `http` tout court. Le
   * navigateur recevait donc une erreur là où il attendait une image, et
   * affichait le cadre gris avec le nom de la marque dedans. Or ces
   * adresses fonctionnaient très bien avant que cette route existe :
   * c'est moi qui les cassais.
   *
   * On rend la main au navigateur, qui ira la chercher lui-même comme il
   * le faisait hier. Le garde-fou reste entier là où il sert : c'est le
   * SERVEUR qui n'a pas le droit de se promener, pas le visiteur.
   */
  if (estInterdite(source)) {
    // Seuls `http` et `https` se redirigent. Le reste n'a rien à faire
    // dans un attribut `src`, et servirait à autre chose qu'à afficher
    // une image.
    if (source.protocol === "http:" || source.protocol === "https:") return versLaSource();
    return new NextResponse("Adresse refusée", { status: 400 });
  }

  /*
   * ON NE VA CHERCHER QUE CHEZ LES HÉBERGEURS DE TA BASE.
   *
   * Sans ça, la route télécharge n'importe quoi pour n'importe qui, et
   * c'est ton serveur qui apparaît dans les journaux du site visité. La
   * liste se construit toute seule à partir des marques et des pièces
   * publiées : voir `lib/hotes-images`.
   *
   * Un hôte inconnu n'est pas une erreur, c'est une image qu'on
   * n'optimise pas. Elle s'affiche comme avant l'existence de cette
   * route.
   */
  if (!(await hoteConnu(source.hostname))) return versLaSource();

  const demandee = Number(params.get("w")) || 640;
  const largeur = LARGEURS.find((l) => l >= demandee) ?? LARGEURS[LARGEURS.length - 1];

  /*
   * ON SUIT LES REDIRECTIONS, MAIS EN LES REGARDANT UNE PAR UNE.
   *
   * Elles étaient refusées d'emblée, et l'analyse en a compté
   * trente-six : les CDN de boutiques renvoient très couramment vers une
   * autre adresse avant de servir l'image. Chacune retombait donc sur le
   * repli, ce qui gâchait à la fois le gain et le score.
   *
   * On ne peut pas pour autant laisser `fetch` les suivre tout seul :
   * une redirection peut pointer vers le réseau interne, et c'est le
   * chemin classique pour faire sortir un serveur de chez lui. On avance
   * donc à la main, en revalidant l'adresse à chaque étape, et on
   * s'arrête à trois sauts.
   */
  let reponse: Response;
  try {
    reponse = await suivre(source);
  } catch {
    return versLaSource();
  }

  async function suivre(depart: URL): Promise<Response> {
    let ici = depart;

    for (let saut = 0; saut < 3; saut++) {
      const r = await unAllerSimple(ici);
      if (r.status < 300 || r.status >= 400) return r;

      const suite = r.headers.get("location");
      if (!suite) return r;

      const prochaine = new URL(suite, ici);
      // Une redirection vers l'intérieur du réseau : on s'arrête là.
      if (estInterdite(prochaine)) return r;
      ici = prochaine;
    }

    return unAllerSimple(ici);
  }

  async function unAllerSimple(u: URL): Promise<Response> {
    return fetch(u, {
      /*
       * On se présente comme un navigateur. Beaucoup de CDN de boutiques
       * refusent sèchement tout ce qui n'en a pas l'air, pour empêcher
       * qu'on affiche leurs images ailleurs : sans cet en-tête, une
       * bonne part des hôtes répondait 403.
       */
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
      },
      // Une redirection peut mener n'importe où, y compris à l'intérieur
      // du réseau. On préfère la renvoyer au navigateur, qui la suivra
      // lui-même sans nous faire courir de risque.
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
  }

  if (!reponse.ok || !reponse.body) return versLaSource();

  const type = (reponse.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!type.startsWith("image/")) return versLaSource();

  // On le sait avant d'avoir lu un seul octet du corps : inutile de
  // télécharger une image qu'on va de toute façon renvoyer chez elle.
  if (A_LA_SOURCE.includes(type)) return versLaSource();

  const annonce = Number(reponse.headers.get("content-length"));
  if (annonce && annonce > POIDS_MAX) return versLaSource();

  let octets: Buffer;
  try {
    const brut = await reponse.arrayBuffer();
    if (brut.byteLength > POIDS_MAX) return versLaSource();
    octets = Buffer.from(brut);
  } catch {
    return versLaSource();
  }

  const entetes = {
    "content-type": type,
    "cache-control": CACHE,
    /*
     * La lecture de la couleur dominante d'une carte se fait dans une
     * toile, et une toile refuse de rendre ses pixels si l'image vient
     * d'ailleurs sans autorisation. C'est ce qui empêchait la teinte de
     * marcher chez la plupart des hébergeurs. Servies d'ici, elles sont
     * toutes lisibles.
     */
    "access-control-allow-origin": "*",
    // La réponse dépend de la façon dont le navigateur a demandé
    // l'adresse : le cache doit le savoir.
    vary: "Sec-Fetch-Dest",
  };

  /*
   * `sharp` est chargé à la volée et son absence n'est pas une erreur.
   *
   * Tant qu'il n'est pas installé, la route relaie l'image d'origine :
   * on garde le domaine unique et le cache d'un an, on perd seulement la
   * réduction de taille. Le site marche avant comme après
   * l'installation, ce qui évite d'avoir à synchroniser un déploiement
   * et un `npm install`.
   */
  try {
    const { default: sharp } = await import("sharp");

    // Certaines photos de boutique portent leur orientation dans les
    // métadonnées. Sans ça, elles arrivent couchées.
    let image = sharp(octets).rotate();

    /*
     * LE ROGNAGE DES MARGES VIDES, DEMANDÉ SEULEMENT POUR LES LOGOS.
     *
     * Un logo de marque est très souvent un fichier large et presque
     * vide : le mot au milieu, et des centaines de pixels de blanc ou de
     * transparent tout autour, parce qu'il a été exporté pour un
     * en-tête de site. Le site, lui, le reçoit comme une bannière : il
     * le montre en entier pour ne pas couper le nom, et le mot se
     * retrouve écrasé en un mince bandeau au milieu de la carte.
     *
     * Ces marges ne portent aucune information. On les retire à la
     * source, et le logo occupe enfin sa vignette.
     *
     * ON NE LE FAIT PAS SUR LES PHOTOS. Sur une photo de pièce, un bord
     * uniforme fait partie de l'image : un fond de studio clair serait
     * pris pour une marge et rogné jusqu'au vêtement.
     */
    if (params.get("t") === "1") {
      try {
        // `metadata` ne lit que l'en-tête du fichier : c'est gratuit
        // comparé à un décodage, et il faut connaître la taille de
        // départ pour savoir si le rognage a servi à quelque chose.
        const avant = await sharp(octets).metadata();

        const essai = await sharp(octets).rotate().trim({ threshold: 12 }).toBuffer({
          resolveWithObject: true,
        });

        const gagne =
          avant.width && avant.height
            ? 1 - (essai.info.width * essai.info.height) / (avant.width * avant.height)
            : 0;

        // Rogner sans rien gagner ne vaut pas le risque de mordre sur un
        // trait fin : on ne garde l'essai que s'il change vraiment
        // quelque chose.
        if (gagne > ROGNAGE_UTILE && essai.info.width > 8 && essai.info.height > 8) {
          image = sharp(essai.data);
        }
      } catch {
        // Un logo d'une seule couleur fait échouer le rognage : sharp ne
        // trouve alors plus rien à garder. On reste sur l'original.
      }
    }

    /*
     * ON N'AGRANDIT JAMAIS, PAS MÊME UN LOGO ROGNÉ.
     *
     * J'avais autorisé l'agrandissement après rognage, pour qu'un logo
     * débarrassé de ses marges retrouve la taille demandée. C'était une
     * erreur, et elle expliquait les logos flous : en renvoyant du
     * quatre cents pixels étiré depuis du cent quatre-vingts, on
     * empêchait le site de voir que le fichier était trop petit. Il
     * croyait tenir une image nette et l'affichait telle quelle.
     *
     * La taille renvoyée doit dire la vérité sur la définition
     * disponible. C'est elle qui décide, plus haut, si la marque mérite
     * son logo ou son défilé de pièces : voir `IllustrationMarque`.
     */
    const cadree = image.resize({ width: largeur, withoutEnlargement: true });

    /*
     * LE FOND UNI D'UN LOGO DEVIENT TRANSPARENT.
     *
     * C'est l'idée que tu avais eue, et c'est la bonne : plutôt que de
     * chercher à masquer les marges autour d'un logo, on enlève le fond
     * du fichier pour que la carte se voie à travers. Le logo prend
     * alors la couleur de l'ambiance choisie, quelle qu'elle soit, sans
     * qu'on ait à la connaître ici.
     *
     * Ça règle le problème par le bon bout. Jusqu'ici on choisissait
     * entre deux défauts : montrer le logo en entier et laisser deux
     * bandes de blanc sur les côtés, ou remplir la carte en le rognant.
     * Un logo détouré n'a plus de bandes à cacher, donc plus rien à
     * rogner.
     *
     * ON NE LE FAIT QUE SUR LES LOGOS, ET SEULEMENT SI LE FOND EST
     * VRAIMENT UNI. Le détail des précautions est dans `detourer`.
     */
    /*
     * `IMG_DETOURAGE=0` coupe le détourage sans toucher au code. Il est
     * récent, il touche aux pixels eux-mêmes, et c'est le genre de
     * traitement dont on ne découvre les cas particuliers qu'en
     * production : mieux vaut pouvoir l'éteindre en une variable que
     * défaire un déploiement.
     */
    const detourage = params.get("t") === "1" && process.env.IMG_DETOURAGE !== "0";
    const finale = detourage ? await detourer(sharp, cadree) : cadree;

    const reduite = await finale.webp({ quality: 78 }).toBuffer();

    return new NextResponse(new Uint8Array(reduite), {
      headers: { ...entetes, "content-type": "image/webp" },
    });
  } catch {
    /*
     * Sharp n'a pas su lire ces octets. Le plus souvent, c'est qu'il ne
     * s'agit pas d'une image : une page d'erreur servie avec un
     * `content-type` d'image, ce que font beaucoup d'hébergeurs quand ils
     * refusent une requête. Les relayer tels quels afficherait un cadre
     * cassé. On rend la main au navigateur, qui a de meilleures chances
     * que nous auprès de cet hôte.
     */
    return versLaSource();
  }
}

/* ------------------------------------------------------------------ */

/**
 * La part de l'image qu'on accepte d'effacer.
 *
 * Au-delà, ce n'était pas un fond qu'on retirait, c'était le sujet.
 */
const SURFACE_MAX = 0.88;

/** Sous cet écart, un pixel EST le fond. Il disparaît entièrement. */
const FOND_CERTAIN = 12;

/** Au-delà, un pixel appartient au dessin. Il reste intact. */
const DESSIN_CERTAIN = 44;

/**
 * Le fond uni d'un logo, rendu transparent.
 *
 * POURQUOI PAS EN CSS. Le mélange qui efface le blanc d'une image
 * efface aussi les logos blancs sur fond noir, qui disparaîtraient
 * purement et simplement. Le navigateur ne sait pas ce qui est fond et
 * ce qui est dessin ; ici, on regarde les pixels, donc on peut le
 * savoir.
 *
 * TROIS PRÉCAUTIONS, ET AUCUNE N'EST FACULTATIVE.
 *
 * On ne touche à rien si le bord n'est pas d'une seule couleur : un
 * dégradé, une photo, une bannière illustrée gardent tout leur fond.
 * On ne touche à rien non plus si cette couleur n'est ni très claire ni
 * très sombre : un fond rouge vif ou bleu marine est un choix
 * graphique de la marque, pas un blanc d'export à nettoyer.
 * Et la transparence est PROGRESSIVE entre les deux seuils : un
 * découpage net laisserait un liseré d'escalier sur chaque lettre,
 * puisque les bords d'un dessin sont toujours adoucis.
 *
 * En cas de doute ou d'échec, on renvoie l'image telle qu'elle est
 * arrivée. Un fond blanc n'a jamais cassé personne.
 */
async function detourer(
  sharp: typeof import("sharp"),
  image: import("sharp").Sharp
): Promise<import("sharp").Sharp> {
  try {
    const { data, info } = await image
      .clone()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width: l, height: h, channels: c } = info;
    if (c !== 4 || l < 8 || h < 8) return image;

    const px = (x: number, y: number) => (y * l + x) * c;

    /*
     * On lit le bord, et pas seulement les quatre coins. Un coin peut
     * être occupé par le dessin, ou par un artefact de compression :
     * une trentaine de points répartis tout autour donnent une réponse
     * autrement plus sûre pour le même prix.
     */
    const bord: number[][] = [];
    const pas = Math.max(1, Math.floor(l / 12));
    const pasV = Math.max(1, Math.floor(h / 12));
    for (let x = 0; x < l; x += pas) {
      bord.push([data[px(x, 0)], data[px(x, 0) + 1], data[px(x, 0) + 2], data[px(x, 0) + 3]]);
      const b = px(x, h - 1);
      bord.push([data[b], data[b + 1], data[b + 2], data[b + 3]]);
    }
    for (let y = 0; y < h; y += pasV) {
      const g = px(0, y);
      const d = px(l - 1, y);
      bord.push([data[g], data[g + 1], data[g + 2], data[g + 3]]);
      bord.push([data[d], data[d + 1], data[d + 2], data[d + 3]]);
    }

    // Le fond est déjà transparent : il n'y a rien à faire, et c'est
    // le cas le plus fréquent sur un logo bien exporté.
    if (bord.every((p) => p[3] < 24)) return image;

    const moyenne = [0, 1, 2].map((i) => bord.reduce((t, p) => t + p[i], 0) / bord.length);

    // Le bord doit être d'UNE couleur. Sinon c'est une image, pas un
    // fond, et on n'y touche pas.
    const dispersion = Math.max(
      ...bord.map((p) => Math.max(...[0, 1, 2].map((i) => Math.abs(p[i] - moyenne[i]))))
    );
    if (dispersion > 20) return image;

    // Ni très clair ni très sombre : c'est une couleur choisie, on la
    // respecte.
    const clair = moyenne.every((v) => v > 226);
    const sombre = moyenne.every((v) => v < 34);
    if (!clair && !sombre) return image;

    const sortie = Buffer.from(data);
    let effaces = 0;
    let pixels = 0;

    for (let i = 0; i < data.length; i += c) {
      pixels++;
      const ecart = Math.max(
        Math.abs(data[i] - moyenne[0]),
        Math.abs(data[i + 1] - moyenne[1]),
        Math.abs(data[i + 2] - moyenne[2])
      );

      if (ecart <= FOND_CERTAIN) {
        sortie[i + 3] = 0;
        effaces++;
      } else if (ecart < DESSIN_CERTAIN) {
        // La zone de transition : les bords adoucis des lettres.
        const part = (ecart - FOND_CERTAIN) / (DESSIN_CERTAIN - FOND_CERTAIN);
        sortie[i + 3] = Math.round(data[i + 3] * part);
      }
    }

    /*
     * SI PRESQUE TOUT A DISPARU, C'EST QU'ON S'EST TROMPÉ.
     *
     * Un logo, c'est un dessin posé sur un fond : le fond occupe la
     * majeure partie de l'image, mais pas la totalité. Quand il ne
     * reste presque rien, c'est que la couleur qu'on a prise pour le
     * fond était en réalité celle du dessin — un lettrage très clair
     * sur un blanc cassé, par exemple. On rend alors l'image intacte.
     *
     * Ce garde-fou existe parce que le symptôme est le pire de tous :
     * la marque perd purement et simplement son illustration, et rien
     * n'indique pourquoi.
     */
    if (effaces / Math.max(pixels, 1) > SURFACE_MAX) return image;

    return sharp(sortie, { raw: { width: l, height: h, channels: 4 } });
  } catch {
    return image;
  }
}
