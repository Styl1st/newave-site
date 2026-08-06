import Link from "next/link";
import BrandCard from "@/components/BrandCard";
import { getArticles, getBrands } from "@/lib/queries";

export default async function HomePage() {
  const [brands, articles] = await Promise.all([getBrands(), getArticles(3)]);
  const featured = brands.filter((b) => b.featured).slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)]">
      {/* ---------- manifeste ---------- */}
      <section className="flex flex-col items-center py-14 text-center sm:py-20">
        <img
          src="/brand/logo-white.webp"
          alt="NEWAVE SPHERE"
          className="rise w-[min(70%,320px)] drop-shadow-[0_6px_20px_rgba(60,25,120,0.5)]"
        />
        <p className="tagline rise rise-1 mt-6 text-[clamp(11px,2.9vw,13px)] leading-[1.9]">
          Média de marques
          <br />&<br />
          d&apos;artistes indépendants
        </p>

        <p className="rise rise-2 mt-8 max-w-2xl text-[clamp(15px,4vw,18px)] leading-relaxed text-white/92">
          On met en lumière celles et ceux qui créent en dehors des circuits classiques :
          marques naissantes, pièces uniques, démarches qui prennent le temps de bien faire.
          Un point de ralliement pour ceux qui cherchent autre chose.
        </p>

        <div className="rise rise-3 mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/marques" className="card-light px-6 py-3.5">
            <span className="relative z-3 text-[14px] font-extrabold tracking-[-0.01em]">
              Explorer les marques
            </span>
          </Link>
          <Link
            href="/journal"
            className="rounded-[var(--radius)] border border-white/40 px-6 py-3.5 text-[14px] font-extrabold text-white transition hover:bg-white/12"
          >
            Lire le journal
          </Link>
        </div>
      </section>

      {/* ---------- marques a la une ---------- */}
      <section className="py-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow m-0">L&apos;annuaire</p>
            <h2 className="m-0 mt-2 text-[clamp(22px,5vw,30px)] font-extrabold leading-tight tracking-[-0.02em] text-white">
              Marques à la une
            </h2>
          </div>
          <Link href="/marques" className="shrink-0 text-[13px] font-bold text-white/80 underline underline-offset-4 transition hover:text-white">
            Tout voir
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((b) => (
            <BrandCard key={b.id} brand={b} />
          ))}
        </div>
      </section>

      {/* ---------- journal ---------- */}
      <section className="py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow m-0">Le journal</p>
            <h2 className="m-0 mt-2 text-[clamp(22px,5vw,30px)] font-extrabold leading-tight tracking-[-0.02em] text-white">
              Derniers articles
            </h2>
          </div>
          <Link href="/journal" className="shrink-0 text-[13px] font-bold text-white/80 underline underline-offset-4 transition hover:text-white">
            Tout voir
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {articles.map((a) => (
            <Link key={a.id} href={`/journal/${a.slug}`} className="glass block p-6 transition hover:border-white/50">
              <p className="eyebrow m-0">{a.reading_minutes} min de lecture</p>
              <h3 className="m-0 mt-3 text-[17px] font-extrabold leading-snug text-white">{a.title}</h3>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-white/78">{a.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- appel aux marques ---------- */}
      <section className="glass mb-6 p-8 text-center sm:p-12">
        <h2 className="m-0 text-[clamp(20px,4.6vw,26px)] font-extrabold leading-tight text-white">
          Tu crées une marque ?
        </h2>
        <p className="mx-auto m-0 mt-3 max-w-xl text-[15px] leading-relaxed text-white/84">
          On lit chaque dossier. Si ton travail a du sens, on lui donne une place —
          gratuitement, sans commission à l&apos;entrée.
        </p>
        <Link href="/candidature" className="card-light mt-7 inline-block px-7 py-3.5">
          <span className="relative z-3 text-[14px] font-extrabold">Proposer ma marque</span>
        </Link>
      </section>
    </div>
  );
}
