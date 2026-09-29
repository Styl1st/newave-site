import BackLink from "./BackLink";
import RetourOrigine from "./RetourOrigine";

/**
 * Le retour, en haut des pages de l'espace marque.
 *
 * Ces pages n'avaient que les onglets de `BarreGerant` : on passait
 * d'un onglet à l'autre, mais rien ne ramenait à la liste des marques
 * quand on y était venu depuis l'administration. On finissait par
 * enchaîner les « précédent » du navigateur, et par recharger la page
 * pour voir l'état à jour.
 *
 * Un lien plutôt qu'un « précédent » : la page d'arrivée est redemandée
 * au serveur, et montre donc ce qui vient d'être fait (une marque
 * publiée, des pièces importées) au lieu de la version d'avant.
 *
 * Sans `vers`, on revient là d'où l'on est entré dans la marque (voir
 * `RetourOrigine`) ; à défaut, le panel pour l'administration, sa page
 * pour un créateur. `vers` sert aux pages qui sont une étape d'un onglet
 * (importer, ajouter) : elles ramènent à cet onglet.
 */
export default function RetourEspace({
  slug,
  isAdmin,
  vers,
}: {
  slug: string;
  isAdmin: boolean;
  vers?: { href: string; label: string };
}) {
  // Sans étape à remonter : là d'où l'on est venu à cette marque (voir
  // `RetourOrigine`), et à défaut le panel ou la page de la marque.
  if (!vers) {
    return (
      <div className="mb-4">
        <RetourOrigine
          repli={
            isAdmin
              ? { href: "/admin/marques", label: "Admin · Marques" }
              : { href: `/marques/${slug}`, label: "Ma page" }
          }
        />
      </div>
    );
  }

  return (
    <div className="mb-4">
      <BackLink href={vers.href}>{vers.label}</BackLink>
    </div>
  );
}
