"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useNonLus } from "@/components/messages/PastilleMessages";

/**
 * La barre d'onglets du forum, au doigt : Forum · Publier · Messages ·
 * Profil (2c).
 *
 * SEULEMENT DANS LE FORUM ET LA MESSAGERIE. Le reste du site a son
 * menu ; une deuxième navigation posée sur toutes les pages en ferait
 * deux à regarder. Ici, les quatre gestes du forum restent sous le
 * pouce pendant qu'on descend le fil.
 *
 * « Profil » mène à Mon compte, où se règlent le pseudo, la ville et la
 * phrase de présentation, en attendant la page de profil publique.
 */

type Onglet = "forum" | "publier" | "messages" | "profil";

export default function OngletsForum({ actif, connecte }: { actif: Onglet; connecte: boolean }) {
  const nonLus = useNonLus(connecte);

  /* Le pied de page se décale de la hauteur de la barre (`--pied`, voir
     globals.css) : sans cela, ses derniers liens passeraient dessous. */
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.pied) return;
    html.dataset.pied = "forum";
    return () => {
      if (html.dataset.pied === "forum") delete html.dataset.pied;
    };
  }, []);
  const vers = (chemin: string) => (connecte ? chemin : `/connexion?suite=${encodeURIComponent(chemin)}`);

  const onglets: { cle: Onglet; label: string; href: string }[] = [
    { cle: "forum", label: "Forum", href: "/forum" },
    { cle: "publier", label: "Publier", href: vers("/forum/publier") },
    { cle: "messages", label: "Messages", href: vers("/messages") },
    { cle: "profil", label: "Profil", href: vers("/compte") },
  ];

  return (
    <nav
      aria-label="Forum"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/15 bg-[rgba(var(--voile),0.86)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl md:hidden"
    >
      <ul className="m-0 grid list-none grid-cols-4 p-0">
        {onglets.map((o) => {
          const courant = o.cle === actif;
          return (
            <li key={o.cle}>
              <Link
                href={o.href}
                aria-current={courant ? "page" : undefined}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[12.5px] font-extrabold transition ${
                  courant ? "text-white" : "text-white/70"
                }`}
              >
                <span className="flex items-center gap-1">
                  {o.cle === "publier" && <span aria-hidden className="text-[15px] leading-none">+</span>}
                  {o.label}
                </span>
                {o.cle === "messages" && nonLus > 0 && (
                  <span className="text-[11px] font-black leading-none text-[#e58ad8]">{nonLus > 9 ? "9+" : nonLus}</span>
                )}
                {courant && <span aria-hidden className="absolute bottom-2 h-[2px] w-9 rounded-full bg-white" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
