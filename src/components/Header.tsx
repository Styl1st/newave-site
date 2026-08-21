import Link from "next/link";
import LienNav from "./LienNav";
import MobileMenu from "./MobileMenu";
import { getProfile } from "@/lib/auth";
import { getMesMarques } from "@/lib/brand-space";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/marques", label: "Marques" },
  // Juste après l'annuaire : c'est le même contenu pris par l'autre
  // bout, et les deux se répondent.
  { href: "/pieces", label: "Pièces" },
  { href: "/posts", label: "Posts" },
  { href: "/populaires", label: "Coups de cœur" },
  { href: "/a-propos", label: "À propos" },
  { href: "/candidature", label: "Proposer une marque" },
];

export default async function Header() {
  const profile = await getProfile();

  /*
   * Le raccourci vers sa propre marque.
   *
   * Un créateur passait par le menu, puis « Espace marque », puis la
   * liste, puis sa marque : quatre gestes pour arriver chez soi. Une
   * seule marque mène directement à sa page ; plusieurs mènent à la
   * liste, parce qu'il faut bien choisir.
   */
  const mesMarques = profile ? await getMesMarques() : [];
  const maMarque =
    mesMarques.length === 1
      ? `/marques/${mesMarques[0].slug}`
      : mesMarques.length > 1
        ? "/espace-marque"
        : null;

  // Le menu déroulant reprend la navigation, plus tout ce qui dépend
  // de la session : inutile de l'empiler dans la barre du haut.
  const compte = profile
    ? {
        titre: profile.display_name ?? profile.email ?? "Mon compte",
        liens: [
          ...(maMarque
            ? [{ href: maMarque, label: mesMarques.length === 1 ? "Ma marque" : "Mes marques" }]
            : []),
          { href: "/compte", label: "Mon compte" },
          { href: "/favoris", label: "Mes favoris" },
          ...(profile.role === "admin" ? [{ href: "/admin", label: "Administration" }] : []),
        ],
      }
    : {
        titre: "Ton compte",
        liens: [{ href: "/connexion", label: "Se connecter ou s'inscrire" }],
      };

  return (
    /*
     * Une pastille flottante, et non plus un bandeau collé au bord.
     *
     * Elle reste accessible pendant le défilement — sur une fiche de
     * marque, il fallait remonter plusieurs écrans pour retrouver le
     * menu. Mais elle est posée SUR la page plutôt que soudée à elle :
     * le décor continue de passer autour, et la barre se lit
     * immédiatement comme un objet distinct.
     *
     * Le verre, le liseré chromé et l'ombre portée sont ceux des cartes
     * du site. Cohérence, mais aussi lisibilité : sur un fond dont la
     * teinte dérive en permanence, une forme sans matière disparaît la
     * moitié du temps.
     */
    <header className="sticky top-2.5 z-40 w-full px-[var(--pad)] sm:top-4">
      <div className="barre mx-auto flex w-full max-w-6xl items-center justify-between gap-3 py-2 pl-3 pr-2 sm:pl-4 sm:pr-2.5">
        <Link href="/" aria-label="Accueil NEWAVE SPHERE" className="relative z-2 shrink-0 transition active:scale-95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-white.webp"
            alt="NEWAVE SPHERE"
            className="h-7 w-auto drop-shadow-[0_4px_14px_rgba(60,25,120,0.55)]"
          />
        </Link>

        {/* ---------- ordinateur ---------- */}
        <nav className="relative z-2 hidden items-center gap-0.5 md:flex">
          {/* Les derniers n'apparaissent qu'en grand : entre 768 et
              1024 px la barre serait trop chargée, et ce sont les liens
              les moins utiles. Le seuil a bougé avec l'arrivée des
              pièces, sinon « À propos » disparaissait de la barre sans
              que personne l'ait décidé. */}
          {NAV.slice(0, 6).map((item, i) => (
            <LienNav
              key={item.href}
              href={item.href}
              className={i >= 4 ? "hidden lg:inline-block" : ""}
            >
              {item.label}
            </LienNav>
          ))}

          {profile?.role === "admin" && <LienNav href="/admin">Admin</LienNav>}

          {/* Pour qui a déjà une marque, c'est le lien le plus utile de
              la barre. On le donne donc en clair, à côté de l'appel à
              candidature qui, lui, ne le concerne plus. */}
          {maMarque && (
            <Link
              href={maMarque}
              className="puce-barre ml-1.5 rounded-full border border-white/30 px-4 py-2 text-[12.5px] font-bold text-white transition hover:border-white/60 active:scale-[.97]"
            >
              {mesMarques.length === 1 ? "Ma marque" : "Mes marques"}
            </Link>
          )}

          <Link
            href="/candidature"
            className="cta-barre ml-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-black text-[var(--color-ink)] transition active:scale-[.97]"
          >
            Proposer une marque
          </Link>

          {profile ? (
            <Link
              href="/compte"
              aria-label="Mon compte"
              title={profile.display_name ?? profile.email ?? "Mon compte"}
              className="puce-barre ml-1.5 grid h-9 w-9 place-items-center rounded-full text-[13px] font-black text-white transition active:scale-95"
            >
              {(profile.display_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
            </Link>
          ) : (
            <LienNav href="/connexion" className="ml-1">
              Connexion
            </LienNav>
          )}
        </nav>

        {/* ---------- mobile et tablette ---------- */}
        <div className="relative z-2 flex items-center gap-2 md:hidden">
          {profile ? (
            <Link
              href="/compte"
              aria-label="Mon compte"
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-[13px] font-black text-[var(--color-ink)] active:scale-95"
            >
              {(profile.display_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
            </Link>
          ) : (
            /*
             * Se connecter était rangé dans le menu déroulant, à côté
             * des pages du site. Or ce n'est pas une page parmi
             * d'autres : pour qui n'a pas de compte, c'est LE geste
             * suivant, et le cacher derrière trois traits revient à ne
             * pas le proposer. La barre était de toute façon presque
             * vide à cet endroit.
             */
            <Link
              href="/connexion"
              className="rounded-full bg-white px-3.5 py-2 text-[12px] font-black text-[var(--color-ink)] shadow-[0_3px_12px_rgba(35,12,85,0.3)] active:scale-95"
            >
              Connexion
            </Link>
          )}
          <MobileMenu
            liens={NAV.slice(0, 6)}
            compte={compte}
            action={{ href: "/candidature", label: "Proposer une marque" }}
          />
        </div>
      </div>
    </header>
  );
}
