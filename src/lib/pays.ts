/**
 * La liste des pays, en français.
 *
 * POURQUOI DES CODES ET NON DES NOMS. Écrire deux cents noms de pays à
 * la main, c'est deux cents occasions de se tromper d'accent ou de
 * traduction, et une liste qui vieillit sans qu'on s'en aperçoive.
 * `Intl.DisplayNames` est fourni par la plateforme et donne le nom
 * officiel en français à partir du code ISO, qui lui ne change presque
 * jamais. On ne tient donc qu'une liste de codes à deux lettres.
 *
 * C'est aussi ce qui garantit la COHÉRENCE avec la détection
 * automatique : `deduireLePays` part de l'extension du domaine, donc
 * d'un code ISO, et passe par la même traduction. Le pays trouvé tout
 * seul et le pays choisi dans la liste s'écrivent exactement pareil, ce
 * qui évite d'avoir « Etats-Unis » et « États-Unis » comme deux
 * origines distinctes dans les filtres.
 */

/**
 * Les codes ISO 3166-1. Volontairement large : l'annuaire n'a aucune
 * raison de décider à l'avance d'où une marque a le droit de venir.
 */
const CODES = [
  "AD", "AE", "AF", "AG", "AL", "AM", "AO", "AR", "AT", "AU", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN", "BO", "BR", "BS", "BT", "BW", "BY", "BZ",
  "CA", "CD", "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "ER", "ES", "ET",
  "FI", "FJ", "FR",
  "GA", "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW", "GY",
  "HK", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IN", "IQ", "IR", "IS", "IT",
  "JM", "JO", "JP",
  "KE", "KG", "KH", "KM", "KP", "KR", "KW", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MG", "MK", "ML", "MM", "MN", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NE", "NG", "NI", "NL", "NO", "NP", "NZ",
  "OM",
  "PA", "PE", "PG", "PH", "PK", "PL", "PT", "PY",
  "QA",
  "RO", "RS", "RU", "RW",
  "SA", "SC", "SD", "SE", "SG", "SI", "SK", "SL", "SN", "SO", "SR", "SV", "SY", "SZ",
  "TD", "TG", "TH", "TJ", "TM", "TN", "TR", "TT", "TW", "TZ",
  "UA", "UG", "US", "UY", "UZ",
  "VE", "VN",
  "YE",
  "ZA", "ZM", "ZW",
];

/**
 * Les pays, traduits et rangés dans l'ordre alphabétique français.
 *
 * `localeCompare` avec la locale : sans elle, « Émirats » se retrouve
 * après « Zimbabwe », parce que le tri par défaut range les caractères
 * accentués d'après leur numéro plutôt que d'après l'alphabet.
 */
export function listeDesPays(): string[] {
  const noms = new Intl.DisplayNames(["fr"], { type: "region" });
  const vus = new Set<string>();

  for (const code of CODES) {
    const nom = noms.of(code);
    // Sans traduction, `of` renvoie le code lui-même : « BQ » dans une
    // liste déroulante ne renseigne personne, on l'écarte.
    if (nom && nom !== code) vus.add(nom);
  }

  /*
   * Hong Kong s'écrit « R.A.S. chinoise de Hong Kong » chez Intl, ce
   * que personne ne cherche dans une liste. La détection automatique,
   * elle, écrit « Hong Kong » depuis toujours : sans cette ligne, une
   * marque hongkongaise détectée toute seule porterait un pays absent
   * de la liste, donc impossible à choisir ou à corriger à la main.
   */
  vus.delete(noms.of("HK") ?? "");
  vus.add("Hong Kong");

  return [...vus].sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * La liste, plus la valeur déjà enregistrée si elle en sort.
 *
 * Même précaution que pour les catégories : une fiche peut porter un
 * pays saisi avant cette liste, ou une graphie qu'on n'a pas prévue.
 * L'afficher quand même évite de le perdre en silence au premier
 * enregistrement, ce qui serait la pire façon de « corriger » une
 * donnée.
 */
export function paysAvecActuel(actuel?: string | null): string[] {
  const liste = listeDesPays();
  const propre = (actuel ?? "").trim();
  if (!propre || liste.includes(propre)) return liste;
  return [propre, ...liste];
}
