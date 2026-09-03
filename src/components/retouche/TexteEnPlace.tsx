"use client";

import { useEffect, useRef } from "react";
import TexteRiche from "@/components/TexteRiche";
import { useRetouche } from "./ContexteRetouche";
import { AMBRE } from "./apparence";

/**
 * Un texte de la fiche, qui devient son propre petit éditeur.
 *
 * L'IDÉE DE TOUT L'ÉCRAN TIENT DANS CE FICHIER. On ne s'en va pas
 * remplir un formulaire pour revenir voir le résultat : on clique sur la
 * phrase, elle devient un champ À SA PLACE ET À SA TAILLE, on la
 * corrige, on valide. Ce qu'on lit pendant qu'on tape est déjà la page.
 *
 * D'OÙ LA TYPOGRAPHIE PARTAGÉE avec la page publique (voir
 * `apparence.ts`) : si le champ était en 14 pixels alors que l'accroche
 * s'affiche en 19, on écrirait une phrase qui tient, et elle
 * déborderait une fois validée.
 *
 * ÉCHAP REND CE QU'IL Y AVAIT. La frappe part dans le brouillon au fil
 * des touches — c'est ce qui fait vivre la check-list du rail pendant
 * qu'on écrit — donc « annuler » ne peut pas se contenter de fermer le
 * champ : il repose la valeur d'avant l'ouverture, gardée de côté.
 *
 * AU DOIGT, RIEN DE TOUT ÇA. `ouvrir()` décide, et sous `sm` il fait
 * monter la feuille : un champ de 19 pixels ouvert au milieu d'une page
 * qui défile, avec le clavier qui recouvre la moitié de l'écran, ne se
 * corrige pas.
 */
