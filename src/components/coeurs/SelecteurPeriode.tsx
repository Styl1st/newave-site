import Link from "next/link";
import type { PeriodeCoeurs } from "@/lib/favorites";

/**
 * Sur quelle période on compte les cœurs des marques.
 *
 * IL N'APPARAÎT QU'AU-DESSUS DU SEUIL, et c'est sa raison d'être. Sous
 * cent cœurs, découper le total en trois fenêtres donne trois listes de
 * rien : « cette semaine » y affiche deux marques à un cœur, ce qui se
 * lit comme un classement alors que c'est un accident. Le sélecteur ne
 * se grise pas, ne s'explique pas, ne se montre pas en pointillé — il
 * n'existe pas. Un réglage visible qu'on n'a aucune raison d'utiliser
 * est une question posée pour rien.
 *
 * POURQUOI CE N'EST PAS `SelecteurClassement`. Ce composant-là choisit
 * QUEL classement on regarde — coups de cœur, marques suivies, notes —
 * et ses onglets tiennent séparés trois gestes qu'il ne faut jamais
 * additionner (voir le commentaire d'`ONGLETS` dans la page). Celui-ci
 * choisit QUAND, à l'intérieur d'un seul de ces classements. Les mettre
 * dans la même rangée reviendrait à proposer « Pièces notées » et « Ce
 * mois » côte à côte, comme si c'était le même axe — et à rouvrir
 * exactement le mélange que la page s'applique à éviter. Deux questions,
 * deux lignes, et la seconde en retrait de la première.
 *
 * IL PORTE SON PROPRE PARAMÈTRE (`?periode=`) et laisse `?vue=` à
 * l'autre : les deux choix se combinent, donc chaque lien reconduit
 * celui qu'il ne change pas. Sans quoi choisir une période ramènerait
 * au classement par défaut.
 */

const PERIODES: { id: PeriodeCoeurs; label: string }[] = [
  { id: "semaine", label: "Cette semaine" },
  { id: "mois", label: "Ce mois" },
  { id: "toujours", label: "Depuis toujours" },
];

export default function SelecteurPeriode({
  actif,
  vue,
  base = "/populaires",
}: {
  actif: PeriodeCoeurs;
  /** Le classement en cours, à reconduire dans chaque lien. */
  vue: string;
  base?: string;
}) {
  function adresse(id: PeriodeCoeurs) {
    /* « Depuis toujours » est le comportement par défaut : il n'a pas
       besoin d'un paramètre pour se dire, et une adresse partagée reste
       plus courte. */
    return id === "toujours" ? `${base}?vue=${vue}` : `${base}?vue=${vue}&periode=${id}`;
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1 text-white/45">Sur quelle période</span>
      {PERIODES.map((p) => (
        <Link
          key={p.id}
          href={adresse(p.id)}
          aria-current={actif === p.id ? "page" : undefined}
          className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] transition ${
            actif === p.id
              ? "bg-white font-extrabold text-[var(--color-ink)]"
              : "bg-white/12 text-white/84 hover:bg-white/20 hover:text-white"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
