import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import DeleteButton from "@/components/admin/DeleteButton";
import ImageUploader from "@/components/admin/ImageUploader";
import MultiImageUploader from "@/components/admin/MultiImageUploader";
import StepForm, { type Etape } from "@/components/admin/StepForm";
import VideoUploader from "@/components/admin/VideoUploader";
import { Area, CheckGroup, Select, Text } from "@/components/admin/fields";
import { deletePost, savePost } from "../../actions";
import { adminGetBrands, adminGetPost } from "@/lib/admin-queries";
import { POST_KEYWORDS, withExisting } from "@/lib/taxonomy";

type Props = { params: Promise<{ id: string }> };

export default async function EditPost({ params }: Props) {
  const { id } = await params;
  const isNew = id === "nouveau";

  const [post, brands] = await Promise.all([
    isNew ? Promise.resolve(null) : adminGetPost(id),
    adminGetBrands(),
  ]);
  if (!isNew && !post) notFound();

  const etapes: Etape[] = [
    {
      titre: "Le sujet",
      intro: "De quoi parle ce post, et à quelle marque il se rattache.",
      contenu: (
        <>
          <Text
            name="title"
            label="Titre"
            required
            defaultValue={post?.title}
            placeholder="Le titre du post"
          />

          <Select name="brand_id" label="Marque associée" defaultValue={post?.brand_id ?? ""}>
            <option value="">Aucune</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>

          <Text
            name="slug"
            label="Adresse de la page"
            hint="Laisse vide et je la fabrique à partir du titre."
            defaultValue={post?.slug}
            placeholder="adresse-de-la-page"
          />
        </>
      ),
    },
    {
      titre: "Les visuels",
      intro:
        "Photos, vidéo, ou les deux. La première image sert de vignette dans la mosaïque et d'aperçu quand on partage le lien.",
      contenu: (
        <>
          <MultiImageUploader
            name="images"
            label="Photos"
            defaultValue={post?.images ?? []}
            folder="posts"
          />
          <VideoUploader defaultValue={post?.video_url} folder="posts" />
          <ImageUploader
            name="video_poster"
            label="Image d'attente de la vidéo"
            defaultValue={post?.video_poster}
            folder="posts"
          />
          <Text
            name="image_alt"
            label="Description de l'image"
            hint="Lue à voix haute par les lecteurs d'écran, et affichée si l'image ne charge pas."
            defaultValue={post?.image_alt}
            placeholder="Ce que montre l'image, en une phrase"
          />
        </>
      ),
    },
    {
      titre: "Le texte",
      intro: "Ta légende, et les mots-clés qui permettront de retrouver ce post.",
      contenu: (
        <>
          <Area
            name="caption"
            label="Légende"
            hint="Le texte de ton post Instagram, ou une version retravaillée pour la lecture."
            defaultValue={post?.caption}
            rows={9}
          />
          <CheckGroup
            name="keywords"
            label="Mots-clés"
            hint="Ce sont eux qui filtrent la page Posts."
            options={withExisting(POST_KEYWORDS, post?.keywords)}
            selected={post?.keywords}
          />
        </>
      ),
    },
    {
      titre: "Publication",
      intro:
        "Les liens vers l'original, et le moment de décider si ce post part en ligne ou attend.",
      contenu: (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <Text
              name="instagram_url"
              label="Lien Instagram"
              type="url"
              defaultValue={post?.instagram_url ?? ""}
              placeholder="https://www.instagram.com/p/…"
            />
            <Text
              name="tiktok_url"
              label="Lien TikTok"
              type="url"
              defaultValue={post?.tiktok_url ?? ""}
              placeholder="https://www.tiktok.com/@…"
            />
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
        </>
      ),
    },
  ];

  return (
    <>
      <header className="mb-5 sm:mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <BackLink href="/admin/posts">Posts</BackLink>
          <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
            {isNew ? "Nouveau post" : post!.title}
          </h1>
        </div>
        {!isNew && <DeleteButton action={deletePost} id={post!.id} label="Supprimer ce post" />}
      </header>

      <StepForm
        action={savePost}
        etapes={etapes}
        submitLabel={isNew ? "Créer le post" : "Enregistrer"}
      >
        {!isNew && <input type="hidden" name="id" value={post!.id} />}
        {post?.published_at && <input type="hidden" name="published_at" value={post.published_at} />}
      </StepForm>
    </>
  );
}
