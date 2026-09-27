"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EVENEMENT_LUS } from "@/lib/messages";

/**
 * L'icône Messages de la barre, avec le nombre de conversations non lues.
 *
 * POURQUOI CÔTÉ NAVIGATEUR. La barre est rendue une fois par la mise en
 * page et ne se refait pas quand on change de page : un compteur calculé
 * par le serveur resterait figé. Celui-ci se relit à chaque changement
 * de page, au retour sur l'onglet, et quand la messagerie annonce
 * qu'une conversation vient d'être lue. Il interroge Supabase
 * directement : pas de passage par le serveur du site pour un nombre.
 *
 * Tant que la migration 38 n'est pas passée, la fonction n'existe pas :
 * l'icône reste, sans pastille.
 *
 * `useNonLus` sert aussi à la barre d'onglets du forum, au doigt.
 */
export function useNonLus(actif = true): number {
  const supabase = useMemo(() => createClient(), []);
  const chemin = usePathname();
  const [nombre, setNombre] = useState(0);

  const relire = useCallback(async () => {
    // Sans compte, il n'y a rien à compter : on ne dérange pas la base.
    if (!supabase || !actif) return;
    const { data, error } = await supabase.rpc("messages_non_lus");
    if (!error && typeof data === "number") setNombre(data);
  }, [supabase, actif]);

  useEffect(() => {
    void relire();
  }, [relire, chemin]);

  useEffect(() => {
    const auRetour = () => document.visibilityState === "visible" && void relire();
    const surLecture = () => void relire();
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener(EVENEMENT_LUS, surLecture);
    return () => {
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener(EVENEMENT_LUS, surLecture);
    };
  }, [relire]);

  return nombre;
}

export default function PastilleMessages({ compact = false }: { compact?: boolean }) {
  const nombre = useNonLus();
  const libelle = nombre > 0 ? `Messages, ${nombre} non lu${nombre > 1 ? "s" : ""}` : "Messages";

  return (
    <Link
      href="/messages"
      aria-label={libelle}
      title={libelle}
      className={`relative grid shrink-0 place-items-center rounded-full transition active:scale-95 ${
        compact
          ? "puce-barre h-9 w-9 text-white/85"
          : "puce-barre ml-1.5 h-9 w-9 text-white/85 hover:text-white"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[17px] w-[17px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      >
        <path d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4z" />
      </svg>
      {nombre > 0 && (
        <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#e58ad8] px-1 text-[10px] font-black leading-none text-[var(--color-ink)] shadow-[0_2px_6px_rgba(23,10,51,0.3)]">
          {nombre > 9 ? "9+" : nombre}
        </span>
      )}
    </Link>
  );
}
