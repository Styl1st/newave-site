import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import AttachBrand from "@/components/admin/AttachBrand";
import DangerZone from "@/components/admin/DangerZone";
import { IconExternal, IconPencil, IconTag } from "@/components/Icons";
import { requireAdmin } from "@/lib/auth";
import {
  adminGetBrands,
  adminGetProfile,
  adminGetUserApplications,
  adminGetUserBrands,
} from "@/lib/admin-queries";
import { APPLICATION_STATUS_LABEL, RELATIONSHIP_LABEL, ROLE_LABEL } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function AdminUserDetail({ params }: Props) {
  const { id } = await params;
  const profile = await adminGetProfile(id);
  if (!profile) notFound();

  const [brands, applications, me, toutesLesMarques] = await Promise.all([
    adminGetUserBrands(id),
    adminGetUserApplications(id),
    requireAdmin(),
    adminGetBrands(),
  ]);

  const dejaGerees = new Set(brands.map((b) => b.brand.id));
  const enOption = (b: { id: string; name: string; slug: string; status: string; cover_url: string | null; logo_url: string | null }) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    status: b.status,
    visuel: b.cover_url ?? b.logo_url,
  });

  const disponibles = toutesLesMarques.filter((b) => !dejaGerees.has(b.id)).map(enOption);
  const rattachees = brands.map(({ brand }) => enOption(brand));

  const bloque =
    profile.id === me.id
      ? "C'est ton propre compte. Tu ne peux pas le supprimer depuis ici."
      : profile.role === "admin"
        ? "Ce compte est administrateur. Repasse-le en membre ou créateur avant de pouvoir le supprimer."
        : undefined;

  const estCreateur = profile.role === "createur" || profile.role === "admin";
  // Un créateur sans marque rattachée ne peut rien modifier : le rôle
  // est une étiquette, ce sont les rattachements qui ouvrent les portes.
  const incoherent = profile.role === "createur" && brands.length === 0;

  return (
    <>
      <BackLink href="/admin/utilisateurs">Comptes</BackLink>

      <header className="mb-7 mt-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[18px] font-black text-[var(--color-ink)]">
            {(profile.display_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-[clamp(22px,5vw,30px)] font-extrabold tracking-[-0.03em] text-white">
              {profile.display_name ?? profile.email}
            </h1>
            <p className="m-0 mt-0.5 truncate text-[13.5px] text-white/70">{profile.email}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/12 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white/85">
            {ROLE_LABEL[profile.role]}
          </span>
          <span
            className={
              brands.length > 0
                ? "rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-black uppercase tracking-[0.08em] text-[var(--color-ink)]"
                : "rounded-full bg-white/12 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white/70"
            }
          >
            {brands.length > 0
              ? `${brands.length} marque${brands.length > 1 ? "s" : ""} rattachée${brands.length > 1 ? "s" : ""}`
              : "Aucune marque rattachée"}
          </span>
        </div>
      </header>

      {/* ---------- marques gérées ---------- */}
      {incoherent && (
        <div className="glass mb-6 border-white/45 p-5">
          <p className="m-0 text-[14px] leading-relaxed text-white/88">
            Ce compte porte le rôle <strong className="font-extrabold text-white">Créateur</strong>{" "}
            mais aucune marque ne lui est rattachée : il ne peut donc rien modifier.
            Rattache-le depuis la fiche de sa marque, ou repasse-le en membre.
          </p>
        </div>
      )}

      <section className="mb-8">
        <h2 className="m-0 mb-4 flex items-center gap-2 text-[17px] font-extrabold text-white">
          <IconTag /> Marques gérées
        </h2>

        {brands.length === 0 ? (
          <div className="glass p-6">
            <p className="m-0 text-[14.5px] leading-relaxed text-white/80">
              Ce compte ne gère aucune marque. Utilise la recherche ci-dessous pour lui
              en confier une.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {brands.map(({ brand, pieces }) => (
              <div key={brand.id} className="card-light p-4">
                <div className="relative z-3 flex flex-wrap items-center gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[11px] bg-[#e6dcfb]">
                    {(brand.cover_url ?? brand.logo_url) && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={brand.cover_url ?? brand.logo_url ?? ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[14.5px] font-extrabold text-[var(--color-ink)]">
                      {brand.name}
                    </p>
                    <p className="m-0 mt-0.5 text-[12px] font-semibold text-[#6a5a92]">
                      {brand.status === "published" ? "En ligne" : "Brouillon"} ·{" "}
                      {pieces} pièce{pieces > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/marques/${brand.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(23,10,51,0.07)] px-3.5 py-2 text-[11.5px] font-bold text-[#3a2470] transition hover:bg-[rgba(23,10,51,0.15)]"
                    >
                      <IconPencil className="h-3.5 w-3.5" /> Fiche
                    </Link>
                    <Link
                      href={`/espace-marque/${brand.slug}/pieces`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(23,10,51,0.07)] px-3.5 py-2 text-[11.5px] font-bold text-[#3a2470] transition hover:bg-[rgba(23,10,51,0.15)]"
                    >
                      <IconTag className="h-3.5 w-3.5" /> Pièces
                    </Link>
                    {brand.status === "published" && (
                      <Link
                        href={`/marques/${brand.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(23,10,51,0.07)] px-3.5 py-2 text-[11.5px] font-bold text-[#3a2470] transition hover:bg-[rgba(23,10,51,0.15)]"
                      >
                        <IconExternal className="h-3.5 w-3.5" /> Voir
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AttachBrand userId={profile.id} disponibles={disponibles} rattachees={rattachees} />

      <DangerZone userId={profile.id} email={profile.email ?? "ce compte"} bloque={bloque} />

      {/* ---------- candidatures déposées ---------- */}
      {applications.length > 0 && (
        <section>
          <h2 className="m-0 mb-4 text-[17px] font-extrabold text-white">
            Candidatures déposées
          </h2>
          <div className="flex flex-col gap-3">
            {applications.map((a) => (
              <div key={a.id} className="glass flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="m-0 truncate text-[14px] font-extrabold text-white">{a.brand_name}</p>
                  <p className="m-0 mt-0.5 text-[12px] font-semibold text-white/60">
                    {RELATIONSHIP_LABEL[a.relationship]} ·{" "}
                    {new Date(a.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span className="badge shrink-0">{APPLICATION_STATUS_LABEL[a.status]}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
