import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Archivo } from "next/font/google";
import Background from "@/components/Background";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Tracker from "@/components/Tracker";
import PageTransition from "@/components/PageTransition";
import Reveal from "@/components/Reveal";
import { SCRIPT_ANTI_FLASH } from "@/lib/theme";
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
    default: "NEWAVE SPHERE — Média de marques & d'artistes indépendants",
    template: "%s — NEWAVE SPHERE",
  },
  description:
    "Média indépendant qui met en lumière celles et ceux qui créent en dehors des circuits classiques : marques naissantes, pièces uniques, démarches qui prennent le temps de bien faire.",
  openGraph: {
    siteName: "neWave.sphere",
    locale: "fr_FR",
    type: "website",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
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

  return (
    /* Le script ci-dessous pose des couleurs sur <html> avant que React
       n'arrive : l'écart entre le HTML du serveur et le DOM réel est ici
       voulu, on demande donc à React de ne pas s'en alarmer. La consigne
       ne vaut que pour cette balise, pas pour le reste de la page. */
    <html lang="fr" className={archivo.variable} suppressHydrationWarning>
      <head>
        {/* Applique les couleurs enregistrées avant le premier rendu :
            sans ça, le fond NEWAVE apparaîtrait une fraction de seconde
            avant de basculer sur celui du visiteur. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_FLASH }} />
      </head>
      <body className="font-sans">
        <Background />
        <Tracker />
        <Reveal />
        {!nu && <Header />}
        <main className="relative z-10 flex flex-1 flex-col">
          <PageTransition>{children}</PageTransition>
        </main>
        {!nu && <Footer />}
      </body>
    </html>
  );
}
