import BrandSpaceNav from "@/components/BrandSpaceNav";
import { getBrandStats } from "@/lib/brand-stats";
import { requireManagedBrand } from "@/lib/brand-space";
import type { Jour, Ligne } from "@/lib/stats";

type Props = { params: Promise<{ slug: string }> };

function Chiffre({
  label,
  valeur,
  note,
}: {
  label: string;
  valeur: string | number;
  note?: string;
}) {
  return (
    <div className="glass p-5">
      <p className="eyebrow m-0">{label}</p>
      <p className="m-0 mt-2 text-[30px] font-black leading-none text-white">{valeur}</p>
      {note && <p className="m-0 mt-1.5 text-[12px] font-semibold text-white/55">{note}</p>}
    </div>
  );
}

function Graphique({ jours }: { jours: Jour[] }) {
  const max = Math.max(...jours.map((j) => j.vues), 1);
  return (
    <div className="glass p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow m-0">Vues de ta page, 30 derniers jours</p>
        <p className="m-0 text-[12px] font-bold text-white/55">Maximum : {max} / jour</p>
      </div>
      <div className="flex h-36 items-end gap-[2px]">
        {jours.map((j) => (
          <div
            key={j.date}
            title={`${new Date(j.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} : ${j.vues}`}
            style={{ width: `${100 / jours.length}%`, height: `${Math.max((j.vues / max) * 100, 1.5)}%` }}
            className="rounded-t-[3px] bg-linear-to-t from-white/35 to-white/85 transition hover:from-white/60 hover:to-white"
          />
        ))}
      </div>
    </div>
  );
}

function Classement({ titre, lignes, vide }: { titre: string; lignes: Ligne[]; vide: string }) {
  const max = Math.max(...lignes.map((l) => l.valeur), 1);
  return (
    <div className="glass p-4 sm:p-5">
      <p className="eyebrow m-0 mb-4">{titre}</p>
      {lignes.length === 0 ? (
        <p className="m-0 text-[13.5px] text-white/55">{vide}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {lignes.map((l) => (
            <li key={l.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] font-bold text-white/90">{l.label}</span>
                <span className="shrink-0 text-[13px] font-extrabold text-white">{l.valeur}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div style={{ width: `${(l.valeur / max) * 100}%` }} className="h-full rounded-full bg-white/70" />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function BrandStatsPage({ params }: Props) {
  const { slug } = await params;
  const { brand, isAdmin } = await requireManagedBrand(slug);
  const stats = await getBrandStats(brand.id, slug);

  return (
    <>
      <BrandSpaceNav slug={slug} name={brand.name} isAdmin={isAdmin} published={brand.status === "published"} />

      <header className="mb-5 sm:mb-7">
        <p className="eyebrow m-0">Ton audience</p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Statistiques
        </h1>
      </header>

      {!stats ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">Statistiques indisponibles pour l&apos;instant.</p>
        </div>
      ) : brand.status !== "published" ? (
        <div className="glass p-8">
          <h2 className="m-0 text-[17px] font-extrabold text-white">Ta page n&apos;est pas encore publiée</h2>
          <p className="m-0 mt-3 text-[14.5px] leading-relaxed text-white/84">
            Il n&apos;y a donc rien à mesurer. Les chiffres apparaîtront dès que la
            rédaction aura mis ta fiche en ligne.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Chiffre
              label="Vues, 7 jours"
              valeur={stats.vues7}
              note={
                stats.evolution === null
                  ? "pas encore de comparaison"
                  : `${stats.evolution >= 0 ? "+" : ""}${stats.evolution} % vs semaine avant`
              }
            />
            <Chiffre label="Vues, 30 jours" valeur={stats.vues30} note="ta fiche et tes pièces" />
            <Chiffre
              label="Clics vers ta boutique"
              valeur={stats.clics30}
              note={`${stats.clics7} sur les 7 derniers jours`}
            />
            <Chiffre
              label="Taux de sortie"
              valeur={stats.tauxSortie === null ? "Pas encore de donnée" : `${stats.tauxSortie} %`}
              note="visiteurs partis acheter chez toi"
            />
          </div>

          <Graphique jours={stats.jours} />

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Chiffre label="En favori" valeur={stats.favoris} note="personnes qui te suivent" />
            <Chiffre label="Coups de cœur" valeur={stats.likes} note="sur l'ensemble de tes pièces" />
            <Chiffre
              label="Ton catalogue"
              valeur={stats.piecesPubliees}
              note={stats.piecesBrouillon > 0 ? `${stats.piecesBrouillon} en brouillon` : "tout est publié"}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Classement
              titre="Tes pièces les plus regardées"
              lignes={stats.topPieces}
              vide="Pas encore assez de visites pour établir un classement."
            />
            <Classement
              titre="Tes pièces les plus aimées"
              lignes={stats.topPiecesLikes}
              vide="Aucun coup de cœur pour l'instant."
            />
          </div>

          <p className="m-0 mt-5 text-[12.5px] leading-relaxed text-white/50">
            Ces chiffres comptent des pages vues, pas des personnes : aucun cookie ni
            identifiant n&apos;est posé sur nos visiteurs. Le taux de sortie est le
            rapport entre les clics vers ta boutique et les vues de tes pages. C&apos;est
            la mesure la plus honnête de ce que NEWAVE SPHERE t&apos;apporte.
          </p>
        </>
      )}
    </>
  );
}
