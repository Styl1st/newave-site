import { createPublicClient } from "./supabase/public";

/**
 * Les hébergeurs d'images que NEWAVE accepte d'aller consulter.
 *
 * POURQUOI CETTE LISTE EXISTE. `/api/img` va chercher une image à
 * l'adresse qu'on lui donne. Sans garde-fou, n'importe qui peut lui
 * faire télécharger n'importe quoi depuis ton serveur : il devient un
 * intermédiaire anonyme, et c'est ton nom de domaine qui apparaît dans
 * les journaux du site visité.
 *
 * La liste se construit toute seule à partir de ta base. Ce sont les
 * hébergeurs de tes marques et de tes pièces, donc exactement ceux dont
 * le site a besoin, sans qu'il y ait jamais rien à tenir à jour.
 *
 * UN HÔTE ABSENT NE CASSE RIEN, et c'était la condition pour que je
 * m'autorise ce filtre. Il n'est simplement pas optimisé : la route
 * renvoie le navigateur vers l'adresse d'origine, c'est-à-dire vers le
 * comportement d'avant. Une marque ajoutée il y a deux minutes affiche
 * donc son logo normalement, sans passer par nous, jusqu'au prochain
 * rafraîchissement.
 */

/** Dix minutes. Une marque nouvelle attend au pire ce délai. */
const DUREE = 10 * 60 * 1000;

/**
 * Le plus souvent qu'on interroge la base.
 *
 * Sans ce frein, il suffirait d'enchaîner les requêtes avec des adresses
 * inconnues pour déclencher une lecture à chaque fois, et le filtre
 * censé protéger le serveur deviendrait le moyen de le saturer.
 */
const REPOS = 30 * 1000;

let hotes: Set<string> | null = null;
let expire = 0;
let derniereLecture = 0;

function ajouter(liste: Set<string>, adresse: string | null | undefined) {
  if (!adresse) return;
  try {
    liste.add(new URL(adresse).hostname.toLowerCase());
  } catch {
    // Une adresse malformée en base n'a pas à faire tomber la liste
    // entière : on l'ignore et on continue.
  }
}

/*
 * RIEN DE CE QUI SE PASSE ICI NE DOIT CASSER UNE IMAGE.
 *
 * Cette fonction interroge le réseau. Une base momentanément
 * injoignable, une clé absente, une coupure : n'importe laquelle de ces
 * pannes levait une exception qui remontait jusqu'à la route, laquelle
 * répondait alors 500. Le navigateur recevait une erreur là où il
 * attendait une image, et affichait un cadre cassé.
 *
 * Une liste d'hébergeurs est un CONFORT : elle sert à décider si l'on
 * optimise. Ne pas savoir doit vouloir dire « on n'optimise pas », et
 * jamais « on n'affiche pas ». Tout est donc attrapé ici, au plus près
 * de ce qui peut échouer.
 */
async function relire(): Promise<void> {
  derniereLecture = Date.now();

  const supabase = createPublicClient();
  if (!supabase) return;

  const liste = new Set<string>();

  /*
   * Les marques et les pièces EN MÊME TEMPS.
   *
   * Cette lecture tombe sur la première image demandée à une instance
   * qui vient de démarrer, et cette image attend qu'elle finisse. Les
   * deux requêtes étaient faites l'une après l'autre alors qu'elles ne
   * dépendent en rien l'une de l'autre : c'était un aller-retour vers la
   * base de payé pour rien, sur chaque démarrage à froid.
   *
   * `shop_url` et `website_url` comptent aussi, parce qu'une boutique
   * sert très souvent ses images depuis son propre nom de domaine. Côté
   * pièces, on ne lit que la vignette et non le carrousel entier : les
   * photos d'une même pièce viennent du même hôte.
   */
  const [marques, pieces] = await Promise.all([
    supabase
      .from("brands")
      .select("logo_url, cover_url, shop_url, website_url")
      .eq("status", "published"),
    supabase
      .from("products")
      .select("image_url")
      .eq("status", "published")
      .not("image_url", "is", null)
      .limit(5000),
  ]);

  for (const m of marques.data ?? []) {
    ajouter(liste, m.logo_url);
    ajouter(liste, m.cover_url);
    ajouter(liste, m.shop_url);
    ajouter(liste, m.website_url);
  }

  for (const p of pieces.data ?? []) ajouter(liste, p.image_url);

  // Une base injoignable ne doit pas vider la liste qu'on avait :
  // mieux vaut une liste un peu vieille que plus de liste du tout.
  if (liste.size > 0) {
    hotes = liste;
    expire = Date.now() + DUREE;
  }
}

let enCours: Promise<void> | null = null;

/** `relire`, mais partagée entre toutes les demandes qui arrivent pendant qu'elle tourne. */
function relireUneFois(): Promise<void> {
  if (!enCours) {
    enCours = relire().finally(() => {
      enCours = null;
    });
  }
  return enCours;
}

/** Cet hébergeur apparaît-il quelque part dans la base ? */
export async function hoteConnu(hote: string): Promise<boolean> {
  const nom = hote.toLowerCase();
  const maintenant = Date.now();

  try {
    /*
     * UNE SEULE LECTURE À LA FOIS, ET ON N'ATTEND QUE SI L'ON N'A RIEN.
     *
     * Une page d'annuaire demande une vingtaine d'images d'un coup. Sur
     * une instance neuve, chacune lançait sa propre relecture de la base
     * et l'attendait : vingt fois le même travail, en parallèle. Elles
     * partagent maintenant la même.
     *
     * Et une liste expirée reste bonne à consulter pendant qu'on la
     * rafraîchit en arrière-plan : les hôtes ne disparaissent pas en dix
     * minutes, et la personne qui charge la page n'a pas à attendre la
     * base pour ça.
     */
    if (!hotes) await relireUneFois();
    else if (maintenant > expire) void relireUneFois().catch(() => {});
    if (hotes?.has(nom)) return true;

    /*
     * Une marque enregistrée à l'instant n'est pas encore dans la liste.
     * On s'autorise une relecture immédiate, mais pas plus d'une toutes
     * les trente secondes.
     */
    if (maintenant - derniereLecture > REPOS) {
      await relireUneFois();
      return hotes?.has(nom) ?? false;
    }

    return false;
  } catch {
    // On ne sait pas, donc on n'optimise pas. L'image s'affichera
    // quand même, servie par son hébergeur.
    return false;
  }
}
