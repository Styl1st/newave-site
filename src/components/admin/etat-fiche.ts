"use client";

import { useEffect, useRef, useState } from "react";
import { unAcces } from "@/lib/acces";
import { uneAudience } from "@/lib/audience";
import type { Brand } from "@/lib/types";

/**
 * Ce que le formulaire de la fiche marque a sous les doigts, à l'instant.
 *
 * POURQUOI RELIRE LE FORMULAIRE PLUTÔT QUE DE LE CONTRÔLER. L'aperçu et
 * la check-list ont besoin des valeurs en cours de saisie ; en faire des
 * champs contrôlés aurait voulu dire réécrire ici les vingt champs que
 * `saveBrand` attend, au caractère près, et donc en tenir une deuxième
 * définition — celle qui se désynchronise le jour où l'on ajoute un
 * champ. Les champs restent donc ceux du dépôt, non contrôlés, et l'on
 * se contente de LIRE ce qu'ils portent.
 *
 * Corollaire : tout ce fichier ne fait que de la lecture. Rien ici
 * n'écrit dans un champ, rien n'est envoyé au serveur autrement que par
 * le formulaire lui-même.
 */
export type ValeursFiche = {
  name: string;
  /**
   * L'adresse de la page, celle qui s'écrit dans l'URL.
   *
   * Elle ne s'appelle pas `slug` ici, et le champ non plus : dans
   * l'espace marque, `slug` est ce qui DÉSIGNE la marque auprès de
   * `requireManagedBrand`. Un seul nom pour deux sens dans le même
   * formulaire, et c'est l'identité de la marque qu'on enregistre qui
   * change en cours de route. Le champ visible s'appelle donc
   * `nouveau_slug`, et le champ caché qui désigne la marque garde
   * `slug`, comme dans toutes les autres actions de l'espace marque.
   */
  adresse: string;
  tagline: string;
  description: string;
  cover_url: string;
  cover_video_url: string;
  logo_url: string;
  country: string;
  city: string;
  founded_year: string;
  price_tier: string;
  shop_url: string;
  instagram: string;
  audience: string;
  acces: string;
  categories: string[];
  featured: boolean;
};

/**
 * Les champs qui se comparent comme du texte.
 *
 * Rangés à part des catégories et de la mise à la une, qui ne sont ni
 * l'un ni l'autre une chaîne : c'est le seul intérêt de cette liste.
 */
const TEXTES = [
  "name",
  "adresse",
  "tagline",
  "description",
  "cover_url",
  "cover_video_url",
  "logo_url",
  "country",
  "city",
  "founded_year",
  "price_tier",
  "shop_url",
  "instagram",
  "audience",
  "acces",
] as const;

/** L'état de départ, celui que le serveur vient d'envoyer. */
export function valeursDeLaMarque(brand: Brand): ValeursFiche {
  const propre = (valeur: string | null | undefined) => (valeur ?? "").trim();

  return {
    name: propre(brand.name),
    adresse: propre(brand.slug),
    tagline: propre(brand.tagline),
    description: propre(brand.description),
    cover_url: propre(brand.cover_url),
    cover_video_url: propre(brand.cover_video_url),
    logo_url: propre(brand.logo_url),
    country: propre(brand.country),
    city: propre(brand.city),
    /*
     * L'année en texte, comme la donnera le `<select>`.
     *
     * Comparer un nombre à ce que rend un formulaire — toujours une
     * chaîne — signalait une modification à chaque ouverture de page,
     * et la barre d'enregistrement s'affichait sans que personne
     * n'ait rien touché.
     */
    founded_year: brand.founded_year ? String(brand.founded_year) : "",
    price_tier: brand.price_tier || "intermediaire",
    shop_url: propre(brand.shop_url),
    instagram: propre(brand.instagram),
    audience: uneAudience(brand.audience),
    acces: unAcces(brand.acces),
    categories: brand.categories ?? [],
    featured: Boolean(brand.featured),
  };
}

/**
 * Ce que le formulaire porte réellement, à cet instant.
 *
 * UN CHAMP ABSENT N'EST PAS UN CHAMP VIDE, et c'est pour ça que les
 * valeurs de départ arrivent en second argument.
 *
 * L'éditeur ne montre pas les mêmes champs à tout le monde : le nom de
 * référence, l'adresse de la page, la mise à la une et « comment on
 * achète » n'existent dans le document que pour un administrateur. Lus
 * comme des chaînes vides chez un créateur, ils auraient effacé le nom
 * de la marque dans l'aperçu, fait disparaître son étiquette « Ventes
 * privées », et annoncé quatre modifications sur une page à laquelle
 * personne n'avait touché.
 *
 * La présence se lit sur `form.elements` et non sur les données : une
 * case décochée ne figure pas dans un `FormData`, et l'on aurait
 * confondu « pas à la une » avec « pas le droit d'y toucher ».
 */
