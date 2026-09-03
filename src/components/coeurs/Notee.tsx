import { enEtoiles } from "../Etoiles";
import type { NoteAffichee } from "./classement";

/**
 * La note d'un classement, au bout d'une ligne.
 *
 * ELLE EST PARTAGÉE POUR LA MÊME RAISON QUE `CoeurPlein` : deux
 * classements de notes voisinent sur la même page — les pièces et les
 * marques — et deux dessins légèrement différents pour un même chiffre
 * se remarquent tout de suite. Un seul composant, donc, importé des deux
 * côtés.
 *
 * ELLE OCCUPE LA PLACE DES CŒURS, ET JAMAIS EN MÊME TEMPS QU'EUX. Une
 * ligne porte une mesure et une seule : le favori dit qu'on suit, le
 * coup de cœur dit que ça plaît, l'avis dit que c'est bon, et les
 * afficher côte à côte inviterait à les additionner. Voir le commentaire
 * d'`ONGLETS` dans la page des coups de cœur.
 *
 * UNE SEULE ÉTOILE ET LE CHIFFRE, pas cinq. Cinq étoiles, un nombre, un
 * bouton d'aperçu et un cœur ne tiennent pas au bout d'une ligne de
 * téléphone — c'est déjà l'arbitrage qu'avait pris la pastille de note
 * des anciennes cartes de classement. Et c'est de toute façon le chiffre
 * qu'on lit.
 *
 * ⚠️ JAMAIS LA MOYENNE SANS LE NOMBRE D'AVIS. « 5 sur 5 » ne veut rien
 * dire tant qu'on ignore si c'est une personne ou deux cents — c'est la
 * règle de `ProductCard`, et c'est la raison d'être du seuil d'avis de la
 * page. Les quatre caractères que coûte « (12) » sont le prix d'un
 * classement honnête.
 */
export default function Notee({ note }: { note: NoteAffichee }) {
  return (
    <span
      title={`Noté ${enEtoiles(note.moyenne)} sur 5 par ${note.avis} personne${
        note.avis > 1 ? "s" : ""
      }`}
      className="inline-flex shrink-0 items-baseline gap-1 text-[13px] font-extrabold tabular-nums text-[var(--color-ink)] sm:mr-1 sm:text-[17px]"
    >
      {/* L'étoile et les parenthèses ne se lisent pas à voix haute : un
          lecteur d'écran annoncerait « étoile noire, quatre virgule cinq,
          parenthèse ouvrante, douze ». La phrase entière est donc dite
          une fois, et le dessin est masqué. */}
      <span className="sr-only">
        Noté {enEtoiles(note.moyenne)} sur 5, {note.avis} avis
      </span>
      <span aria-hidden="true" className="text-[#f5c73c]">
        ★
      </span>
      <span aria-hidden="true">{enEtoiles(note.moyenne)}</span>
      <span aria-hidden="true" className="text-[10.5px] font-bold text-[#8a7bab]">
        ({note.avis})
      </span>
    </span>
  );
}
