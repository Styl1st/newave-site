/**
 * Import de catalogue depuis une boutique Shopify.
 *
 * Toute boutique Shopify expose son catalogue sur /products.json, sans
 * cle ni autorisation : c'est le meme flux que celui qui alimente la
 * boutique en ligne. On ne contourne rien, on lit ce qui est publie.
 *
 * Si la boutique n'est pas sur Shopify, l'adresse ne repond pas et on
 * bascule simplement sur la saisie manuelle.
 */

export type ShopifyItem = {
  source_id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number | null;
  compare_at_cents: number | null;
  currency: string;
  sizes: { label: string; available: boolean }[];
  size_label: string;
  images: string[];
  shop_url: string;
  available: boolean;
};

type RawProduct = {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  variants?: {
    title?: string;
    option1?: string | null;
    price?: string;
    compare_at_price?: string | null;
    available?: boolean;
  }[];
  images?: { src: string }[];
  options?: { name?: string; position?: number }[];
};

/** Nettoie le HTML de description Shopify en texte lisible. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Normalise ce que l'utilisateur a colle en une base d'URL propre. */
export function normalizeShopUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export async function fetchShopifyCatalogue(
  shopUrl: string
): Promise<{ ok: true; items: ShopifyItem[] } | { ok: false; error: string }> {
  const base = normalizeShopUrl(shopUrl);
  if (!base) return { ok: false, error: "Cette adresse n'est pas valide." };

  let response: Response;
  try {
    response = await fetch(`${base}/products.json?limit=250`, {
      headers: { Accept: "application/json" },
      // Le catalogue bouge peu : une heure de cache evite de marteler la boutique.
      next: { revalidate: 3600 },
    });
  } catch {
    return { ok: false, error: "La boutique n'a pas répondu. Vérifie l'adresse." };
  }

  if (!response.ok) {
    return {
      ok: false,
      error:
        "Cette boutique ne semble pas être sur Shopify, ou son catalogue n'est pas public. Tu peux saisir les pièces à la main.",
    };
  }

  let payload: { products?: RawProduct[] };
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "La réponse de la boutique est illisible. Saisie manuelle possible." };
  }

  if (!Array.isArray(payload.products)) {
    return { ok: false, error: "Aucun catalogue trouvé à cette adresse." };
  }

  const items: ShopifyItem[] = payload.products.map((p) => {
    const variants = p.variants ?? [];

    const prices = variants
      .map((v) => Number(v.price))
      .filter((n) => Number.isFinite(n) && n > 0);
    const min = prices.length ? Math.min(...prices) : null;
    const priceCents = min !== null ? Math.round(min * 100) : null;

    // Shopify laisse souvent compare_at_price egal au prix, ou en
    // dessous. On ne garde que ce qui constitue une vraie remise,
    // sinon on afficherait un faux prix barre.
    const compares = variants
      .map((v) => Number(v.compare_at_price))
      .filter((n) => Number.isFinite(n) && n > 0);
    const maxCompare = compares.length ? Math.max(...compares) : null;
    const compareCents =
      maxCompare !== null && priceCents !== null && Math.round(maxCompare * 100) > priceCents
        ? Math.round(maxCompare * 100)
        : null;

    // Une seule variante sans nom d'option = pas de declinaison a montrer.
    const sizes = variants
      .map((v) => ({
        label: (v.option1 ?? v.title ?? "").trim(),
        available: Boolean(v.available),
      }))
      .filter((s) => s.label && s.label.toLowerCase() !== "default title");

    return {
      source_id: String(p.id),
      slug: p.handle,
      name: p.title,
      description: stripHtml(p.body_html ?? "").slice(0, 1200),
      price_cents: priceCents,
      compare_at_cents: compareCents,
      currency: "EUR",
      sizes,
      size_label: (p.options ?? [])[0]?.name?.trim() || "Taille",
      images: (p.images ?? []).map((i) => i.src).slice(0, 8),
      shop_url: `${base}/products/${p.handle}`,
      available: variants.some((v) => v.available),
    };
  });

  return { ok: true, items };
}
