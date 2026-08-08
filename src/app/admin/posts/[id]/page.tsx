import { notFound } from "next/navigation";
import AdminForm from "@/components/admin/AdminForm";
import DeleteButton from "@/components/admin/DeleteButton";
import ImageUploader from "@/components/admin/ImageUploader";
import { Area, CheckGroup, Select, Text } from "@/components/admin/fields";
import { POST_KEYWORDS, withExisting } from "@/lib/taxonomy";
import { deletePost, savePost } from "../../actions";
import { adminGetBrands, adminGetPost } from "@/lib/admin-queries";
import BackLink from "@/components/BackLink";

type Props = { params: Promise<{ id: string }> };

export default async function EditPost({ params }: Props) {
  const { id } = await params;
  const isNew = id === "nouveau";

  const [post, brands] = await Promise.all([
    isNew ? Promise.resolve(null) : adminGetPost(id),
    adminGetBrands(),
  ]);
  if (!isNew && !post) notFound();

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <BackLink href="/admin/posts">Posts</BackLink>
          <h1 className="m-0 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold tracking-[-0.03em] text-white">
            {isNew ? "Nouveau post" : post!.title}
          </h1>
        </div>
        {!isNew && <DeleteButton action={deletePost} id={post!.id} label="Supprimer ce post" />}
      </header>

      <AdminForm action={savePost} submitLabel={isNew ? "Créer le post" : "Enregistrer"}>
        {!isNew && <input type="hidden" name="id" value={post!.id} />}

        <Text name="title" label="Titre" required defaultValue={post?.title} placeholder="La sélection Aryes" />

        <Text
          name="slug"
          label="Adresse de la page"
          hint="Laisse vide et je la fabrique à partir du titre."
          defaultValue={post?.slug}
          placeholder="la-selection-aryes"
        />

        <ImageUploader defaultValue={post?.image_url} folder="posts" />

        <Text
          name="image_alt"
          label="Description de l'image"
          hint="Lue à voix haute par les lecteurs d'écran, et affichée si l'image ne charge pas."
          defaultValue={post?.image_alt}
          placeholder="Chemise blanche portée ouverte sur un t-shirt noir"
        />

        <Area
          name="caption"
          label="Légende"
          hint="Le texte de ton post Instagram, ou une version retravaillée."
          defaultValue={post?.caption}
          rows={7}
        />

        <CheckGroup
          name="keywords"
          label="Mots-clés"
          hint="Ce sont eux qui filtrent la page Posts. Coche ce qui s'applique."
          options={withExisting(POST_KEYWORDS, post?.keywords)}
          selected={post?.keywords}
        />

        <Select name="brand_id" label="Marque associée" defaultValue={post?.brand_id ?? ""}>
          <option value="">Aucune</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>

        <div className="grid gap-6 sm:grid-cols-2">
          <Text name="instagram_url" label="Lien Instagram" type="url" defaultValue={post?.instagram_url ?? ""} placeholder="https://www.instagram.com/p/…" />
          <Text name="tiktok_url" label="Lien TikTok" type="url" defaultValue={post?.tiktok_url ?? ""} placeholder="https://www.tiktok.com/@…" />
        </div>

        <Select
          name="status"
          label="État"
          hint="Un brouillon reste invisible du public, même si tu connais son adresse."
          defaultValue={post?.status ?? "draft"}
        >
          <option value="draft">Brouillon</option>
          <option value="published">Publié</option>
        </Select>

        {post?.published_at && <input type="hidden" name="published_at" value={post.published_at} />}
      </AdminForm>
    </>
  );
}
