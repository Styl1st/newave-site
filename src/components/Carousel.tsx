"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jeuDeVignettes, vignette } from "@/lib/vignette";
import { estUneVideo } from "@/lib/medias";

/**
 * Carrousel à défilement natif.
 *
 * La version précédente remplaçait l'adresse d'une seule image. Sur
 * téléphone, cela voulait dire : pas de glissement du doigt, un blanc
 * à chaque changement le temps que la nouvelle image se charge, et
 * aucun élan. Ici, toutes les images sont réellement présentes côte à
 * côte dans une bande qu'on fait défiler.
 *
 * C'est le navigateur qui gère le geste, l'inertie et l'aimantation —
 * il le fait mieux que n'importe quel code, et sans rien écouter en
 * permanence. On ne lit la position que pour allumer la bonne pastille.
 *
 * PHOTOS ET VIDÉOS DANS LA MÊME SUITE. Une adresse qui finit en `.mp4`
 * devient une vidéo, les autres restent des images : c'est tout ce qui
 * distingue les deux, et ça suffit. Seule la vidéo affichée joue ; les
 * autres sont en pause. Trois vidéos qui tournent en même temps dans un
 * carrousel dont on n'en voit qu'une, c'est du travail pour rien et de
 * la bande passante gaspillée.
 */
