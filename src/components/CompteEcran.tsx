"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { IconImage, IconInbox, IconUser } from "./Icons";
import { LogoutButton } from "./AccountForms";

/** Une ligne du groupe « Mes espaces » : un lien, et ce qu'il contient. */
export type Espace = {
  href: string;
  label: string;
  /** `null` pour une ligne qui n'a rien à compter, comme l'administration. */
  compte: number | null;
};

type Onglet = "profil" | "apparence";

/*
 * Deux onglets, et pas quatre.
 *
 * Le gabarit dessine aussi « Sécurité » et « Notifications ». Le mot de
 * passe vit dans le volet Profil, où le gabarit le range lui-même : une
 * ligne « Sécurité » n'aurait donc rien à ouvrir. Quant aux
 * notifications, rien ne les enregistre encore — la ligne reste, mais
 * inerte et marquée, parce qu'annoncer une suite est honnête et faire
 * mine de la régler ne l'est pas.
 */
const REGLAGES = [
  { id: "profil" as const, label: "Profil", Icone: IconUser },
  { id: "apparence" as const, label: "Apparence", Icone: IconImage },
];

export default function CompteEcran({
  espaces,
  profil,
  apparence,
}: {
  espaces: Espace[];
  /** Le volet 8a, rendu sur le serveur et passé tel quel. */
  profil: React.ReactNode;
  /** Le volet 8b. */
  apparence: React.ReactNode;
}) {
  const [onglet, setOnglet] = useState<Onglet>("profil");
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);

  /*
   * Les flèches parcourent le rail, comme dans n'importe quel jeu
   * d'onglets. Sans elles, `role="tablist"` promet un fonctionnement
   * au clavier que la page ne tient pas : mieux vaut alors ne rien
   * promettre du tout.
   */
  function auClavier(e: React.KeyboardEvent<HTMLDivElement>) {
    const rang = REGLAGES.findIndex((r) => r.id === onglet);
    let vise = rang;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") vise = (rang + 1) % REGLAGES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      vise = (rang - 1 + REGLAGES.length) % REGLAGES.length;
    else if (e.key === "Home") vise = 0;
    else if (e.key === "End") vise = REGLAGES.length - 1;
    else return;

    e.preventDefault();
    setOnglet(REGLAGES[vise].id);
    boutons.current[vise]?.focus();
  }

  /*
   * Une seule écriture pour les deux mises en page : pastille qui défile
   * sur téléphone, ligne pleine largeur dans le rail à partir de `lg`.
   * `min-h-11` tient la cible tactile à quarante-quatre pixels, ce que
   * la ligne de onze pixels du gabarit ne donne pas au doigt.
   */
  const ligne =
    "flex min-h-11 shrink-0 items-center gap-[11px] whitespace-nowrap rounded-full px-4 text-[13.5px] transition active:scale-[.97] lg:min-h-0 lg:w-full lg:rounded-[13px] lg:px-3 lg:py-[11px]";
  const active = "bg-white font-extrabold text-[var(--color-ink)]";
  const repos = "font-bold text-white/78 hover:bg-white/12 hover:text-white";
  const sousTitre =
    "m-0 hidden text-[9.5px] font-black uppercase tracking-[0.2em] text-white/72 lg:block";

  return (
    /*
     * `grid-cols-[minmax(0,1fr)]` DÈS LE PREMIER PALIER, ET CE N'EST PAS
     * DÉCORATIF — c'est ce qui a cassé la page sur téléphone.
     *
     * Sans template, une grille se donne une colonne IMPLICITE, et une
     * colonne implicite est dimensionnée en `auto`, c'est-à-dire à la
     * largeur du contenu le plus large qu'elle porte. Le rail ci-dessous
     * est une rangée qui défile : sa largeur de contenu, c'est la suite
     * complète « Profil · Apparence · Notifications · Mes favoris ·
     * Espace marque · Administration · Se déconnecter » mise bout à
     * bout, soit bien plus que l'écran.
     *
     * La colonne prenait donc cette largeur-là, et TOUT ce qu'elle porte
     * avec elle : les cartes de raccourci, les blocs de formulaire, les
     * champs. D'où une page entière débordant à droite alors qu'aucun de
     * ces éléments n'est trop large. Le débordement d'un seul enfant
     * était payé par tous les autres.
     *
     * `minmax(0,1fr)` autorise la colonne à descendre sous la largeur de
     * son contenu. Le rail redevient alors ce qu'il est — une zone qui
     * défile toute seule — et ses voisins tiennent dans l'écran.
     *
     * La version `lg:` l'écrivait déjà correctement. C'est le palier
     * téléphone qui avait été laissé implicite.
     */
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-[26px]">
      {/* ---------- le rail ----------

          Sur téléphone il ne peut pas rester une colonne : deux cent
          cinquante pixels sur un écran qui en fait trois cent quatre-
          vingt-dix ne laisseraient rien au contenu. Il devient donc une
          seule rangée qui défile à l'horizontale — onglets, espaces et
          sortie à la suite — et ne reprend sa forme de colonne qu'à
          partir de `lg`. */}
      <aside className="glass rise rise-1 min-w-0 p-2.5 lg:p-4">
        <div className="sans-ascenseur flex items-center gap-1.5 overflow-x-auto lg:block lg:overflow-visible">
          {/* Pas la classe `.eyebrow` : elle est posée hors couche, donc
              une taille Tailwind ne la reprendrait pas. Le sous-titre de
              rail est plus petit et moins espacé que l'œil-de-bœuf. */}
          <p className={sousTitre}>Réglages</p>

          <div
            role="tablist"
            aria-label="Réglages du compte"
            onKeyDown={auClavier}
            className="flex shrink-0 items-center gap-1.5 lg:mt-2 lg:flex-col lg:items-stretch lg:gap-1"
          >
            {REGLAGES.map(({ id, label, Icone }, rang) => {
              const choisi = onglet === id;
              return (
                <button
                  key={id}
                  ref={(el) => {
                    boutons.current[rang] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`onglet-${id}`}
                  aria-selected={choisi}
                  aria-controls={`volet-${id}`}
                  tabIndex={choisi ? 0 : -1}
                  onClick={() => setOnglet(id)}
                  className={`${ligne} ${choisi ? active : repos}`}
                >
                  <Icone className="h-[17px] w-[17px]" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Annoncée, jamais promise : rien ne l'enregistre encore. Hors
              du `tablist`, parce qu'elle n'ouvre aucun volet — l'y laisser
              ferait annoncer « onglet 3 sur 3 » pour une ligne morte. */}
          <span
            className={`${ligne} font-bold text-white/40 lg:mt-1 lg:justify-between`}
            title="Cette section n'est pas encore en service."
          >
            <span className="flex items-center gap-[11px]">
              <IconInbox className="h-[17px] w-[17px]" />
              Notifications
            </span>
            <span className="ml-2 rounded-full bg-white/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/55">
              À venir
            </span>
          </span>

          <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-white/20 lg:hidden" />

          <p className={`${sousTitre} lg:mt-5`}>Mes espaces</p>

          <div className="flex shrink-0 items-center gap-1.5 lg:mt-2 lg:flex-col lg:items-stretch lg:gap-1">
            {espaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className={`${ligne} ${repos} lg:justify-between`}
              >
                <span className="truncate">{e.label}</span>
                {e.compte !== null && (
                  <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-white/45">
                    {e.compte}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-white/20 lg:hidden" />

          <div className="shrink-0 lg:mt-4 lg:border-t lg:border-white/15 lg:pt-4">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ---------- les volets ----------

          Les deux restent montés, et l'on masque celui qu'on ne regarde
          pas. Démonter l'Apparence à chaque aller-retour relancerait la
          lecture des préférences et effacerait le « Enregistré. » à
          l'instant où il vient de s'afficher. */}
      <div className="min-w-0">
        <div
          role="tabpanel"
          id="volet-profil"
          aria-labelledby="onglet-profil"
          className={onglet === "profil" ? "" : "hidden"}
        >
          {profil}
        </div>
        <div
          role="tabpanel"
          id="volet-apparence"
          aria-labelledby="onglet-apparence"
          className={onglet === "apparence" ? "" : "hidden"}
        >
          {apparence}
        </div>
      </div>
    </div>
  );
}
