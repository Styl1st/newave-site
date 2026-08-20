import type { Metadata } from "next";
import PostMosaic from "@/components/PostMosaic";
import RaccourciAdmin from "@/components/RaccourciAdmin";
import { getPosts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Posts",
  description:
    "Les publications NEWAVE SPHERE : marques repérées, pièces, coulisses et sélections.",
};

/*
 * La page dépend maintenant de la session : le raccourci d'ajout ne
 * s'affiche que pour l'administration. Next le déduirait tout seul de
 * la lecture des cookies, mais l'écrire noir sur blanc évite qu'on se
 * demande un jour pourquoi cette page n'est plus figée.
 */
export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-7 sm:py-11">
      <header className="rise mb-9">
        <p className="eyebrow m-0">Les publications</p>
        <h1 className="m-0 mt-2 text-[clamp(24px,5.6vw,38px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Posts
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-[15px] leading-relaxed text-white/84">
          Tout ce qu&apos;on publie sur Instagram et TikTok, rangé, taggé, et qui ne
          disparaît pas dans le fil.
        </p>

        {/* Invisible pour les visiteurs. Voir `RaccourciAdmin`. */}
        <div className="mt-5">
          <RaccourciAdmin href="/admin/posts/nouveau">Ajouter un post</RaccourciAdmin>
        </div>
      </header>

      <div className="rise rise-1">
        <PostMosaic posts={posts} />
      </div>
    </div>
  );
}
