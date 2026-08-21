import type { Brand } from "./types";

/**
 * Mélanger une liste, sans favoriser personne.
 *
 * Fisher-Yates, et pas un `sort` avec un comparateur au hasard : ce
 * dernier paraît plus court mais ne donne pas un ordre équitable. Les
 * algorithmes de tri appellent le comparateur un nombre variable de
 * fois selon la position des éléments, si bien que certaines places
 * sortent nettement plus souvent que d'autres. Sur un annuaire, ça
 * voudrait dire des marques structurellement mieux exposées, ce qui est
 * exactement ce qu'on cherche à éviter.
 */
export function melanger<T>(liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/**
 * L'ordre de l'annuaire, retiré à chaque visite.
 *
 * POURQUOI PAS L'ORDRE D'ARRIVÉE. Les fiches sortaient de la plus
 * récente à la plus ancienne. C'est logique pour un fil d'actualité,
 * et injuste pour un annuaire : les mêmes marques occupaient la
 * première page à chaque visite, et toutes les autres attendaient
 * derrière un bouton que personne ne clique. Une marque ajoutée le mois
 * dernier était condamnée à ne plus jamais être vue en premier.
 *
 * Les marques à la une restent devant — c'est une mise en avant
 * décidée, elle doit tenir — mais elles sont mélangées ENTRE ELLES.
 * Sans ça, on aurait déplacé le problème d'un cran : les quatre mêmes
 * en haut, tout le temps.
 *
 * L'ordre change donc à chaque chargement de page. C'est assumé : sur
 * un annuaire, revenir et tomber sur autre chose est une qualité, pas
 * un défaut. La recherche et les filtres restent là pour retrouver
 * quelque chose de précis.
 */
export function ordonnerLAnnuaire(marques: readonly Brand[]): Brand[] {
  const alaUne = marques.filter((m) => m.featured);
  const autres = marques.filter((m) => !m.featured);
  return [...melanger(alaUne), ...melanger(autres)];
}

/**
 * Alterner les marques dans une liste de pièces.
 *
 * POURQUOI UN SIMPLE TIRAGE AU SORT NE SUFFIT PAS. Une marque qui a
 * cent quarante pièces et une autre qui en a six : au hasard, la
 * première occupe la moitié du premier écran, et la seconde n'apparaît
 * qu'après plusieurs « voir plus ». Le hasard n'est pas injuste, il est
 * simplement proportionnel, et c'est déjà trop pour une vitrine dont
 * tout l'intérêt est de faire découvrir.
 *
 * On mélange donc les marques entre elles, on mélange les pièces à
 * l'intérieur de chacune, puis on sert un tour de table : une pièce de
 * chaque marque, puis une deuxième de chaque, et ainsi de suite. Les
 * premiers écrans montrent alors autant de marques qu'il en existe, et
 * les grosses ne prennent le dessus qu'une fois les petites épuisées.
 */
export function repartirParMarque<T extends { brand_id: string }>(pieces: readonly T[]): T[] {
  const parMarque = new Map<string, T[]>();
  for (const piece of pieces) {
    const lot = parMarque.get(piece.brand_id) ?? [];
    lot.push(piece);
    parMarque.set(piece.brand_id, lot);
  }

  const files = melanger([...parMarque.values()]).map((lot) => melanger(lot));
  const sortie: T[] = [];

  // Tour de table : tant qu'une file a de quoi servir, on fait un tour.
  for (let rang = 0; sortie.length < pieces.length; rang++) {
    let servi = false;
    for (const file of files) {
      const piece = file[rang];
      if (!piece) continue;
      sortie.push(piece);
      servi = true;
    }
    // Sécurité : sans elle, une erreur de comptage tournerait sans fin.
    if (!servi) break;
  }

  return sortie;
}
