import type { Metadata } from "next";
import Link from "next/link";
import {
  DisplayNameForm,
  EmailForm,
  LienReinitialisation,
} from "@/components/AccountForms";
import CompteEcran, { type Espace } from "@/components/CompteEcran";
import ComptePropositions from "@/components/ComptePropositions";
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

  /* Une seule liste pour les deux endroits qui la montrent : les cartes
     de raccourci du volet Profil et le groupe « Mes espaces » du rail.
     Deux listes voudraient dire deux filtres par rôle à tenir d'accord. */
  const raccourcis = [
    {
      href: "/favoris",
      label: "Mes favoris",
      note: favorites.length
        ? `${favorites.length} marque${favorites.length > 1 ? "s" : ""}`
        : "Aucune pour l'instant",
      compte: favorites.length,
      show: true,
    },
    {
      href: "/espace-marque",
      label: "Espace marque",
      note: brands.length
        ? `${brands.length} marque${brands.length > 1 ? "s" : ""} à gérer`
        : "Aucune marque rattachée",
      compte: brands.length,
      show: brands.length > 0 || isAdmin || profile.role === "createur",
    },
    {
      href: "/admin",
      label: "Administration",
      note: "Posts, marques, candidatures",
      compte: null,
      show: isAdmin,
    },
  ].filter((r) => r.show);

  const espaces: Espace[] = raccourcis.map(({ href, label, compte }) => ({
    href,
    label,
    compte,
  }));

  const initiale =
    (profile.display_name ?? profile.email ?? "?").trim().charAt(0).toUpperCase() || "?";

  /* ---------------- 8a — le volet Profil ---------------- */
  const voletProfil = (
    <div className="flex flex-col gap-5">
      <div className="rise rise-1 grid gap-3.5 sm:grid-cols-2">
        {raccourcis.map((r) => (
          /* Le rayon est posé en ligne : `.card-light` déclare le sien
             hors de toute couche CSS, où une classe Tailwind ne peut pas
             le reprendre. Le liseré `::before` en hérite. */
          <Link
            key={r.href}
            href={r.href}
            style={{ borderRadius: "18px" }}
            className="card-light px-5 py-[18px]"
          >
            <div className="relative z-3 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[15px] font-extrabold text-[var(--color-ink)]">
                  {r.label}
                </span>
                <span className="mt-1 block truncate text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[#6a5a92]">
                  {r.note}
                </span>
              </span>
              <span className="text-[19px] font-black text-[#3a2470]">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ---------- identité ----------
          Deux formulaires, deux boutons, deux messages. Ils partent vers
          deux endroits différents — la base pour le nom, Supabase Auth
          pour l'adresse — et n'échouent pas ensemble. Une barre
          d'enregistrement commune laisserait croire le contraire. */}
      <section className="glass rise rise-2 p-4 sm:p-[26px]">
        <h2 className="m-0 text-[17px] font-extrabold text-white">Ton identité</h2>
        <p className="m-0 mt-2 mb-5 text-[13.5px] leading-relaxed text-white/70">
          Ton nom affiché change tout de suite. Ton adresse email, elle, demande une
          confirmation dans les deux boîtes, l&apos;ancienne et la nouvelle, pour que
          personne ne puisse déplacer ton compte à ta place.
        </p>
        <DisplayNameForm current={profile.display_name ?? ""} />
        {profile.email && <EmailForm actuel={profile.email} />}
      </section>

      {/* ---------- mot de passe ---------- */}
      <section className="glass rise rise-3 p-4 sm:p-[26px]">
        <h2 className="m-0 text-[17px] font-extrabold text-white">Mot de passe</h2>
        {/* La colonne du premier palier est écrite, pas implicite : voir
            le commentaire de `CompteEcran`. */}
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-[26px]">
          <div>
            <p className="m-0 text-[13.5px] leading-relaxed text-white/70">
              On ne le change pas depuis cette page, et c&apos;est voulu : une session
              restée ouverte sur un appareil posé quelque part suffirait, sinon, à te
              faire prendre ton compte. On t&apos;envoie donc un lien, et il faut avoir
              accès à ta boîte mail pour aller au bout.
            </p>
            <p className="m-0 mt-2 text-[13px] leading-relaxed text-white/55">
              C&apos;est aussi par là qu&apos;il faut passer si tu t&apos;es inscrit avec
              Google : tu n&apos;as jamais eu de mot de passe, et ce lien t&apos;en donne
              un.
            </p>
          </div>
          {profile.email && <LienReinitialisation email={profile.email} />}
        </div>
      </section>

      <ComptePropositions />
    </div>
  );

  /* ---------------- 8b — le volet Apparence ---------------- */
  const voletApparence = (
    <div className="flex flex-col gap-4">
      <div className="rise rise-1">
        <h2 className="m-0 text-[17px] font-extrabold text-white">Apparence</h2>
        <p className="m-0 mt-2 text-[13.5px] leading-relaxed text-white/70">
          Le fond du site, à ton goût. Le réglage est rangé avec ton compte : il te suit
          d&apos;un appareil à l&apos;autre, et personne d&apos;autre ne le voit.
        </p>
      </div>
      <ThemePicker duCompte={apparence} connecte />
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-7 flex items-center gap-4 sm:mb-9 sm:gap-5">
        <span
          aria-hidden
          className="grid h-[62px] w-[62px] shrink-0 place-items-center rounded-[24px] text-[24px] font-black text-white sm:h-[76px] sm:w-[76px] sm:text-[28px]"
          style={{
            background:
              "linear-gradient(140deg, rgba(var(--accent-1), .5), rgba(var(--accent-2), .44))",
          }}
        >
          {initiale}
        </span>

        <div className="min-w-0">
          <p className="eyebrow m-0">Ton compte</p>
          <h1 className="m-0 mt-1.5 truncate text-[clamp(22px,4.9vw,34px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            {profile.display_name ?? "Mon compte"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <p className="m-0 min-w-0 truncate text-[14.5px] font-medium text-white/78">
              {profile.email}
            </p>
            {profile.role !== "membre" && <span className="badge">{ROLE_LABEL[profile.role]}</span>}
          </div>
        </div>
      </header>

      <CompteEcran espaces={espaces} profil={voletProfil} apparence={voletApparence} />
    </div>
  );
}
