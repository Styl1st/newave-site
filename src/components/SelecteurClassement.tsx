"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Le choix du classement.
 *
 * Deux présentations pour un même choix, et ce n'est pas de la
 * coquetterie. Sur un grand écran, cinq pastilles tiennent sur une
 * ligne et se comparent d'un regard. Sur un téléphone, elles ne
 * tiennent pas : les empiler fabrique un pavé qui repousse les
 * résultats hors de l'écran, et les faire défiler à l'horizontale
 * cache la moitié des choix derrière un geste que personne ne devine.
 *
 * Une liste déroulante native règle les deux problèmes : une seule
 * ligne, et tout le contenu visible dès qu'on l'ouvre — avec la
 * roulette du système, que le pouce connaît déjà.
 *
 * LES PASTILLES PORTENT LE LIBELLÉ COURT, LA LISTE LE LONG. « Du
 * moment » suffit à côté de ses quatre voisines, qui donnent le
 * contexte ; seul dans une liste déroulante, il ne dit plus de quoi il
 * s'agit, d'où « Coups de cœur du moment » là-bas. Le titre de la page
 * répète de toute façon le classement choisi en toutes lettres.
 */

export type Onglet = { id: string; court: string; label: string };

export default function SelecteurClassement({
  onglets,
  actif,
  base,
  defaut,
  prefixe,
  aside,
}: {
  onglets: readonly Onglet[];
  actif: string;
  /** Adresse de la page, sans paramètre. */
  base: string;
  /** L'onglet qui n'a pas besoin de paramètre dans l'adresse. */
  defaut: string;
  /** L'œil-de-bœuf posé devant les pastilles, sur grand écran. */
  prefixe?: string;
  /** Ce qu'on pousse à droite de la ligne : la fraîcheur des chiffres. */
  aside?: React.ReactNode;
}) {
  const router = useRouter();

  function adresse(id: string) {
    return id === defaut ? base : `${base}?vue=${id}`;
  }

  const pastille =
    "shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.07em] transition";
  const repos = "bg-white/12 text-white/84 hover:bg-white/20 hover:text-white";
  const choisi = "bg-white font-extrabold text-[var(--color-ink)]";

  return (
    <div data-no-reveal className="rise rise-1 mb-6">
      {/* ---- téléphone ---- */}
      <label className="block sm:hidden">
        <span className="eyebrow mb-2 block">{prefixe ?? "Quel classement ?"}</span>
        <select
          value={actif}
          onChange={(e) => router.push(adresse(e.target.value))}
          className="champ"
        >
          {onglets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {/* ---- ordinateur ----
          Des liens, pas des boutons : chaque classement a son adresse,
          donc il se partage et se met en favori.

          La rangée défile à l'horizontale plutôt que de passer à la
          ligne. Un retour à la ligne fait grandir la barre d'un cran
          quand on change de largeur, et tout ce qui suit saute avec
          elle ; le défilement garde la ligne à sa hauteur. */}
      <div className="hidden items-center gap-3 sm:flex">
        <nav aria-label="Choix du classement" className="flex min-w-0 flex-1 items-center gap-2.5">
          {prefixe && <span className="eyebrow shrink-0 text-white/45">{prefixe}</span>}
          <div className="sans-ascenseur flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {onglets.map((o) => (
              <Link
                key={o.id}
                href={adresse(o.id)}
                aria-current={actif === o.id ? "page" : undefined}
                title={o.label}
                className={`${pastille} ${actif === o.id ? choisi : repos}`}
              >
                {o.court}
              </Link>
            ))}
          </div>
        </nav>

        {/* Sous mille pixels, la ligne est déjà pleine de pastilles :
            cette mention est un repère, pas une information dont on a
            besoin pour agir. */}
        {aside && (
          <p className="m-0 hidden shrink-0 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/45 lg:block">
            {aside}
          </p>
        )}
      </div>
    </div>
  );
}
