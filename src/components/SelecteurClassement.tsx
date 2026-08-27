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
 */

export type Onglet = { id: string; court: string; label: string };

export default function SelecteurClassement({
  onglets,
  actif,
  base,
  defaut,
}: {
  onglets: readonly Onglet[];
  actif: string;
  /** Adresse de la page, sans paramètre. */
  base: string;
  /** L'onglet qui n'a pas besoin de paramètre dans l'adresse. */
  defaut: string;
}) {
  const router = useRouter();

  function adresse(id: string) {
    return id === defaut ? base : `${base}?vue=${id}`;
  }

  const repos = "text-white/72 hover:bg-white/12 hover:text-white";
  const choisi = "bg-white text-[var(--color-ink)]";

  return (
    <div data-no-reveal className="rise rise-1 mb-7">
      {/* ---- téléphone ---- */}
      <label className="block sm:hidden">
        <span className="eyebrow mb-2 block">Quel classement ?</span>
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
          donc il se partage et se met en favori. */}
      <nav aria-label="Choix du classement" className="hidden sm:block">
        <div className="inline-flex flex-wrap gap-1 rounded-full border border-white/20 bg-white/8 p-1">
          {onglets.map((o) => (
            <Link
              key={o.id}
              href={adresse(o.id)}
              aria-current={actif === o.id ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-bold transition ${
                actif === o.id ? choisi : repos
              }`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
