/**
 * La vidéo d'un post ne vit plus ici : on renvoie chez elle.
 *
 * On l'hébergeait, et c'était un mauvais calcul. Une vidéo de trente
 * secondes correctement exportée pèse une dizaine de mégaoctets ; le
 * forfait sert cinq gigaoctets de trafic par mois, donc quelques
 * centaines de lectures et l'on est à sec. Surtout, un fichier servi
 * en direct n'a pas de qualité adaptative : un téléphone en 4G
 * télécharge tout avant d'afficher quoi que ce soit.
 *
 * Instagram et TikTok font ce travail mieux, gratuitement, et la
 * vidéo y est de toute façon déjà. On garde donc l'image ici — c'est
 * elle qui donne envie — et le clic part vers l'original.
 *
 * Le lien s'ouvre dans un nouvel onglet, et c'est délibéré : quelqu'un
 * qui parcourt un post n'a pas demandé à quitter le site, et le
 * ramener sur sa page au retour vaut mieux que de lui laisser le
 * bouton « précédent » comme seule issue.
 */

type Reseau = "instagram" | "tiktok";

const NOM: Record<Reseau, string> = { instagram: "Instagram", tiktok: "TikTok" };

function Glyphe({ reseau }: { reseau: Reseau }) {
  if (reseau === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
        <path d="M16.5 3c.3 2 1.5 3.4 3.5 3.7v2.6c-1.3.1-2.5-.3-3.6-1v5.9c0 4-3.4 6.6-7 5.6-2.6-.7-4.1-3.2-3.8-5.9.3-2.4 2.3-4.3 4.7-4.5.5 0 1 0 1.5.1v2.8c-.4-.1-.9-.2-1.4-.1-1.2.1-2.1 1.1-2.1 2.3 0 1.3 1 2.3 2.3 2.3 1.3 0 2.3-1 2.3-2.3V3h3.6Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function LienVideo({
  instagram,
  tiktok,
  className = "",
}: {
  instagram?: string | null;
  tiktok?: string | null;
  className?: string;
}) {
  const lien = instagram || tiktok;
  if (!lien) return null;

  const reseau: Reseau = instagram ? "instagram" : "tiktok";

  return (
    <a
      href={lien}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-3 text-[13.5px] font-black text-[var(--color-ink)] shadow-[0_6px_20px_rgba(35,12,85,0.35)] transition hover:shadow-[0_10px_28px_rgba(35,12,85,0.5)] active:scale-[.97] ${className}`}
    >
      {/* Le triangle de lecture dit « vidéo » avant même qu'on lise. */}
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-ink)]">
        <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 translate-x-[1px]" fill="#fff">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      Voir la vidéo sur {NOM[reseau]}
      <Glyphe reseau={reseau} />
    </a>
  );
}
