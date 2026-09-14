"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import FeuilleFiltres from "@/components/feuille/FeuilleFiltres";
import Portal from "@/components/Portal";
import {
  IconDownload,
  IconEye,
  IconGrid,
  IconImage,
  IconInbox,
  IconPlus,
  IconTag,
  IconUser,
} from "@/components/Icons";

/**
 * La navigation de l'administration, au doigt.
 *
 * SIX ENTRÉES EN HAUT DE L'ÉCRAN, C'ÉTAIT LE PROBLÈME. Elles ont
 * d'abord défilé latéralement — et les deux dernières, dont les
 * signalements, n'existaient pas pour qui ne pensait pas à balayer.
 * Puis elles se sont enroulées sur deux rangs : visibles, enfin, mais
 * toujours à viser en haut d'un écran qu'on tient par le bas, et deux
 * rangs de pastilles au-dessus de chaque page.
 *
 * Cinq places sous le pouce, donc, et deux décisions qui vont avec :
 *
 * — « Pile » réunit les candidatures et les signalements SOUS UN SEUL
 *   BADGE. C'est la réponse au problème d'origine : un signalement ne
 *   peut plus attendre sans se voir, puisque le nombre le suit sur
 *   toutes les pages de l'administration.
 * — Comptes et Catalogues descendent dans « Plus ». On les ouvre une
 *   fois par semaine ; les garder au premier rang coûtait une place à
 *   ce qu'on ouvre dix fois par jour.
 *
 * ⚠️ LA PILULE EST FIXÉE EN BAS, CE QUE `.barre-pied` DÉCONSEILLE
 * AILLEURS. L'objection tient à la lecture d'un post : la bande du bas
 * y est déjà prise par `ProgressionLecture`, et un élément fixe y
 * intercepterait le geste. L'administration n'a pas de barre de
 * progression — `.progression-zone` ne devient sensible qu'à la souris
 * et seulement sur les pages assez longues — et ce n'est pas un écran
 * de lecture. Le gabarit paie la contrepartie : cent huit pixels de
 * rembourrage bas, sans quoi la dernière ligne de chaque liste se
 * range sous la pilule et devient inatteignable.
 */

type Place = {
  href: string;
  label: string;
  Icone: (p: { className?: string }) => React.ReactElement;
  /** Les chemins que cette place revendique, en plus du sien. */
  aussi?: string[];
};

const PLACES: Place[] = [
  { href: "/admin", label: "Bord", Icone: IconGrid },
  /* Une fiche est un détail de la liste, pas une sixième destination :
     l'onglet reste allumé quand on l'ouvre, sinon on croit avoir quitté
     les marques. */
  { href: "/admin/marques", label: "Marques", Icone: IconTag },
  { href: "/admin/posts", label: "Posts", Icone: IconImage },
  {
    href: "/admin/pile",
    label: "Pile",
    Icone: IconInbox,
    aussi: ["/admin/candidatures", "/admin/signalements"],
  },
];

/** Ce qui s'ouvre une fois par semaine, et la sortie. */
const PLUS = [
  { href: "/admin/utilisateurs", label: "Comptes", note: "Rôles et rattachements", Icone: IconUser },
  { href: "/admin/catalogues", label: "Catalogues", note: "Mettre à jour les imports", Icone: IconDownload },
  { href: "/admin#frequentation", label: "Fréquentation", note: "Ce que le site a reçu", Icone: IconEye },
];

