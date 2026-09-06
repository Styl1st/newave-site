"use client";

import { useState, useTransition } from "react";
import { supprimerMonCompte } from "@/app/compte/actions";

/**
 * Partir, pour de bon.
 *
 * POURQUOI ON FAIT ÉCRIRE SON ADRESSE, ALORS QUE LE SITE CONFIRME
 * PARTOUT AILLEURS EN DEUX APPUIS. La confirmation à deux appuis est
 * faite pour ce qui se rattrape : dépublier une fiche, retirer un
 * favori, supprimer un post qu'on peut réécrire. Ici rien ne se
 * rattrape, et surtout on ne se rend pas compte de son erreur — il n'y
 * a pas d'écran d'après où l'on découvrirait le dégât. Recopier son
 * adresse prend cinq secondes et demande de LIRE ce qu'on est en train
 * de faire, ce qu'un second appui ne demande jamais.
 *
 * ON NE DEMANDE PAS LE MOT DE PASSE. Beaucoup se sont inscrits avec
 * Google et n'en ont jamais eu : le geste serait impossible pour eux, ou
 * bien il faudrait deux chemins selon la façon de s'être inscrit. La
 * session en cours est déjà une preuve d'identité.
 *
 * CE QU'ON ANNONCE EST CE QUI SE PASSE. Les favoris et les avis partent
 * en cascade avec le compte ; les marques gérées restent dans
 * l'annuaire, seul le rattachement disparaît. Voir migration-30, où le
 * schéma tient cette règle.
 */
export default function SuppressionCompte({ email }: { email: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  /* La casse et les espaces ne sont pas le sujet : on vérifie qu'on a
     bien écrit son adresse, pas qu'on sait la recopier au caractère. */
  const concorde = saisie.trim().toLowerCase() === email.trim().toLowerCase();

  function partir() {
    setErreur(null);
    demarrer(async () => {
      const res = await supprimerMonCompte();
      if (!res.ok) {
        setErreur(res.error ?? "La suppression n'a pas abouti.");
        return;
      }
      /*
       * Un rechargement complet, et non une navigation.
       *
       * Le compte n'existe plus : tout ce que le navigateur garde en
       * mémoire — profil, favoris, marques gérées — parle de quelqu'un
       * qui n'est plus là. Une navigation ordinaire en garderait une
       * partie jusqu'au prochain rafraîchissement.
       */
      window.location.assign("/");
    });
  }

  return (
    <section
      className="mt-4 rounded-[var(--radius)] border p-4 sm:p-[26px]"
      style={{
        borderColor: "rgba(194,39,63,.45)",
        backgroundColor: "rgba(70,10,26,.28)",
      }}
    >
      <h2 className="m-0 text-[17px] font-extrabold text-white">Supprimer mon compte</h2>
      <p className="m-0 mt-2 max-w-prose text-[13px] leading-relaxed text-white/70">
        Tes favoris et tes avis partent avec. Les marques que tu gères restent dans
        l&apos;annuaire.
      </p>

      {!ouvert ? (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-[#c2273f] px-5 text-[12.5px] font-extrabold text-white transition hover:bg-[rgba(194,39,63,0.35)] active:scale-[.97] sm:min-h-0 sm:py-2.5"
        >
          Supprimer mon compte
        </button>
      ) : (
        <div className="mt-4">
          <label
            htmlFor="confirmation-suppression"
            className="m-0 block text-[12.5px] font-bold text-white/85"
          >
            Écris {email} pour confirmer.
          </label>
          <input
            id="confirmation-suppression"
            type="email"
            autoComplete="off"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={email}
            className="champ mt-2"
          />

          {erreur && (
            <p className="m-0 mt-3 text-[12.5px] font-bold text-white">{erreur}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={partir}
              disabled={!concorde || enCours}
              className="inline-flex min-h-[44px] items-center rounded-full bg-[#c2273f] px-5 text-[12.5px] font-extrabold text-white transition hover:opacity-90 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:py-2.5"
            >
              {enCours ? "Suppression…" : "Supprimer définitivement"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOuvert(false);
                setSaisie("");
                setErreur(null);
              }}
              disabled={enCours}
              className="inline-flex min-h-[44px] items-center rounded-full px-4 text-[12.5px] font-bold text-white/75 transition hover:text-white active:scale-[.97] disabled:opacity-50 sm:min-h-0 sm:py-2.5"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
