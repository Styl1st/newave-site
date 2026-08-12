"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Se connecter avec un compte qu'on a déjà.
 *
 * C'est la porte d'entrée principale, et elle est au-dessus du
 * formulaire pour cette raison. La plupart des gens n'ont pas envie
 * d'inventer un mot de passe de plus, et un mot de passe qu'on invente
 * à contrecœur est un mot de passe faible : proposer ces boutons
 * améliore la sécurité des comptes bien plus sûrement qu'une règle de
 * complexité.
 *
 * Le jeton n'arrive jamais ici. Le fournisseur renvoie vers
 * /auth/callback, qui l'échange contre une session côté serveur, et
 * c'est cette route qui pose le cookie.
 */

/*
 * Google seulement, pour l'instant.
 *
 * Apple était prévu et a été écarté pour une raison de coût : son
 * programme développeur est facturé quatre-vingt-dix-neuf dollars par
 * an, ce qui ne se justifie pas tant que le public vient d'Instagram,
 * où Android est au moins aussi présent qu'iPhone.
 *
 * Le jour où ça change, il suffit d'ajouter une entrée ici avec son
 * logo, et d'étendre le type ci-dessous : le reste du composant ne
 * connaît rien de particulier à Google.
 */
type Fournisseur = "google";

const FOURNISSEURS: { id: Fournisseur; nom: string; logo: React.ReactNode }[] = [
  {
    id: "google",
    nom: "Google",
    logo: (
      <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]">
        <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.87Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
      </svg>
    ),
  },
];

export default function ConnexionFournisseurs({ suite }: { suite: string }) {
  const [enCours, setEnCours] = useState<Fournisseur | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function entrer(fournisseur: Fournisseur) {
    setErreur(null);
    setEnCours(fournisseur);

    const supabase = createClient();
    if (!supabase) {
      setEnCours(null);
      setErreur("Supabase n'est pas encore branché.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: fournisseur,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?suite=${encodeURIComponent(suite)}`,
      },
    });

    if (error) {
      setEnCours(null);
      /*
       * Le message brut de Supabase quand un fournisseur n'est pas
       * activé est « Unsupported provider ». Il ne dit pas où aller le
       * chercher, et on le lit forcément un jour de mise en place.
       */
      const brut = error.message.toLowerCase();
      setErreur(
        brut.includes("provider") && brut.includes("not enabled")
          ? "La connexion Google n'est pas encore activée. Elle se règle dans Supabase, Authentication → Providers."
          : error.message
      );
      return;
    }
    // En cas de succès le navigateur part chez le fournisseur : il n'y
    // a rien à faire ici, et surtout pas à réactiver le bouton.
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3">
        {FOURNISSEURS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => entrer(f.id)}
            disabled={enCours !== null}
            className="inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-5 py-3 text-[13.5px] font-extrabold text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.28)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.42)] active:scale-[.97] disabled:opacity-55"
          >
            {enCours === f.id ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(23,10,51,0.25)] border-t-[var(--color-ink)]" />
            ) : (
              f.logo
            )}
            Continuer avec {f.nom}
          </button>
        ))}
      </div>

      {erreur && (
        <p className="m-0 rounded-[13px] border border-[#ff9db0] bg-[rgba(194,39,63,0.28)] px-4 py-3 text-[13px] leading-relaxed text-white">
          {erreur}
        </p>
      )}

      {/* Le séparateur. Il dit clairement qu'en dessous commence
          autre chose, plutôt que de laisser deviner. */}
      <div className="my-1 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-white/20" />
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/45">
          ou avec un email
        </span>
        <span className="h-px flex-1 bg-white/20" />
      </div>
    </div>
  );
}