function lireLeFormulaire(form: HTMLFormElement, initiales: ValeursFiche): ValeursFiche {
  const donnees = new FormData(form);
  const present = (nom: string) => form.elements.namedItem(nom) !== null;
  const texte = (nom: string, defaut: string) =>
    present(nom) ? String(donnees.get(nom) ?? "").trim() : defaut;

  return {
    name: texte("name", initiales.name),
    adresse: texte("nouveau_slug", initiales.adresse),
    tagline: texte("tagline", initiales.tagline),
    description: texte("description", initiales.description),
    cover_url: texte("cover_url", initiales.cover_url),
    cover_video_url: texte("cover_video_url", initiales.cover_video_url),
    logo_url: texte("logo_url", initiales.logo_url),
    country: texte("country", initiales.country),
    city: texte("city", initiales.city),
    founded_year: texte("founded_year", initiales.founded_year),
    price_tier: texte("price_tier", initiales.price_tier) || "intermediaire",
    shop_url: texte("shop_url", initiales.shop_url),
    instagram: texte("instagram", initiales.instagram),
    audience: uneAudience(texte("audience", initiales.audience)),
    acces: unAcces(texte("acces", initiales.acces)),
    // Plusieurs cases du même nom : exactement ce que relit
    // `formData.getAll()` côté serveur.
    categories: present("categories")
      ? donnees.getAll("categories").map((v) => String(v))
      : initiales.categories,
    featured: present("featured") ? donnees.get("featured") === "on" : initiales.featured,
  };
}

/** Une empreinte, pour ne rendre à nouveau que si quelque chose a bougé. */
function empreinte(valeurs: ValeursFiche): string {
  return JSON.stringify({ ...valeurs, categories: [...valeurs.categories].sort() });
}

/**
 * Suit le formulaire à la frappe.
 *
 * DEUX SOURCES, ET LA SECONDE N'EST PAS UNE PRÉCAUTION DE STYLE.
 *
 *   1. Les événements `input` et `change`, qui remontent jusqu'au
 *      formulaire : ils couvrent la frappe, les cases, les listes, et
 *      tout ce que `BrandPrefill` écrit puisqu'il émet ces
 *      événements-là exprès.
 *   2. Un filet, toutes les quatre cents millisecondes. `VisuelCouverture`
 *      et `ImageUploader` tiennent leur adresse dans un état React et la
 *      posent sur un champ CACHÉ : React écrit alors la propriété
 *      `value` du nœud, ce qui n'émet aucun événement et n'est pas non
 *      plus une mutation du DOM. Sans le filet, on envoyait une
 *      couverture et l'aperçu restait vide — et pire, la check-list
 *      continuait d'annoncer qu'il manquait un visuel alors qu'il
 *      venait d'arriver.
 *
 * Le formulaire arrive en argument plutôt qu'en `ref` : « Annuler »
 * remonte le formulaire d'un coup en changeant sa clé, et une `ref` ne
 * l'aurait pas signalé — on serait resté accroché à un élément détaché,
 * sans un mot.
 */
export function useValeursDuFormulaire(
  form: HTMLFormElement | null,
  initiales: ValeursFiche
): ValeursFiche {
  const [valeurs, setValeurs] = useState<ValeursFiche>(initiales);
  const derniere = useRef(empreinte(initiales));

  useEffect(() => {
    if (!form) return;

    const relire = () => {
      const lues = lireLeFormulaire(form, initiales);
      const signature = empreinte(lues);
      if (signature === derniere.current) return;
      derniere.current = signature;
      setValeurs(lues);
    };

    relire();
    form.addEventListener("input", relire);
    form.addEventListener("change", relire);
    const filet = window.setInterval(relire, 400);

    return () => {
      form.removeEventListener("input", relire);
      form.removeEventListener("change", relire);
      window.clearInterval(filet);
    };
    // `initiales` en dépendance, et pas seulement le formulaire : après
    // un enregistrement le serveur renvoie les nouvelles valeurs, et
    // c'est sur elles que se replient les champs qu'on n'a pas le droit
    // de voir. Sans ça, un créateur garderait éternellement l'ancien nom
    // de sa marque dans l'aperçu.
  }, [form, initiales]);

  return valeurs;
}

/**
 * Combien de champs diffèrent de ce qui est enregistré.
 *
 * C'est ce chiffre qui fait apparaître la barre d'enregistrement, et qui
 * décide d'avertir avant de quitter la page. On compare aux valeurs
 * VENUES DU SERVEUR, pas à un instantané pris au montage : après un
 * enregistrement, la page revient avec les nouvelles valeurs, le compte
 * retombe à zéro tout seul et la barre disparaît sans qu'on ait à la
 * remettre à jour à la main.
 */
export function compterLesModifications(avant: ValeursFiche, apres: ValeursFiche): number {
  let total = 0;
  for (const cle of TEXTES) if (avant[cle] !== apres[cle]) total += 1;
  if (avant.featured !== apres.featured) total += 1;
  // L'ordre des catégories n'appartient à personne : la base les rend
  // dans l'ordre où elles ont été écrites, les cases dans celui du
  // vocabulaire. Comparer sans trier signalait une modification
  // permanente sur des fiches auxquelles personne n'avait touché.
  const rangees = (liste: string[]) => [...liste].sort().join("|");
  if (rangees(avant.categories) !== rangees(apres.categories)) total += 1;
  return total;
}
