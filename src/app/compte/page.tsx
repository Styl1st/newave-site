import type { Metadata } from "next";
import { LienReinitialisation, MonCompteForm } from "@/components/AccountForms";
import CompteEcran, { type Espace } from "@/components/CompteEcran";
import VisuelMonCompte from "@/components/compte/VisuelMonCompte";
import SuppressionCompte from "@/components/SuppressionCompte";
import ThemePicker from "@/components/ThemePicker";
import { requireUser } from "@/lib/auth";
import { lireApparenceDuCompte } from "@/lib/apparence";
import { ROLE_LABEL } from "@/lib/types";
import { getManagedBrands } from "@/lib/brand-space";
import { getFavoriteBrands } from "@/lib/favorites";
import { PREFERENCES_DEFAUT, decrireApparence } from "@/lib/theme";

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

  /*
   * UNE SEULE LISTE, ET UN SEUL ENDROIT QUI LA REND.
   *
   * Elle se rendait deux fois : en cartes dans le volet Profil, puis en
   * lignes dans le rail. Les mêmes trois liens, l'un sous l'autre, à
   * deux endroits de la même page — dont un qu'il fallait faire défiler
   * pour voir. C'est ce que ce chantier corrige : `CompteEcran` en tire
   * des tuiles au doigt, des lignes de rail au grand écran, et les deux
   * formes ne coexistent jamais.
   */
  const espaces: Espace[] = (
    [
      {
        href: "/favoris",
        label: "Mes favoris",
        note: favorites.length
          ? `${favorites.length} marque${favorites.length > 1 ? "s" : ""}`
          : "Aucune pour l'instant",
        compte: favorites.length,
        icone: "favoris",
        show: true,
      },
      {
        href: "/espace-marque",
        label: "Espace marque",
        note: brands.length
          ? `${brands.length} marque${brands.length > 1 ? "s" : ""} à gérer`
          : "Aucune marque rattachée",
        compte: brands.length,
        icone: "marque",
        show: brands.length > 0 || isAdmin || profile.role === "createur",
      },
      {
        href: "/admin",
        label: "Administration",
        note: "Posts, marques, candidatures",
        compte: null,
        icone: "admin",
        show: isAdmin,
      },
    ] satisfies (Espace & { show: boolean })[]
  )
    .filter((r) => r.show)
    .map((r) => ({
      href: r.href,
      label: r.label,
      note: r.note,
      compte: r.compte,
      icone: r.icone,
    }));

  const initiale =
    (profile.display_name ?? profile.email ?? "?").trim().charAt(0).toUpperCase() || "?";
  const role = profile.role !== "membre" ? ROLE_LABEL[profile.role] : null;

  /* ---------------- « Mon compte » : nom, adresse, mot de passe ---------------- */
  const pageMonCompte = (
    <div className="flex flex-col gap-5">
      <VisuelMonCompte initiale={initiale} role={role} />

      {/* Le nom part en base, l'adresse part dans Supabase Auth, et les
          deux n'échouent pas ensemble : c'est tout le soin qu'il y a
          dans `MonCompteForm`. */}
      <MonCompteForm
        nomActuel={profile.display_name ?? ""}
        emailActuel={profile.email ?? null}
      />

      {/* ---------- mot de passe ----------
          Une ligne, et non un formulaire : il n'y a rien à saisir ici,
          seulement un lien à demander. */}
      <section className="glass rise rise-3 p-4 sm:p-[26px]">
        <h2 className="m-0 text-[17px] font-extrabold text-white">Mot de passe</h2>
        {/* La colonne du premier palier est écrite, pas implicite : voir
            le commentaire de `CompteEcran`. */}
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-[26px]">
          <div>
            <p className="m-0 text-[13.5px] leading-relaxed text-white/70">
              On t&apos;envoie un lien : il faut accéder à ta boîte mail pour aller au
              bout.
            </p>
            <p className="m-0 mt-2 text-[13px] leading-relaxed text-white/55">
              Inscrit avec Google ? C&apos;est aussi par là qu&apos;on t&apos;en donne un.
            </p>
          </div>
          {profile.email && <LienReinitialisation email={profile.email} />}
        </div>
      </section>

      {/* Elle a besoin de l'adresse : c'est ce qu'on fait recopier pour
          confirmer. Voir `SuppressionCompte`. */}
      {profile.email && <SuppressionCompte email={profile.email} />}
    </div>
  );

  /* ---------------- « Apparence » ---------------- */
  const pageApparence = (
    <div className="flex flex-col gap-4">
      {/* Au doigt, l'aperçu de `ThemePicker` tient ce rôle : il montre
          l'ambiance au lieu de la nommer, et il ne défile pas. Répéter
          un titre au-dessus lui prendrait sa place. */}
      <div className="rise rise-1 hidden lg:block">
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
      {/* L'en-tête ne sert plus qu'au grand écran : au doigt, le bandeau
          compact du hub dit la même chose en quarante-six pixels, et les
          quatre-vingts qu'il rendait sont ce qui manquait pour que le
          hub tienne sans défiler. */}
      <header className="rise mb-7 hidden items-center gap-4 sm:mb-9 sm:gap-5 lg:flex">
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
            {role && <span className="badge">{role}</span>}
          </div>
        </div>
      </header>

      <CompteEcran
        espaces={espaces}
        identite={{
          nom: profile.display_name ?? "Mon compte",
          email: profile.email ?? null,
          initiale,
          role,
        }}
        /* Le compte fait foi, comme partout ailleurs sur l'apparence.
           Le stockage local ne reprend la main que pour un visiteur qui
           n'a jamais rien enregistré — et le hub relit cette copie-là au
           retour de la page Apparence, quand elle est à jour. */
        apparenceInitiale={decrireApparence(apparence ?? PREFERENCES_DEFAUT)}
        profil={pageMonCompte}
        apparence={pageApparence}
      />
    </div>
  );
}