export default function Carousel({
  images,
  alt,
  className = "",
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const bande = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  /*
   * LE CADRE PREND LA FORME DE LA PHOTO, ET NON L'INVERSE.
   *
   * Il était fixé à quatre sur cinq pour tout le monde. Une photo de
   * boutique qui n'a pas exactement ce rapport ne pouvait donc que
   * perdre ses bords, ou laisser voir le fond clair de la carte en
   * dessous d'elle : c'est la bande blanche, et elle revenait sans
   * cesse parce qu'on s'attaquait au symptôme.
   *
   * On lit donc les proportions de la PREMIÈRE image au chargement, et
   * le cadre s'y règle. Elle s'affiche alors en entier, sans rognure et
   * sans bande, quelle que soit la façon dont la marque photographie.
   * Les suivantes se recadrent sur le même gabarit : c'est le prix à
   * payer pour que la bande ne saute pas d'une photo à l'autre, et les
   * photos d'une même boutique partagent presque toujours un format.
   */
  const [forme, setForme] = useState<number | null>(null);

  /** Un lecteur par vidéo, pour n'en laisser jouer qu'une. */
  const lecteurs = useRef<(HTMLVideoElement | null)[]>([]);

  const relire = useCallback(() => {
    const el = bande.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  useEffect(() => {
    const el = bande.current;
    if (!el) return;
    el.addEventListener("scroll", relire, { passive: true });
    return () => el.removeEventListener("scroll", relire);
  }, [relire]);

  /*
   * Une seule vidéo à la fois : celle qu'on regarde.
   *
   * Elle démarre en arrivant et s'arrête en partant, comme sur un fil
   * de réseau social. Les autres sont remises à zéro plutôt que
   * simplement suspendues : retrouver une vidéo à sa dixième seconde
   * parce qu'on est passé devant tout à l'heure donne l'impression
   * d'avoir raté le début.
   */
  useEffect(() => {
    lecteurs.current.forEach((v, i) => {
      if (!v) return;
      if (i === index) {
        v.play().catch(() => {});
        return;
      }
      v.pause();
      if (v.currentTime > 0) v.currentTime = 0;
    });
  }, [index]);

  if (images.length === 0) return null;

  const clamped = Math.min(index, images.length - 1);

  function aller(n: number) {
    const el = bande.current;
    if (!el) return;
    const cible = (n + images.length) % images.length;
    el.scrollTo({ left: cible * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div
      className={`relative ${className}`}
      /*
       * Quatre sur cinq tant qu'on ne sait pas : c'est le format des
       * photos de mode, donc le meilleur pari en attendant la vraie
       * mesure. Elle arrive au premier affichage et corrige d'elle-même.
       */
      style={{ aspectRatio: forme ?? 4 / 5 }}
    >
      <div
        ref={bande}
        /*
         * `pan-x pan-y`, et les deux sont indispensables.
         *
         * Il n'y avait que `pan-y`, ce qui voulait dire : le navigateur
         * ne prend en charge que le geste vertical sur cet élément. Le
         * geste horizontal n'était donc transmis à personne, et le
         * carrousel refusait de tourner au doigt. C'est le défaut
         * constaté sur téléphone.
         *
         * Avec les deux axes déclarés, le navigateur reconnaît la
         * direction dominante du geste : horizontal, il fait tourner
         * les images ; vertical, il laisse la page défiler. C'est
         * exactement ce qu'on veut, et c'est lui qui décide, pas nous.
         */
        style={{ touchAction: "pan-x pan-y" }}
        /*
         * `sans-ascenseur` PLUTÔT QUE DES VARIANTES ÉCRITES À LA MAIN.
         *
         * Il y avait ici trois classes fabriquées entre crochets pour
         * masquer la barre de défilement. Elles ne prenaient pas, et la
         * barre restait : c'est la bande claire qu'on voyait sous la
         * photo, avec les pastilles posées dessus. Ce n'était donc ni un
         * problème de cadrage ni un problème de format, mais une barre
         * de défilement bien réelle qu'on croyait cachée.
         *
         * Le site a déjà une classe pour ça, employée ailleurs et qui
         * marche. On s'en sert.
         */
        className="sans-ascenseur flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {images.map((src, i) =>
          estUneVideo(src) ? (
            <div
              key={src + i}
              className="w-full shrink-0 snap-center bg-linear-to-br from-[#efe6ff] to-[#d9c9f7]"
            >
              <video
                ref={(el) => {
                  lecteurs.current[i] = el;
                }}
                src={src}
                muted
                loop
                playsInline
                /* La première peut être demandée tout de suite ; les
                   autres attendent qu'on arrive dessus, sinon ouvrir un
                   post en télécharge quatre d'un coup. */
                preload={i === 0 ? "metadata" : "none"}
                aria-label={i === 0 ? alt : undefined}
                onLoadedMetadata={(e) => {
                  if (i === 0 && e.currentTarget.videoWidth) {
                    setForme(e.currentTarget.videoWidth / e.currentTarget.videoHeight);
                  }
                }}
                className="block h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              key={src + i}
              className="w-full shrink-0 snap-center bg-linear-to-br from-[#efe6ff] to-[#d9c9f7]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vignette(src, 900)}
                srcSet={jeuDeVignettes(src, 900)}
                sizes="(max-width: 1024px) 100vw, 620px"
                alt={i === 0 ? alt : ""}
                /* La première est celle qu'on voit tout de suite : elle
                   se charge sans attendre, les autres à l'approche. */
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                onLoad={(e) => {
                  if (i === 0 && e.currentTarget.naturalWidth) {
                    setForme(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight);
                  }
                }}
                className="block h-full w-full object-cover"
              />
            </div>
          )
        )}
      </div>

      {images.length > 1 && (
        <>
          {/*
            `z-10` n'est pas décoratif : sans lui, ces boutons ne
            servaient à rien sur ordinateur.

            Les images portent `z-index: 1` — c'est ce qui les fait
            passer devant le dégradé d'attente pendant leur chargement.
            Les flèches, elles, n'avaient aucun rang, donc zéro. Une
            image opaque et large comme la bande se posait donc par
            dessus : on la faisait glisser au doigt sans problème, mais
            le clic sur la flèche atterrissait sur l'image. Le geste
            marchait, le bouton non, exactement comme constaté.
          */}
          {/* Visibles aussi sur téléphone.
              Elles y étaient masquées, au motif qu'on fait glisser au
              doigt. C'est vrai, mais ça suppose qu'on ait deviné qu'il
              y a plusieurs photos : les pastilles du bas sont petites,
              et rien d'autre ne le dit. Deux flèches lèvent le doute
              tout de suite. Un peu plus petites qu'en grand, pour ne
              pas manger la photo. */}
          <button
            type="button"
            onClick={() => aller(clamped - 1)}
            aria-label="Image précédente"
            className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-[17px] font-black text-white backdrop-blur-sm transition hover:bg-black/55 active:scale-95 sm:left-3 sm:h-10 sm:w-10 sm:text-[18px]"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => aller(clamped + 1)}
            aria-label="Image suivante"
            className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-[17px] font-black text-white backdrop-blur-sm transition hover:bg-black/55 active:scale-95 sm:right-3 sm:h-10 sm:w-10 sm:text-[18px]"
          >
            ›
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2.5 py-1.5 backdrop-blur-sm">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => aller(i)}
                aria-label={`Image ${i + 1} sur ${images.length}`}
                aria-current={i === clamped}
                className={`h-1.5 rounded-full transition-all ${
                  i === clamped ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
