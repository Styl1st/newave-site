-- ============================================================
-- MIGRATION 46 — les comptes de la vitrine en un seul passage
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-45.sql. Rejouable.
-- Le site fonctionne avant comme après : tant que cette fonction
-- n'existe pas, il retombe sur les cinq comptages d'avant (voir
-- `lireLesComptes` dans lib/queries.ts).
--
-- LE SYMPTÔME. Dans la console du serveur, de temps en temps :
--   [newave] comptes du catalogue : canceling statement due to statement timeout
-- L'API coupe à trois secondes pour un visiteur sans compte. Le
-- visiteur ne voit rien (le site ressert les comptes de la fois
-- d'avant), mais les comptes ne se mettent plus à jour.
--
-- POURQUOI. L'en-tête et les filtres de /pieces demandaient cinq
-- comptages EN MÊME TEMPS : les rayons, les tags, les tailles, les
-- bornes de prix, les pièces par marque. Chacun relisait toute la table
-- `products` (38 000 lignes, 84 Mo), et trois d'entre eux recalculaient
-- le rayon de chaque pièce. Mesuré le 11 novembre :
--   — seuls, au calme : de 50 à 220 ms chacun, 680 ms en tout ;
--   — tels que le site les lance, tous ensemble : 1,4 s en moyenne
--     CHACUN, et jusqu'à 2,99 s, à un cheveu de la coupure. Cinq
--     lectures complètes de la table qui se disputent la même machine.
--
-- CE QUI CHANGE. Une seule fonction, `comptes_du_catalogue`, lit la
-- table UNE fois, calcule le rayon de chaque pièce UNE fois, et en tire
-- les cinq comptes. 280 ms au calme, et une seule requête au lieu de
-- cinq qui se gênent.
--
-- LES CHIFFRES SONT LES MÊMES, vérifiés ligne à ligne contre les
-- fonctions d'avant le jour de l'écriture : mêmes rayons, mêmes 74 tags,
-- mêmes 54 tailles, mêmes 167 marques, mêmes bornes de prix. Les règles
-- sont recopiées telles quelles :
--   — une pièce compte si elle est publiée, pas retirée, et que sa
--     marque est publiée ;
--   — son rayon est le PREMIER de ses catégories qui figure dans la
--     taxonomie reçue (NULL sinon : « Autres », nommé côté site) ;
--   — une marque publiée sans pièce figure quand même, à zéro.
--
-- LES ANCIENNES FONCTIONS RESTENT. Elles ne coûtent rien tant qu'on ne
-- les appelle pas, et le site s'en sert encore si celle-ci manque.
--
-- La taxonomie arrive en argument, comme avant : un rayon ajouté côté
-- site est compté le jour même, sans migration.
-- ============================================================

create or replace function public.comptes_du_catalogue(p_taxonomie text[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with marques as materialized (
    select b.id, b.slug, b.name
    from public.brands b
    where b.status = 'published'
  ),
  -- Le seul passage sur `products`. Seules les colonnes utiles en
  -- sortent ; le rayon est calculé ici, une fois par pièce.
  base as materialized (
    select
      p.brand_id,
      p.tags,
      p.tailles,
      p.available,
      p.compare_at_cents,
      p.price_cents,
      coalesce(p.price_eur_cents, p.price_cents) as prix,
      (
        select u.c
        from unnest(p.categories) with ordinality as u(c, rang)
        where u.c = any (p_taxonomie)
        order by u.rang
        limit 1
      ) as rayon
    from public.products p
    join marques m on m.id = p.brand_id
    where p.status = 'published'
      and p.retired_at is null
  )
  select jsonb_build_object(
    -- = compter_les_rayons
    'rayons', (
      select coalesce(jsonb_agg(jsonb_build_object('rayon', x.rayon, 'total', x.total) order by x.total desc), '[]'::jsonb)
      from (select rayon, count(*)::int as total from base group by rayon) x
    ),
    -- = compter_les_tags
    'tags', (
      select coalesce(jsonb_agg(jsonb_build_object('rayon', x.rayon, 'tag', x.tag, 'total', x.total) order by x.total desc), '[]'::jsonb)
      from (
        select b.rayon, t.tag, count(*)::int as total
        from base b
        cross join lateral unnest(b.tags) as t(tag)
        group by b.rayon, t.tag
      ) x
    ),
    -- = compter_les_tailles
    'tailles', (
      select coalesce(jsonb_agg(jsonb_build_object('rayon', x.rayon, 'taille', x.taille, 'total', x.total) order by x.rayon, x.taille), '[]'::jsonb)
      from (
        select b.rayon, t.taille, count(*)::int as total
        from base b
        cross join lateral unnest(b.tailles) as t(taille)
        group by b.rayon, t.taille
      ) x
    ),
    -- = vitrine_bornes
    'bornes', (
      select jsonb_build_object(
        'prix_min', min(prix)::int,
        'prix_max', max(prix)::int,
        'a_des_ruptures', bool_or(not available),
        'a_des_promos', bool_or(compare_at_cents is not null
                                and price_cents is not null
                                and compare_at_cents > price_cents)
      )
      from base
    ),
    -- = compter_les_marques (zéro pièce compris)
    'marques', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', m.slug, 'nom', m.name, 'total', coalesce(n.total, 0))), '[]'::jsonb)
      from marques m
      left join (select brand_id, count(*)::int as total from base group by brand_id) n
        on n.brand_id = m.id
    )
  );
$$;

grant execute on function public.comptes_du_catalogue(text[]) to anon, authenticated;
