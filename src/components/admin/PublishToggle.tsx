"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBrandStatus } from "@/app/admin/actions";
import { IconCheck, IconEye } from "@/components/Icons";
import { useConfirmation } from "@/lib/confirmation";
import { annoncer } from "@/components/Confirmations";

/**
 * Publier ou retirer une marque, sans passer par le formulaire.
 *
 * Le bouton dit ce qui va se passer, pas l'état actuel : « Publier »
 * quand la fiche est en brouillon. Un bouton qui affiche l'état laisse
 * toujours un doute sur ce que fait le clic.
 */
export default function PublishToggle({
  brandId,
  brandName,
  published,
  taille = "normale",
  bloque = null,
}: {
  brandId: string;
  brandName: string;
  published: boolean;
  /**
   * « compacte » pour une ligne de liste, sur fond clair. « barre » pour
   * la barre de la marque (`BarreGerant`), à côté de « Modifier la
   * fiche » : même gabarit que ses autres boutons.
   */
  taille?: "normale" | "compacte" | "barre";
  /**
   * Ce qui empêche de publier, quand on le sait déjà (la phrase de
   * `obstacleAPublication`). Le bouton se grise et la phrase passe en
   * infobulle, plutôt que de laisser cliquer pour se faire refuser. Le
   * serveur revérifie de toute façon.
   */
  bloque?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { arme, demander, desarmer } = useConfirmation();

  function basculer() {
    // Retirer une marque de l'annuaire se demande deux fois. Publier,
    // non : c'est l'action qu'on vient chercher, et elle se défait.
    if (published && !demander()) return;
    desarmer();

    const formData = new FormData();
    formData.set("id", brandId);
    formData.set("publier", published ? "0" : "1");

    startTransition(async () => {
      const res = await toggleBrandStatus(formData);
      /*
       * Le compte rendu part dans le bandeau du site plutôt que sous le
       * bouton. Il était affiché ici, en petit, aligné à droite : dans
       * une liste de soixante-dix lignes, il tombait souvent hors de
       * l'écran au moment où la liste se réordonnait, et l'on ne savait
       * pas si le clic avait pris.
       */
      annoncer(
        res.ok ? (res.message ?? "C'est fait.") : (res.error ?? "L'opération a échoué."),
        res.ok ? "ok" : "erreur"
      );
      router.refresh();
    });
  }

  const compacte = taille === "compacte";

  /*
   * DANS LA BARRE DE LA MARQUE : un seul bouton, sans phrase dessous.
   *
   * La barre aligne ses boutons sur une rangée ; un paragraphe de
   * confirmation sous l'un d'eux la ferait grandir d'un coup. La
   * conséquence du retrait est donc dans l'infobulle, et le libellé
   * suffit à dire qu'un second appui est attendu.
   */
  if (taille === "barre") {
    const empeche = !published && Boolean(bloque);
    return (
      <button
        type="button"
        disabled={pending || empeche}
        onClick={basculer}
        onBlur={desarmer}
        title={
          arme
            ? `${brandName} redevient un brouillon : sa page quitte l'annuaire, rien n'est supprimé.`
            : empeche
              ? (bloque ?? undefined)
              : undefined
        }
        className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-[13px] px-3.5 py-2.5 text-[13px] transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-0 lg:flex-none ${
          published
            ? `border font-bold ${
                arme
                  ? "border-[#ff9db0] bg-[rgba(194,39,63,0.35)] text-white"
                  : "border-white/20 bg-white/10 text-white/80 hover:bg-white/16 hover:text-white"
              }`
            : "font-black text-white"
        }`}
        style={
          published
            ? undefined
            : {
                backgroundImage:
                  "linear-gradient(118deg, rgba(var(--accent-1),.7), rgba(var(--accent-2),.7))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.25)",
              }
        }
      >
        {published ? <IconEye /> : <IconCheck />}
        {pending
          ? "…"
          : arme
            ? "Confirmer le retrait"
            : published
              ? "Retirer"
              : "Publier"}
      </button>
    );
  }

  // La version compacte vit sur une carte claire : le contraste s'inverse.
  const styleBouton = compacte
    ? published
      ? "inline-flex items-center gap-1.5 rounded-full border border-[rgba(23,10,51,0.2)] px-3.5 py-2 text-[11.5px] font-bold text-[#3a2470] transition hover:bg-[rgba(23,10,51,0.07)] active:scale-[.97] disabled:opacity-50"
      : "inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 py-2 text-[11.5px] font-black text-white transition hover:opacity-85 active:scale-[.97] disabled:opacity-50"
    : published
      ? "inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/8 px-5 py-2.5 text-[12.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97] disabled:opacity-50"
      : "inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[12.5px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(var(--voile),0.3)] transition hover:shadow-[0_8px_22px_rgba(var(--voile),0.45)] active:scale-[.97] disabled:opacity-50"

  const libelle = arme
    ? compacte
      ? "Confirmer"
      : "Confirmer le retrait"
    : compacte
      ? published
        ? "Retirer"
        : "Publier"
      : published
        ? "Retirer de l'annuaire"
        : "Publier la marque";

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={basculer}
        onBlur={desarmer}
        className={arme ? `${styleBouton} ring-2 ring-white/70` : styleBouton}
      >
        {published ? <IconEye /> : <IconCheck />}
        {pending ? "…" : libelle}
      </button>

      {arme && (
        <p
          className={
            compacte
              ? "m-0 max-w-[220px] text-right text-[11px] leading-snug text-[#6a5a92]"
              : "m-0 max-w-xs text-right text-[12px] leading-snug text-white/70"
          }
        >
          {brandName} redevient un brouillon : sa page quitte l&apos;annuaire, rien
          n&apos;est supprimé.
        </p>
      )}
    </div>
  );
}
