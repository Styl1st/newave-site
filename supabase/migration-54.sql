-- ============================================================
-- MIGRATION 54 — la recherche de pièces sans les règles ligne à ligne
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-53.sql. Rejouable.
--
-- POURQUOI. Lue par un visiteur, la table `products` passe par ses règles
-- d'accès (RLS) : `is_admin()` et `manages_brand()` sont appelées pour
-- CHAQUE pièce, et la base ne peut plus se servir de l'index trigramme
-- avant de les avoir évaluées. Compter les pièces qui contiennent « hood »
-- prenait huit secondes en visiteur, contre un dixième en administrateur.
--
-- LA RÉPONSE EST CELLE DE LA VITRINE : une fonction qui fait elle-même le
-- tri de ce qui est public (pièce publiée, pas retirée, marque publiée) et
-- se passe des règles. Elle ne rend que ce que n'importe qui voit déjà.

create or replace function public.rechercher_pieces(p_q text, p_limite integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_motif text;
  v_res jsonb;
begin
  if length(coalesce(p_q, '')) < 2 then
    return jsonb_build_object('total', 0, 'pieces', '[]'::jsonb);
  end if;
  v_motif := '%' || replace(replace(replace(p_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  -- Le motif écrit en dur dans la requête (format %L, donc échappé) :
  -- planifiée avec sa vraie valeur, elle passe par l'index trigramme.
  -- Avec un paramètre, la base choisissait de lire toute la table.
  execute format($q$
    with retenues as materialized (
      select p.id, p.slug, p.name, p.image_url, p.images, b.slug as marque
      from public.products p
      join public.brands b on b.id = p.brand_id and b.status = 'published'
      where p.status = 'published'
        and p.retired_at is null
        and p.name ilike %L
    )
    select jsonb_build_object(
      -- Le compte exact seulement à partir de trois lettres (migration 53).
      'total', case when %s then (select count(*) from retenues) else null end,
      'pieces', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id, 'slug', r.slug, 'name', r.name,
          'image_url', r.image_url, 'image', r.images[1], 'marque', r.marque
        ))
        from (select * from retenues order by id limit %s) r
      ), '[]'::jsonb)
    )$q$, v_motif, (length(p_q) >= 3)::text, least(greatest(coalesce(p_limite, 8), 1), 24))
  into v_res;

  return v_res;
end;
$$;

grant execute on function public.rechercher_pieces(text, integer) to anon, authenticated;

notify pgrst, 'reload schema';
