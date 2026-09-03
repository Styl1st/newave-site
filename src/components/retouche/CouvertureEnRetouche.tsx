"use client";

import { vignette } from "@/lib/vignette";
import EnvoiVisuel from "./EnvoiVisuel";
import { useRetouche } from "./ContexteRetouche";

/**
 * La couverture, pendant qu'on la change.
 *
 * ELLE EST LA SEULE CHOSE QUI PORTE SON CADRE EN PERMANENCE. Un texte
 * dit ce qu'il est ; une image, non — rien ne distingue une couverture
 * qu'on peut remplacer d'une couverture qui vient d'ailleurs. D'où le
 * liseré rose et le mot « Modifiable » posés dessus tant que la
 * retouche dure, alors que les textes attendent le survol.
 *
 * EN RETOUCHE, ON MONTRE LA COUVERTURE, PAS LE BANDEAU. La page publique
 * fait défiler les pièces par-dessus et pose le logo dans un coin (voir
 * `BandeauMarque`) : c'est une belle vitrine, et c'est exactement ce
 * qu'il ne faut pas quand on vient remplacer l'image du dessous — on ne
 * verrait pas ce qu'on change. Le bandeau revient dès qu'on quitte la
 * retouche.
 *
 * LE LOGO EST ICI, ET NON SUR LE LOGO. Le dessin de `11b` pose une
 * pastille crayon sur un logo de 88 pixels affiché sous le nom ; cette
 * page-là n'en a pas — son logo vit à l'intérieur du bandeau, dans un
 * composant qui ne nous appartient pas. Le geste est donc rangé avec les
 * autres visuels, où on le cherchera de toute façon.
 */
export default function CouvertureEnRetouche({ children }: { children: React.ReactNode }) {
  const retouche = useRetouche();
  if (!retouche) return null;

  const { actif, etroit, brouillon, definir, ouvrir, slug, mots } = retouche;

  // Hors retouche, la page reste la page : c'est le rendu du serveur qui
  // s'affiche, bandeau et lien vers la boutique compris.
  if (!actif) return <>{children}</>;

  const dossier = `marques/${slug}`;
  const aQuelqueChose = Boolean(brouillon.cover_url || brouillon.cover_video_url);

  /* Au doigt, la surface entière ouvre la feuille : deux boutons de
     douze pixels posés au milieu d'une image ne se visent pas. */
  if (etroit) {
    return (
      <button
        type="button"
        onClick={() => ouvrir("cover_url")}
        data-no-reveal
        className="relative mt-8 block w-full overflow-hidden rounded-[var(--radius)] text-left shadow-[0_0_0_2px_rgba(var(--accent-1),0.55)]"
      >
        <Apercu image={brouillon.cover_url} video={brouillon.cover_video_url} />
        <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[var(--color-ink)]">
          {mots.couverture}
        </span>
      </button>
    );
  }

  return (
    <div
      data-no-reveal
      className="group relative mt-8 overflow-hidden rounded-[var(--radius)] shadow-[0_0_0_2px_rgba(var(--accent-1),0.55)]"
    >
      <Apercu image={brouillon.cover_url} video={brouillon.cover_video_url} />

      <span className="pointer-events-none absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)] backdrop-blur-sm" style={{ background: "rgba(var(--voile),0.72)" }}>
        Modifiable
      </span>

      {/* Le voile n'apparaît qu'au survol : posé en permanence, il
          assombrirait la couverture qu'on est venu juger. */}
      <div
        className={`absolute inset-0 flex flex-wrap content-center items-center justify-center gap-2.5 p-4 transition ${
          aQuelqueChose ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100" : "opacity-100"
        }`}
        style={{ background: aQuelqueChose ? "rgba(var(--voile),0.62)" : "transparent" }}
      >
        <EnvoiVisuel
          dossier={dossier}
          libelle={brouillon.cover_url ? "Changer l'image" : "Ajouter une image"}
          className="rounded-full bg-white px-4 py-2 text-[12px] font-black text-[var(--color-ink)]"
          onEnvoye={(adresse) => definir("cover_url", adresse)}
        />

        <EnvoiVisuel
          dossier={dossier}
          accepte="video/mp4,video/webm"
          libelle={brouillon.cover_video_url ? "Changer la vidéo" : "Mettre une vidéo"}
          className="rounded-full border border-white/40 px-4 py-2 text-[12px] font-bold text-white"
          onEnvoye={(adresse) => definir("cover_video_url", adresse)}
        />

        <EnvoiVisuel
          dossier={dossier}
          libelle={brouillon.logo_url ? "Changer le logo" : "Ajouter un logo"}
          className="rounded-full border border-white/40 px-4 py-2 text-[12px] font-bold text-white"
          onEnvoye={(adresse) => definir("logo_url", adresse)}
        />

        {brouillon.cover_video_url && (
          <button
            type="button"
            onClick={() => definir("cover_video_url", "")}
            className="rounded-full px-3 py-2 text-[11.5px] font-bold text-white/75 underline decoration-white/40 underline-offset-4 transition hover:text-white"
          >
            Retirer l&apos;animation
          </button>
        )}
      </div>

      {/* La règle de `VisuelCouverture`, redite ici parce qu'elle se
          découvre au pire moment : une vidéo seule laisse la marque sans
          vignette dans l'annuaire et sans aperçu quand on partage son
          lien. */}
      {brouillon.cover_video_url && !brouillon.cover_url && (
        <p
          className="m-0 px-4 py-2.5 text-[11.5px] leading-relaxed text-white"
          style={{ background: "rgba(var(--voile),0.9)" }}
        >
          Il manque une image fixe : les cartes de l&apos;annuaire et l&apos;aperçu de partage
          ne savent pas lire une vidéo.
        </p>
      )}
    </div>
  );
}

/** Ce qu'il y a sous les boutons : la vidéo si elle existe, l'image sinon. */
function Apercu({ image, video }: { image: string; video: string }) {
  if (video) {
    return (
      <video
        src={video}
        poster={image ? vignette(image, 1200) : undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="block aspect-16/9 w-full bg-white/8 object-cover"
      />
    );
  }

  if (image) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={vignette(image, 1200)}
        alt=""
        className="block aspect-16/9 w-full bg-white/8 object-cover"
      />
    );
  }

  return (
    <span className="grid aspect-16/9 w-full place-items-center border border-dashed border-white/30 bg-white/6 px-4 text-center text-[12px] font-bold uppercase tracking-[0.12em] text-white/55">
      Aucune couverture
    </span>
  );
}
