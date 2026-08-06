import Link from "next/link";
import { ListRow } from "@/components/admin/ListRow";
import { adminGetPosts } from "@/lib/admin-queries";

export default async function AdminPosts() {
  const posts = await adminGetPosts();

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow m-0">Contenu</p>
          <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
            Posts
          </h1>
        </div>
        <Link href="/admin/posts/nouveau" className="card-light px-5 py-3">
          <span className="relative z-3 text-[13.5px] font-extrabold">Nouveau post</span>
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">
            Aucun post. Crée le premier, ou vérifie que Supabase est bien branché.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <ListRow
              key={p.id}
              href={`/admin/posts/${p.id}`}
              title={p.title}
              subtitle={[p.brand?.name, p.keywords.join(", ")].filter(Boolean).join(" · ") || null}
              status={p.status}
              thumb={p.image_url}
            />
          ))}
        </div>
      )}
    </>
  );
}
