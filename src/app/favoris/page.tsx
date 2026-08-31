import type { Metadata } from "next";
import Link from "next/link";
import ListeFavoris from "@/components/ListeFavoris";
import TirerUneMarque from "@/components/TirerUneMarque";
import { CoeurPlein } from "@/components/LigneMarque";
import { getFavoriteBrands } from "@/lib/favorites";
import { getBrands } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes favoris" };
export const dynamic = "force-dynamic";

export default async function FavorisPage() {
  const profile = await requireUser();
  const brands = await getFavoriteBrands();

  /*
   * L'annuaire ne descend QUE pour la page vide.
   *
   * Le bouton « au hasard » a besoin de savoir dans quoi tirer, mais
   * c'est le seul état qui l'affiche : faire payer cette requête à une
   * liste pleine reviendrait à charger cent trente-six marques pour
   * n'en montrer aucune. On n'envoie que les adresses, pas les fiches.
   */
  const aTirer = brands.length === 0 ? (await getBrands()).map((b) => b.slug) : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-7">
        <p className="eyebrow m-0">{profile.display_name ?? profile.email}</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Mes favoris
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          Ta liste à toi. Elle ne se voit nulle part ailleurs.
        </p>
        {brands.length > 0 && (
          <p className="m-0 mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
            {brands.length} marque{brands.length > 1 ? "s" : ""}
          </p>
        )}
      </header>

      {brands.length === 0 ? (
        /*
         * UNE PAGE VIDE QUI PROPOSE TROIS SORTIES, ET C'EST LE POINT.
         *
         * Elle n'en offrait qu'une, noyée dans une phrase, et se lisait
         * donc comme une impasse : on arrivait sur ses favoris, il n'y
         * avait rien, et il n'y avait rien à faire non plus. On garde la
         * page — y renvoyer automatiquement vers l'annuaire priverait de
         * tout repère quelqu'un qui a cliqué exprès sur « Mes favoris » —
         * mais on en fait une invitation.
         *
         * Trois sorties parce qu'on ne sait pas laquelle correspond :
         * chercher soi-même, se laisser porter, ou aller voir ce que les
         * autres ont retenu. La troisième est en retrait : c'est un
         * détour, pas une réponse à « ma liste est vide ».
         */
        <div className="glass rise rise-1 flex flex-col items-center gap-5 p-8 text-center sm:p-12">
          <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-white/12">
            <CoeurPlein className="h-[30px] w-[30px] text-white/85" />
          </span>

          <p className="m-0 max-w-md text-[15px] leading-relaxed text-white/88">
            Tu n&apos;as encore rien mis de côté. Le cœur, sur une carte de marque, la
            range ici. C&apos;est ta liste à toi, elle ne se voit nulle part ailleurs.
          </p>

          {/* Empilés sur téléphone, côte à côte dès qu'il y a la place :
              deux boutons de quarante caractères sur une seule ligne de
              trois cent quatre-vingt-dix pixels deviennent illisibles.

              Le tirage passe par le bouton de l'accueil plutôt que par
              un second dessin du même geste : c'est le même mot, la
              même destination, et il évite déjà de retomber deux fois
              sur la marque qu'on vient de quitter. */}
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
            <Link href="/marques" className="card-light px-7 py-3.5 text-center">
              <span className="relative z-3 text-[14px] font-extrabold">
                Parcourir l&apos;annuaire
              </span>
            </Link>
            <div className="sm:w-[210px]">
              <TirerUneMarque slugs={aTirer} />
            </div>
          </div>

          <Link
            href="/populaires"
            className="text-[12.5px] font-semibold text-white/60 underline underline-offset-4 transition hover:text-white/90"
          >
            Ou voir ce que les autres mettent de côté
          </Link>
        </div>
      ) : (
        <div className="rise rise-1">
          <ListeFavoris brands={brands} />
        </div>
      )}
    </div>
  );
}
