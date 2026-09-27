import Link from "next/link";
import { ilYA, lienAnnonce, rubrique, type Annonce } from "@/lib/forum";
import PastilleRubrique from "./PastilleRubrique";

/**
 * Une annonce sur le profil de son auteur (1f).
 *
 * PLUS SOBRE QUE LA CARTE DU FIL. Ici on sait déjà qui l'a publiée :
 * ni signature, ni ville, ni bouton de vote. L'image, le titre, les
 * votes et l'âge, pour qu'on parcoure d'un coup d'œil ce que la
 * personne propose.
 *
 * Une annonce sans photo prend la couleur de sa rubrique, rayée comme
 * sur la maquette : la grille garde son rythme, et on reconnaît la
 * rubrique avant de lire.
 */
export default function CarteProfil({ annonce: a }: { annonce: Annonce }) {
  const photo = a.images[0];
  const r = rubrique(a.rubrique);

  return (
    <Link href={lienAnnonce(a)} className="card-light group flex h-full flex-col">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden"
        style={
          photo
            ? { background: "rgba(123,82,232,0.12)" }
            : {
                background: r.couleur,
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,.16) 0 10px, transparent 10px 20px)",
              }
        }
      >
        {photo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        )}
        <PastilleRubrique cle={a.rubrique} habit="photo" className="absolute left-2.5 top-2.5" />
        {a.cloturee && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[var(--color-ink)] px-2.5 py-[5px] text-[10px] font-black uppercase leading-none tracking-[0.1em] text-[#fff]">
            Clôturée
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
        <p className="m-0 line-clamp-3 text-[14px] font-extrabold leading-[1.3] tracking-[-0.015em] text-[var(--color-ink)] [overflow-wrap:anywhere] sm:text-[14.5px]">
          {a.titre}
        </p>
        <p className="m-0 mt-auto pt-2 text-[11.5px] font-bold tabular-nums text-[#6a5a92]" suppressHydrationWarning>
          ▲ {a.votes} · {ilYA(a.created_at)}
        </p>
      </div>
    </Link>
  );
}
