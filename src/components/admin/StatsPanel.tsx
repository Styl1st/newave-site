import type { Stats } from "@/lib/stats";
import ClassementsOnglets from "./ClassementsOnglets";
import Frequentation from "./Frequentation";

/**
 * La section Fréquentation.
 *
 * Deux colonnes : à gauche ce qui se lit dans le temps — les chiffres,
 * la période, la courbe —, à droite les classements, qui répondent à
 * une autre question et n'ont pas à s'intercaler entre les deux.
 *
 * La colonne de droite est fixée à 330px plutôt que proportionnelle :
 * ce sont des noms de marques suivis d'un nombre, ils n'ont rien à
 * gagner à s'étirer sur un écran large, alors que l'histogramme, lui,
 * gagne chaque pixel qu'on lui donne.
 *
 * Ce fichier ne fait plus que composer : l'histogramme et les
 * classements sont passés côté navigateur parce qu'ils portent
 * désormais un état — la période et l'onglet courant.
 */
export default function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <section className="mt-10">
      <h2 className="m-0 mb-5 text-[clamp(16.5px,3.6vw,21px)] font-extrabold tracking-[-0.02em] text-white">
        Fréquentation
      </h2>

      {/* Une seule colonne jusqu'à 1024px : à 768px, 330px pris sur la
          largeur laisseraient à la courbe moins de place qu'aux
          classements, alors que c'est elle qu'on vient voir. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          <Frequentation stats={stats} />

          <p className="m-0 mt-4 text-[12.5px] leading-relaxed text-white/50">
            Ces chiffres comptent des pages vues, pas des personnes : aucun cookie ni
            identifiant n&apos;est posé, donc deux visites du même visiteur sont
            indiscernables de deux visiteurs. Tes propres pages d&apos;administration ne
            sont pas comptées.
          </p>
        </div>

        <ClassementsOnglets stats={stats} />
      </div>
    </section>
  );
}
