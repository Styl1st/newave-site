import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { Archivo } from "next/font/google";
import Background from "@/components/Background";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Tracker from "@/components/Tracker";
import PageTransition from "@/components/PageTransition";
import ProgressionLecture from "@/components/ProgressionLecture";
import Curseur from "@/components/Curseur";
import Reveal from "@/components/Reveal";
import Confirmations from "@/components/Confirmations";
import { SCRIPT_ANTI_FLASH } from "@/lib/theme";
import { lireApparenceDuCompte, styleDuCompte } from "@/lib/apparence";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://newavesphere.fr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NEWAVE SPHERE, média de marques & d'artistes indépendants",
    template: "%s · NEWAVE SPHERE",
  },
  description:
    "Média indépendant qui met en lumière celles et ceux qui créent en dehors des circuits classiques : marques naissantes, pièces uniques, démarches qui prennent le temps de bien faire.",
  openGraph: {
    siteName: "neWave.sphere",
    locale: "fr_FR",
    type: "website",
    url: SITE_URL,
    /*
     * L'image qui s'affiche quand on colle le lien quelque part.
     *
     * Sans elle, un lien posé sur Instagram, WhatsApp ou Discord
     * apparaît nu : une adresse en texte, rien autour. Les 1200 × 630
     * ne sont pas un choix esthétique, c'est le format que ces
     * applications attendent — un autre rapport se fait rogner.
     *
     * L'adresse est relative, `metadataBase` la complète. Attention
     * donc à ce que NEXT_PUBLIC_SITE_URL corresponde bien au domaine
     * réellement servi : une image annoncée sur un domaine qui ne la
     * sert pas donne un rectangle vide, ce qui est pire que rien.
     *
     * Elle se régénère avec scripts/image-partage.py.
     */
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "NEWAVE SPHERE, média de marques et d'artistes indépendants",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  icons: { icon: "/favicon-32.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#33217f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La page d'acces se passe de navigation : proposer des liens qui
  // renvoient tous vers elle-meme n'aide personne.
  const chemin = (await headers()).get("x-chemin") ?? "";
  const nu = chemin === "/acces";

  /*
   * L'apparence choisie suit le compte.
   *
   * On la peint donc ici, dans le HTML lui-même : sur un téléphone où
   * l'on vient de se connecter, le navigateur ne connaît encore rien
   * du réglage, et attendre le JavaScript ferait apparaître le violet
   * NEWAVE avant de basculer. Le stockage local ne sert plus qu'aux
   * visiteurs sans compte.
   */
  const apparence = await lireApparenceDuCompte();
  const style = styleDuCompte(apparence);

  return (
    /* Les couleurs sont écrites sur <html> avant que React n'arrive,
       par le script ci-dessous ou par le serveur : l'écart entre le
       HTML rendu et le DOM réel est ici voulu, on demande donc à React
       de ne pas s'en alarmer. La consigne ne vaut que pour cette
       balise, pas pour le reste de la page. */
    <html
      lang="fr"
      className={archivo.variable}
      style={style}
      data-anim-choisi={apparence ? "1" : undefined}
      /* Le tempo d'entrée de la barre et du pied. Écrit ici plutôt que
         posé par le navigateur : sinon le premier affichage les
         montrerait une fraction de seconde avant de les faire repartir
         de zéro. Voir globals.css, près de `pageIn`. */
      data-entree="a"
      data-fige={apparence && apparence.mouvement.amplitude <= 0.02 ? "1" : undefined}
      /* Écrit par le serveur pour qui a un compte, et par le script
         anti-flash pour les autres : sans ça, le site s'afficherait
         sombre une fraction de seconde avant de basculer. */
      data-clair={apparence?.clair ? "1" : undefined}
      suppressHydrationWarning
    >
      <head>
        {/* Sans compte, on relit ce que ce navigateur avait retenu. */}
        {!apparence && <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_FLASH }} />}
      </head>
      <body className="font-sans">
        <Background />
        <Tracker />
        <Reveal />
        {!nu && <Header />}
        {/* `min-w-0` : un élément de boîte flexible refuse par défaut de
            devenir plus étroit que son contenu. Un seul bloc un peu
            large — une grille, un mot sans espace — et c'est toute la
            page qui s'élargit, d'où la bande vide à droite.
            `overflow-x-clip` découpe ce qui dépasserait malgré tout,
            sans créer de zone de défilement : la barre du haut reste
            collante, ce qu'un `overflow: hidden` casserait. */}
        <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-x-clip">
          <PageTransition>{children}</PageTransition>
        </main>
        {!nu && <Footer />}
        {!nu && <ProgressionLecture />}
        {/* Le curseur du site. Il ne se pose que s'il trouve un
            pointeur fin : sur téléphone, ce composant ne fait rien. */}
        {!nu && <Curseur />}
        {/* Monté une seule fois pour tout le site : n'importe quelle
            page peut lui envoyer une confirmation sans que rien ne les
            relie. `Suspense` est exigé par Next dès qu'un composant lit
            les paramètres d'adresse — sans lui, la page entière
            basculerait en rendu dynamique. */}
        <Suspense fallback={null}>
          <Confirmations />
        </Suspense>
      </body>
    </html>
  );
}