export default function TexteEnPlace({
  champ,
  classe,
  classeSaisie,
  classeCadre = "",
  lignes = 1,
  ideal,
  riche = false,
  masquerSiVide = false,
}: {
  champ: "tagline" | "description";
  /** L'affichage, placement compris. */
  classe: string;
  /** La même typographie, sans le placement : c'est celle du champ. */
  classeSaisie: string;
  /**
   * Le placement du cadre ouvert.
   *
   * Il ne se déduit pas de `classe` : le texte porte la marge qui le
   * détache de ce qui le précède, et cette marge-là appartient au bloc,
   * pas au champ. Sous le nom de la marque il en faut une ; en tête du
   * bloc de verre, aucune.
   */
  classeCadre?: string;
  lignes?: number;
  /** La longueur au-delà de laquelle le texte se fait couper ailleurs. */
  ideal?: number;
  /** Le gras et l'italique de la mise en forme courante. */
  riche?: boolean;
  /** Le serveur ne rend rien quand c'est vide : on fait pareil. */
  masquerSiVide?: boolean;
}) {
  const retouche = useRetouche();
  const champVif = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  /** La valeur d'avant l'ouverture, celle qu'Échap redonne. */
  const avant = useRef("");

  const ouvert = Boolean(retouche?.actif && !retouche.etroit && retouche.champOuvert === champ);

  useEffect(() => {
    if (!ouvert) return;
    const noeud = champVif.current;
    if (!noeud) return;
    avant.current = noeud.value;
    noeud.focus();
    // Le curseur à la fin, pas au début : on vient corriger une phrase,
    // pas la réécrire depuis le premier caractère.
    noeud.setSelectionRange(noeud.value.length, noeud.value.length);
  }, [ouvert]);

  // Hors d'une scène de retouche, ce composant n'a rien à rendre : la
  // page publique garde son propre balisage pour les visiteurs.
  if (!retouche) return null;

  const valeur = retouche.brouillon[champ];
  const contenu = riche ? <TexteRiche texte={valeur} /> : valeur;

  /*
   * Les mots viennent de la voix, pas de l'appelant.
   *
   * La page n'a pas à savoir si elle parle à une marque ou à
   * l'administration : elle dit quel champ, et `mots.ts` dit comment on
   * l'appelle ici. Une étiquette de plus à passer, c'est une étiquette
   * qu'on oubliera de traduire dans la seconde voix.
   */
  const { mots } = retouche;
  const etiquette = champ === "tagline" ? mots.accrocheEtiquette : mots.demarcheEtiquette;
  const aide = champ === "tagline" ? mots.accrocheAide : mots.demarcheAide;
  const placeholder = champ === "tagline" ? mots.accrochePlaceholder : "";

  if (!retouche.actif) {
    if (!valeur.trim() && masquerSiVide) return null;
    return <p className={classe}>{contenu}</p>;
  }

  if (ouvert) {
    const commun = {
      value: valeur,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        retouche.definir(champ, e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          retouche.definir(champ, avant.current);
          retouche.fermer();
          return;
        }
        // Sur une ligne, Entrée valide. Sur plusieurs, Entrée est un
        // retour à la ligne et c'est la combinaison qui valide : couper
        // les paragraphes d'une démarche serait absurde.
        const valide = lignes > 1 ? e.key === "Enter" && (e.metaKey || e.ctrlKey) : e.key === "Enter";
        if (valide) {
          e.preventDefault();
          retouche.fermer();
        }
      },
      className: `${classeSaisie} m-0 w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-white/40`,
    };

    return (
      <div
        className={`relative rounded-[14px] px-3.5 pb-3 pt-4 shadow-[0_0_0_2px_rgba(var(--accent-1),0.75)] ${classeCadre}`}
        style={{ background: "rgba(var(--voile),0.55)" }}
      >
        <span
          className="absolute -top-2 left-3 rounded-full px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ background: "rgba(var(--voile),0.98)", color: "rgba(var(--accent-1),0.95)" }}
        >
          {etiquette}
        </span>

        {lignes > 1 ? (
          <textarea
            ref={(noeud) => {
              champVif.current = noeud;
            }}
            rows={lignes}
            {...commun}
          />
        ) : (
          <input
            ref={(noeud) => {
              champVif.current = noeud;
            }}
            type="text"
            {...commun}
          />
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-white/12 pt-2.5">
          <p className="m-0 text-[11px] font-semibold text-white/50">
            Échap pour annuler · {lignes > 1 ? "Ctrl + Entrée" : "Entrée"} pour valider
          </p>

          <div className="flex items-center gap-2.5">
            {ideal !== undefined && (
              <span
                className="text-[11px] font-black tabular-nums"
                style={{ color: valeur.length > ideal ? AMBRE : "rgba(255,255,255,0.5)" }}
              >
                {valeur.length} / {ideal}
              </span>
            )}
            <button
              type="button"
              onClick={() => retouche.fermer()}
              className="rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-black text-[var(--color-ink)] transition active:scale-[.97]"
            >
              Valider
            </button>
          </div>
        </div>

        <p className="m-0 mt-2 text-[11.5px] leading-relaxed text-white/50">{aide}</p>
      </div>
    );
  }

  /* ---------- en retouche, au repos ---------- */

  if (!valeur.trim()) {
    return (
      <button
        type="button"
        onClick={() => retouche.ouvrir(champ)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/40 px-3.5 py-2 text-[12px] font-bold text-white/75 transition hover:border-white/80 hover:text-white active:scale-[.97] ${classeCadre}`}
      >
        <span aria-hidden>+</span>
        {etiquette}
      </button>
    );
  }

  return (
    <div className="group relative">
      <p className={classe}>{contenu}</p>

      {/* Le bloc entier est la cible, mais le texte reste du texte : le
          bouton est posé PAR-DESSUS plutôt qu'autour. Un paragraphe dans
          un `button` n'est pas du HTML valide, et le lecteur d'écran y
          perdrait la structure de la fiche. */}
      <button
        type="button"
        onClick={() => retouche.ouvrir(champ)}
        aria-label={`Modifier : ${etiquette}`}
        className="absolute -inset-x-2.5 -inset-y-2 rounded-[16px] transition hover:shadow-[0_0_0_1.5px_rgba(255,255,255,0.28)] focus-visible:shadow-[0_0_0_2px_rgba(var(--accent-1),0.75)] focus-visible:outline-none"
      />

      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 left-0 rounded-full px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.18em] opacity-0 transition group-hover:opacity-100"
        style={{ background: "rgba(var(--voile),0.95)", color: "rgba(var(--accent-1),0.95)" }}
      >
        {etiquette}
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 right-0 rounded-full bg-white px-2.5 py-[3px] text-[9.5px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)] opacity-0 transition group-hover:opacity-100"
      >
        Modifier
      </span>
    </div>
  );
}
