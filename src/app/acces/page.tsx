import type { Metadata } from "next";
import { headers } from "next/headers";

/**
 * L'aperçu du lien, quand on le colle quelque part.
 *
 * DEUX RAISONS FAISAIENT QU'IL N'Y EN AVAIT AUCUN, et les deux venaient
 * de nous.
 *
 * La première : cette page demandait aux robots de ne pas la regarder,
 * et le verrou du site ajoutait la même consigne dans les en-têtes de
 * chaque réponse. Or ce sont exactement ces consignes que WhatsApp,
 * Discord, LinkedIn ou Slack lisent avant de fabriquer une carte. On
 * leur disait « passe ton chemin », ils passaient leur chemin, et le
 * lien s'affichait nu.
 *
 * C'était une précaution mal placée. Ce qu'on veut protéger, c'est le
 * CONTENU du site pendant la bêta ; cette page-ci, elle, ne dit rien
 * d'autre que « le site existe et il n'est pas encore ouvert ». Elle
 * peut donc être vue, partagée et référencée sans le moindre risque.
 * Tout le reste demeure fermé et non indexable.
 *
 * La seconde : l'image annoncée était toujours celle du domaine
 * définitif, même quand on partageait l'adresse de test. Un robot
 * allait donc chercher l'affiche sur un domaine qui ne la servait pas
 * encore, et repartait les mains vides. On lit maintenant le domaine
 * réellement demandé, donc l'affiche est prise là où l'on se trouve.
 */
export async function generateMetadata(): Promise<Metadata> {
  const entetes = await headers();
  const hote = entetes.get("host") ?? "newavesphere.fr";
  const protocole = entetes.get("x-forwarded-proto") ?? "https";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${protocole}://${hote}`;

  const titre = "NEWAVE SPHERE, média de marques & d'artistes indépendants";
  const description =
    "Marques naissantes, pièces uniques, démarches qui prennent le temps de bien faire. " +
    "Le site est en test privé : il faut un code pour entrer.";

  return {
    title: "Accès",
    description,
    metadataBase: new URL(base),
    alternates: { canonical: base },
    openGraph: {
      siteName: "neWave.sphere",
      locale: "fr_FR",
      type: "website",
      url: base,
      title: titre,
      description,
      images: [
        {
          url: "/og.jpg",
          width: 1200,
          height: 630,
          alt: "NEWAVE SPHERE, média de marques et d'artistes indépendants",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description,
      images: ["/og.jpg"],
    },
    // Elle peut être vue : c'est une porte, pas un contenu.
    robots: { index: true, follow: true },
  };
}

type Props = { searchParams: Promise<{ suite?: string; erreur?: string }> };

/**
 * La porte d'entrée de la bêta.
 *
 * C'est le PREMIER écran que voit quelqu'un qui arrive d'Instagram, et
 * pendant longtemps c'est le seul qu'il verra s'il n'a pas le mot de
 * passe. Il disait « Bientôt » et « site en construction » : le ton
 * d'une page d'attente, alors qu'on invite des gens à entrer.
 *
 * Il dit maintenant trois choses, dans cet ordre : ce qu'est le site,
 * ce qu'on attend de la personne, et où signaler ce qui casse. Quelqu'un
 * qui sait qu'on lui demande de chercher les défauts se comporte
 * autrement que quelqu'un qui croit visiter un site fini — il pardonne
 * les aspérités, et il les remonte.
 */
export default async function AccesPage({ searchParams }: Props) {
  const { suite, erreur } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-[var(--pad)] py-16">
      <div className="rise text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-white.webp"
          alt="NEWAVE SPHERE"
          className="mx-auto w-[min(58%,210px)] drop-shadow-[0_6px_20px_rgba(60,25,120,0.5)]"
        />
        <p className="tagline mt-6 text-[clamp(10px,2.6vw,12px)] leading-[1.9]">
          Bêta privée
        </p>
      </div>

      <form
        action="/api/acces"
        method="post"
        className="glass rise rise-1 mt-7 flex flex-col gap-5 p-4 sm:p-7"
      >
        <input type="hidden" name="suite" value={suite ?? "/"} />

        <div>
          <h1 className="m-0 text-[clamp(17px,4.2vw,21px)] font-extrabold leading-tight tracking-[-0.02em] text-white">
            Tu es en avance, et c&apos;est voulu
          </h1>
          <p className="m-0 mt-3 text-[13.5px] leading-relaxed text-white/78">
            NEWAVE SPHERE est un média et un annuaire de marques indépendantes : on
            les lit, on les vérifie, on les met en avant. Le site n&apos;est pas encore
            ouvert au public. Tu fais partie des premiers à le voir.
          </p>
        </div>

        <div>
          <label htmlFor="password" className="eyebrow mb-2 block">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55"
            placeholder="••••••••"
          />
          <p className="m-0 mt-2 text-[12.5px] text-white/55">
            Il est dans le message qui t&apos;a envoyé ici.
          </p>
        </div>

        {erreur && (
          <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] text-white">
            Mot de passe incorrect.
          </p>
        )}

        <button type="submit" className="card-light px-7 py-3.5">
          <span className="relative z-3 text-[14px] font-extrabold">Entrer</span>
        </button>

        <div className="border-t border-white/12 pt-4">
          <p className="m-0 text-[12.5px] leading-relaxed text-white/62">
            Une fois entré, tout est ouvert : parcours les marques, crée un compte, mets
            en favori, laisse un avis, propose une marque qui mérite d&apos;être ici.
          </p>
          <p className="m-0 mt-2.5 text-[12.5px] leading-relaxed text-white/62">
            <strong className="font-bold text-white/85">Quelque chose casse ?</strong>{" "}
            C&apos;est le but. Écris à{" "}
            <a
              href="mailto:contact@newavesphere.fr"
              className="font-bold text-white underline underline-offset-2"
            >
              contact@newavesphere.fr
            </a>{" "}
            ou en message privé, même pour un détail.
          </p>
        </div>

        <p className="m-0 text-[12px] leading-relaxed text-white/45">
          Si tu cherchais simplement nos liens, c&apos;est sur{" "}
          <a
            href="https://newavesphere.fr"
            className="font-bold text-white/70 underline underline-offset-2"
          >
            newavesphere.fr
          </a>
          .
        </p>
      </form>
    </div>
  );
}
