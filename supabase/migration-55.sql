-- ============================================================
-- MIGRATION 55 — la pioche du swipe
-- ============================================================
--
-- À lancer dans le SQL Editor. Rejouable.
--
-- Le swipe tire au hasard quelques centaines de pièces en ligne, puis
-- le site les classe selon ce que la personne a gardé jusque-là (voir
-- `lib/swipe.ts`). La base ne fait que la pioche : elle ne sait rien de
-- la personne, et le profil ne quitte jamais son navigateur autrement
-- que pour cette demande.
--
-- Fonction et non table, comme la vitrine : lue en visiteur, la table
-- passe ses règles d'accès pièce par pièce (migration 54).
--
-- LE TIRAGE SE FAIT DANS L'INDEX. `products_vitrine_idx` porte déjà
-- l'identifiant de chaque pièce visible : on y tire les identifiants au
-- hasard, et seules les lignes retenues sont lues en entier.

create or replace function public.pioche_de_pieces(
  p_taxonomie text[],
  p_n integer default 240,
  p_exclus uuid[] default null
)
returns table(
  id uuid, slug text, name text, image_url text, images text[],
  prix integer, currency text, price_cents integer, price_eur_cents integer,
  available boolean, tags text[], couleurs text[], rayon text,
  brand_slug text, brand_name text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_n int := least(greatest(coalesce(p_n, 240), 1), 400);
  -- Les pièces déjà vues sont écartées APRÈS le tirage, sur un tirage un
  -- peu plus large : écrites dans la condition du tirage, elles privaient
  -- la base de son index, et la pioche passait d'un dixième de seconde à
  -- trois secondes.
  v_marge int := least(coalesce(array_length(p_exclus, 1), 0), 400);
begin
  return query
  with tires as materialized (
    select p.id
    from public.products p
    join public.brands b on b.id = p.brand_id and b.status = 'published'
    where p.status = 'published'
      and p.retired_at is null
      and p.a_un_visuel
    order by random()
    limit v_n + v_marge
  ),
  gardes as (
    select t.id from tires t
    where p_exclus is null or not (t.id = any (p_exclus))
    limit v_n
  )
  select
    p.id, p.slug, p.name, p.image_url,
    (select array_agg(x) from (select x from unnest(p.images) with ordinality u(x, n) order by u.n limit 3) q),
    coalesce(p.price_eur_cents, p.price_cents), p.currency, p.price_cents, p.price_eur_cents,
    p.available, p.tags, p.couleurs,
    (select u.c from unnest(p.categories) with ordinality u(c, n) where u.c = any (p_taxonomie) order by u.n limit 1),
    b.slug, b.name
  from gardes g
  join public.products p on p.id = g.id
  join public.brands b on b.id = p.brand_id;
end;
$$;

grant execute on function public.pioche_de_pieces(text[], integer, uuid[]) to anon, authenticated;

notify pgrst, 'reload schema';
