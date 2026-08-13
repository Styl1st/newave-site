import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import AdminForm from "@/components/admin/AdminForm";
import DeleteButton from "@/components/admin/DeleteButton";
import MultiImageUploader from "@/components/admin/MultiImageUploader";
import { Area, CheckGroup, Select, Text } from "@/components/admin/fields";
import { deletePost, savePost } from "../../actions";
import { adminGetBrands, adminGetPost } from "@/lib/admin-queries";
import { POST_KEYWORDS, withExisting } from "@/lib/taxonomy";

type Props = { params: Promise<{ id: string }> };

/**
 * Un post s'écrit sur UNE page, et les visuels viennent en premier.
 *
 * C'était un parcours en quatre étapes. Sur le papier ça rassure ; à
 * l'usage, non. Publier un post n'est pas une démarche administrative,
 * c'est un geste qu'on répète : on veut voir d'un coup d'œil ce qui
 * reste à remplir, et pouvoir revenir sur le titre après avoir choisi
 * la photo. Quatre écrans interdisaient les deux — et sur téléphone,
 * la barre de progression occupait un tiers de la hauteur avant même
 * qu'on ait vu un champ.
 *
 * L'ORDRE A CHANGÉ, et c'est le vrai sujet. On commence par les
 * visuels, comme Instagram et YouTube, parce que c'est ce qu'on a sous
 * la main quand on décide de publier. Le titre et la légende viennent
 * une fois l'image posée : on les écrit mieux en la regardant.
 *
 * Les mêmes champs, la même action serveur, le même enregistrement.
 * Seule la mise en scène change.
 */

/** Un bloc de la page, avec son titre et son explication. */
function Section({
  titre,
  intro,
  children,
}: {
  titre: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-t border-white/12 pt-7 first:border-0 first:pt-0">
      <div>
        <h2 className="m-0 text-[16px] font-extrabold tracking-[-0.01em] text-white">{titre}</h2>
        {intro && (
          <p className="m-0 mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/62">{intro}</p>
        )}
      </div>
      {children}
    </section>
  );
}

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
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
        <div>
          <BackLink href="/admin/posts">Posts</BackLink>
          <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
            {isNew ? "Nouveau post" : post!.title}
          </h1>
        </div>
        {!isNew && <DeleteButton action={deletePost} id={post!.id} label="Supprimer ce post" />}
      </header>

      <AdminForm action={savePost} submitLabel={isNew ? "Créer le post" : "Enregistrer"}>
        {!isNew && <input type="hidden" name="id" value={post!.id} />}
        {/* L'adresse de la page ne se saisit plus : personne ne savait
            ce que c'était, et on la confondait avec un lien Instagram.
            Elle se fabrique à partir du titre pour un nouveau post, et
            reste telle quelle pour un post existant — la changer
            casserait le lien de quiconque l'a déjà partagé. */}
        {post?.slug && <input type="hidden" name="slug" value={post.slug} />}
        {post?.published_at && <input type="hidden" name="published_at" value={post.published_at} />}

        <Section
          titre="Les visuels"
          intro="Les photos du post. La première sert de vignette dans la mosaïque et d'aperçu quand on partage le lien. Pour une vidéo, colle son lien Instagram ou TikTok plus bas : elle restera chez eux."
        >
          <MultiImageUploader
            name="images"
            label="Photos"
            defaultValue={post?.images ?? []}
            folder="posts"
          />
          <Text
            name="image_alt"
            label="Description de l'image"
            hint="Lue à voix haute par les lecteurs d'écran, et affichée si l'image ne charge pas."
            defaultValue={post?.image_alt}
            placeholder="Ce que montre l'image, en une phrase"
          />
        </Section>

        <Section titre="Le post" intro="De quoi il parle, et à quelle marque il se rattache.">
          <Text
            name="title"
            label="Titre"
            required
            defaultValue={post?.title}
            placeholder="Le titre du post"
          />

          <Area
            name="caption"
            label="Légende"
            hint="Le texte de ton post Instagram, ou une version retravaillée pour la lecture."
            defaultValue={post?.caption}
            rows={8}
          />

          <Select name="brand_id" label="Marque associée" defaultValue={post?.brand_id ?? ""}>
            <option value="">Aucune</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Section>

        <Section titre="Le classement" intro="Ce sont ces mots-clés qui filtrent la page Posts.">
          <CheckGroup
            name="keywords"
            label="Mots-clés"
            options={withExisting(POST_KEYWORDS, post?.keywords)}
            selected={post?.keywords}
          />
        </Section>

        <Section
          titre="La vidéo et la publication"
          intro="On n'héberge pas les vidéos : elles restent sur Instagram ou TikTok, et un bouton y emmène. C'est plus rapide à l'affichage, et ça ne consomme rien."
        >
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
        </Section>
      </AdminForm>
    </>
  );
}