export default function BarreAdmin({
  pile,
  qui,
}: {
  /** Candidatures en attente + signalements ouverts. Voir `compteDeLaPile`. */
  pile: number;
  /** Le nom de qui est connecté, rappelé dans la feuille « Plus ». */
  qui: string;
}) {
  const chemin = usePathname();
  const [plus, setPlus] = useState(false);

  /*
   * ON ANNONCE LA BARRE AU RESTE DE LA PAGE.
   *
   * L'annuaire fait flotter sa barre de sélection, et les
   * confirmations montent en bas de l'écran : les trois se
   * superposaient au même endroit. Plutôt que d'apprendre à chacune
   * qu'une barre d'administration existe — donc de faire voyager un
   * état de navigation dans trois composants qui n'en ont que faire —
   * on pose un attribut, et `globals.css` en tire une variable de
   * dégagement que tout le monde lit. Elle vaut zéro au grand écran,
   * où cette barre n'existe pas.
   */
  useEffect(() => {
    document.documentElement.dataset.pied = "admin";
    return () => {
      delete document.documentElement.dataset.pied;
    };
  }, []);

  /* `/admin` est le préfixe de tout le reste : la comparaison exacte
     est la seule qui ne l'allume pas sur chaque page. */
  const ici = (p: Place) =>
    p.href === "/admin"
      ? chemin === "/admin"
      : chemin.startsWith(p.href) || (p.aussi ?? []).some((a) => chemin.startsWith(a));

  const place =
    "flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-1 transition active:scale-[.96]";
  const libelle = "text-[9.5px] font-extrabold uppercase tracking-[0.08em]";

  return (
    <>
      {/*
       * ELLE EST RENDUE DANS `<body>`, ET C'EST OBLIGÉ.
       *
       * `main` porte `relative z-10` : tout ce qu'il contient vit dans
       * son contexte d'empilement, et le pied de page — son voisin, de
       * même z-index mais plus bas dans le document — passe devant quoi
       * qu'on écrive ici. Mesuré : les liens du pied interceptaient les
       * appuis destinés aux onglets. C'est exactement ce que `Portal`
       * explique, et ce que fait déjà la feuille de filtres.
       */}
      <Portal>
        <nav
          aria-label="Administration"
          className="fixed inset-x-3 z-40 flex items-stretch gap-1 rounded-[22px] border border-white/16 bg-[rgba(8,2,30,0.7)] p-[7px] backdrop-blur-[28px] backdrop-saturate-[1.6] lg:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)" }}
        >
          {PLACES.map((p) => {
            const actif = ici(p);
            return (
              <Link
                key={p.href}
                href={p.href}
                aria-current={actif ? "page" : undefined}
                className={`${place} ${
                  actif ? "bg-white text-[#170a33]" : "text-white/68"
                }`}
              >
                <span className="relative">
                  <p.Icone className="h-[19px] w-[19px]" />
                  {/* Le badge ne compte que ce qui attend une décision, et
                      il ne s'affiche pas à zéro : une pastille toujours
                      présente cesse d'être un signal. */}
                  {p.href === "/admin/pile" && pile > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#c2273f] px-1 text-[9.5px] font-black tabular-nums text-white">
                      {pile > 99 ? "99+" : pile}
                    </span>
                  )}
                </span>
                <span className={libelle}>{p.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setPlus(true)}
            aria-haspopup="dialog"
            aria-controls="admin-plus"
            aria-expanded={plus}
            className={`${place} text-white/68`}
          >
            <IconPlus className="h-[19px] w-[19px]" />
            <span className={libelle}>Plus</span>
          </button>
        </nav>
      </Portal>

      <FeuilleFiltres
        ouvert={plus}
        onFermer={() => setPlus(false)}
        id="admin-plus"
        titre="Le reste de l'administration"
        pied={
          /* La déconnexion est dans le pied de la feuille, seule, et pas
             dans la liste : une sortie rangée entre deux destinations
             finit par se toucher en visant la précédente. */
          <form action="/auth/deconnexion" method="post">
            <button
              type="submit"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/30 bg-white/8 px-5 text-[13px] font-extrabold text-white transition active:scale-[.98]"
            >
              Se déconnecter
            </button>
          </form>
        }
      >
        <p className="m-0 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/72">
          Connecté : {qui}
        </p>

        <div className="flex flex-col gap-1.5">
          {PLUS.map(({ href, label, note, Icone }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setPlus(false)}
              className="flex min-h-[56px] items-center gap-3 rounded-[14px] bg-white/8 px-4 py-3 transition active:scale-[.98]"
            >
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] bg-white/13 text-white">
                <Icone className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-white">{label}</span>
                <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-white/50">
                  {note}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </FeuilleFiltres>
    </>
  );
}
