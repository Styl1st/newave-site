"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Portal from "./Portal";

type Entree = { href: string; label: string };

/**
 * Tiroir de navigation pour mobile et tablette.
 *
 * Il glisse depuis la droite, du côté du pouce et du bouton qui
 * l'ouvre : le mouvement part de l'endroit où l'on vient d'appuyer,
 * ce qui rend l'apparition lisible plutôt que surgissante.
 */
export default function MobileMenu({
  liens,
  compte,
}: {
  liens: Entree[];
  compte: { titre: string; liens: Entree[] };
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    // Une frame avant d'animer, sinon le navigateur peint directement
    // l'état final et le glissement ne se voit pas.
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, [open]);

  function fermer() {
    setVisible(false);
    // On laisse l'animation de sortie se terminer avant de démonter.
    setTimeout(() => setOpen(false), 260);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) fermer(); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("keydown", onKey);
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = precedent;
    };
  }, [open]);

  const item =
    "flex items-center justify-between rounded-[14px] px-4 py-3.5 text-[15px] font-bold text-white transition hover:bg-white/14 active:scale-[.98]";

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? fermer() : setOpen(true))}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-full bg-white/12 transition hover:bg-white/22 active:scale-95 md:hidden"
      >
        <span className="relative block h-[14px] w-[18px]">
          <span className={`absolute left-0 block h-[2.2px] w-full rounded-full bg-white transition-all duration-300 ${visible ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`} />
          <span className={`absolute left-0 top-1/2 block h-[2.2px] w-full -translate-y-1/2 rounded-full bg-white transition-opacity duration-200 ${visible ? "opacity-0" : "opacity-100"}`} />
          <span className={`absolute left-0 block h-[2.2px] w-full rounded-full bg-white transition-all duration-300 ${visible ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"}`} />
        </span>
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[100] md:hidden">
            <div
              onClick={fermer}
              className={`absolute inset-0 bg-[rgba(20,8,50,0.7)] backdrop-blur-md transition-opacity duration-260 ${visible ? "opacity-100" : "opacity-0"}`}
            />

            <nav
              className={`absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto border-l border-white/20 bg-[rgba(38,14,88,0.92)] p-4 backdrop-blur-2xl transition-transform duration-260 ease-[cubic-bezier(.2,.8,.3,1)] ${visible ? "translate-x-0" : "translate-x-full"}`}
            >
              <div className="mb-4 flex items-center justify-between px-1 pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-white.webp" alt="NEWAVE SPHERE" className="h-6 w-auto" />
                <button
                  type="button"
                  onClick={fermer}
                  aria-label="Fermer"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/12 text-[17px] font-black text-white transition hover:bg-white/25"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {liens.map((l) => (
                  <Link key={l.href} href={l.href} className={item}>
                    {l.label}
                    <span className="text-white/40">›</span>
                  </Link>
                ))}
              </div>

              <div className="mt-4 border-t border-white/15 pt-4">
                <p className="eyebrow m-0 mb-2 px-4">{compte.titre}</p>
                <div className="flex flex-col gap-1">
                  {compte.liens.map((l) => (
                    <Link key={l.href} href={l.href} className={item}>
                      {l.label}
                      <span className="text-white/40">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </Portal>
      )}
    </>
  );
}
