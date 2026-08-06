import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Background from "@/components/Background";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={archivo.variable}>
      <body className="font-sans">
        <Background />
        <Header />
        <main className="relative z-10 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
