import type { Metadata } from "next";
import Link from "next/link";
import {
  DisplayNameForm,
  EmailForm,
  LienReinitialisation,
  LogoutButton,
} from "@/components/AccountForms";
import ThemePicker from "@/components/ThemePicker";
import { requireUser } from "@/lib/auth";
import { lireApparenceDuCompte } from "@/lib/apparence";
import { ROLE_LABEL } from "@/lib/types";
import { getManagedBrands } from "@/lib/brand-space";
import { getFavoriteBrands } from "@/lib/favorites";

export const metadata: Metadata = { title: "Mon compte" };
export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const profile = await requireUser();
  const [brands, favorites, apparence] = await Promise.all([
    getManagedBrands(),
    getFavoriteBrands(),
    lireApparenceDuCompte(),
  ]);

  const isAdmin = profile.role === "admin";
  const raccourcis = [
    {
      href: "/favoris",
      label: "Mes favoris",
      note: favorites.length
        ? `${favorites.length} marque${favorites.length > 1 ? "s" : ""}`
        : "Aucune pour l'instant",
      show: true,
    },
    {
      href: "/espace-marque",
      label: "Espace marque",
      note: brands.length
        ? `${brands.length} marque${brands.length > 1 ? "s" : ""} à gérer`
        : "Aucune marque rattachée",
      show: brands.length > 0 || isAdmin || profile.role === "createur",
    },
    {
      href: "/admin",
      label: "Administration",
      note: "Posts, marques, candidatures",
      show: isAdmin,
    },
  ].filter((r) => r.show);

  return (
    <div className="mx-auto w-full max-w-3xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-9">
        <p className="eyebrow m-0">Ton compte</p>
        <h1 className="m-0 mt-2 text-[clamp(22px,4.9vw,34px)] font-extrabold leading-tight tracking-[-0.03em] text-white">
          {profile.display_name ?? "Mon compte"}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="m-0 text-[14.5px] text-white/78">{profile.email}</p>
          {profile.role !== "membre" && <span className="badge">{ROLE_LABEL[profile.role]}</span>}
        </div>
      </header>

      {/* ---------- raccourcis ---------- */}
      <div className="rise rise-1 grid gap-4 sm:grid-cols-2">
        {raccourcis.map((r) => (
          <Link key={r.href} href={r.href} className="card-light p-5">
            <div className="relative z-3 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[15px] font-extrabold text-[var(--color-ink)]">
                  {r.label}
                </span>
                <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#6a5a92]">
                  {r.note}
                </span>
              </span>
              <span className="text-[18px] font-black text-[#3a2470]">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ---------- identite ---------- */}
      <section className="glass rise rise-2 mt-8 p-4 sm:p-7">
        <h2 className="m-0 text-[17px] font-extrabold text-white">Ton identité</h2>
        <p className="m-0 mt-2 mb-5 text-[13.5px] leading-relaxed text-white/70">
          Ton nom affiché change tout de suite. Ton adresse email, elle, demande une
          confirmation dans les deux boîtes, l&apos;ancienne et la nouvelle, pour que
          personne ne puisse déplacer ton compte à ta place.
        </p>
        <DisplayNameForm current={profile.display_name ?? ""} />
        {profile.email && <EmailForm actuel={profile.email} />}
      </section>

      {/* ---------- securite ---------- */}
      <section className="glass rise rise-3 mt-6 p-4 sm:p-7">
        <h2 className="m-0 text-[17px] font-extrabold text-white">Mot de passe</h2>
        <p className="m-0 mt-2 text-[13.5px] leading-relaxed text-white/70">
          On ne le change pas depuis cette page, et c&apos;est voulu : une session
          restée ouverte sur un appareil posé quelque part suffirait, sinon, à te
          faire prendre ton compte. On t&apos;envoie donc un lien, et il faut avoir
          accès à ta boîte mail pour aller au bout.
        </p>
        <p className="m-0 mt-2 mb-5 text-[13px] leading-relaxed text-white/55">
          C&apos;est aussi par là qu&apos;il faut passer si tu t&apos;es inscrit avec
          Google : tu n&apos;as jamais eu de mot de passe, et ce lien t&apos;en donne
          un.
        </p>
        {profile.email && <LienReinitialisation email={profile.email} />}
      </section>

      {/* ---------- apparence ---------- */}
      <section className="glass rise rise-3 mt-6 p-4 sm:p-7">
        <h2 className="m-0 text-[17px] font-extrabold text-white">Apparence</h2>
        <p className="m-0 mt-2 mb-5 text-[13.5px] leading-relaxed text-white/70">
          Le fond du site, à ton goût. Le réglage est rangé avec ton compte : il te
          suit d&apos;un appareil à l&apos;autre, et personne d&apos;autre ne le voit.
        </p>
        <ThemePicker duCompte={apparence} connecte />
      </section>

      {/* ---------- sortie ---------- */}
      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-8">
        <p className="m-0 text-[13px] text-white/60">
          Connecté en tant que {profile.email}
        </p>
        <LogoutButton />
      </section>
    </div>
  );
}
