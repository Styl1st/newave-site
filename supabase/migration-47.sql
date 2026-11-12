-- ============================================================
-- MIGRATION 47 — l'histogramme des prix de la vitrine
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-46.sql. Rejouable.
-- Le site fonctionne avant comme après : tant que cette fonction
-- n'existe pas, le volet « Prix » de /pieces montre son rail sans les
-- barres (voir `lireHistogrammeDeVitrine` dans lib/queries.ts).
--
-- CE QU'ELLE REND. Le nombre de pièces par tranche de prix, pour les
-- filtres posés SAUF le prix lui-même : c'est la forme du catalogue
-- qu'on est en train de découper, il ne faut pas qu'elle se découpe
-- avec. Un tableau de `p_tranches + 1` entiers :
--   — la case k compte les prix de `p_bas + k × p_pas` (inclus) à
--     `p_bas + (k + 1) × p_pas` (exclu) ;
--   — la dernière case compte tout ce qui est au-delà du rail
--     (« 300 € et plus »).
-- Les prix en centimes d'euro, comme partout ailleurs. Une pièce sans
-- prix n'est dans aucune case.
--
-- LES FILTRES SONT CEUX DE `vitrine` (migration 45), recopiés tels
-- quels : même règle de rayon (la PREMIÈRE catégorie qui figure dans la
-- taxonomie reçue), mêmes tags, tailles, marque, stock, promo, même
-- recherche dans le texte de la pièce et le nom de la marque.

create or replace function public.histogramme_vitrine(
  p_taxonomie  text[],
  p_rayons     text[] default null,
  p_tags       text[] default null,
  p_tailles    text[] default null,
  p_marque     text default null,
  p_stock      boolean default false,
  p_promo      boolean default false,
  p_q          text default null,
  p_bas        int default 0,
  p_pas        int default 1250,
  p_tranches   int default 24
)
returns int[]
language sql
security definer
set search_path = public
stable
as $$
  with reglages as (
    select
      greatest(p_pas, 1) as pas,
      least(greatest(p_tranches, 1), 60) as tranches,
      case
        when p_q is null or p_q = '' then null
        else '%' || public.unaccent_simple(replace(p_q, chr(31), '')) || '%'
      end as m
  ),
  marques as materialized (
    select b.id, public.unaccent_simple(b.name) as nom_recherche
    from public.brands b
    where b.status = 'published'
      and (p_marque is null or b.slug = p_marque)
  ),
  prix as (
    select coalesce(p.price_eur_cents, p.price_cents) as prix
    from public.products p
    join marques mq on mq.id = p.brand_id
    cross join reglages r
    where p.status = 'published'
      and p.retired_at is null
      and p.a_un_visuel
      and coalesce(p.price_eur_cents, p.price_cents) is not null
      and (
        p_rayons is null
        or array_length(p_rayons, 1) is null
        or (
          select c
          from unnest(p.categories) with ordinality u(c, n)
          where c = any (p_taxonomie)
          order by u.n
          limit 1
        ) = any (p_rayons)
      )
      and (p_tags is null or array_length(p_tags, 1) is null or p.tags && p_tags)
      and (p_tailles is null or array_length(p_tailles, 1) is null or p.tailles && p_tailles)
      and (not coalesce(p_stock, false) or p.available)
      and (
        not coalesce(p_promo, false)
        or (p.compare_at_cents is not null
            and p.price_cents is not null
            and p.compare_at_cents > p.price_cents)
      )
      and (r.m is null or p.recherche ilike r.m or mq.nom_recherche ilike r.m)
  ),
  cases as (
    select
      least(greatest((x.prix - p_bas) / r.pas, 0), r.tranches) as k,
      count(*)::int as n
    from prix x
    cross join reglages r
    group by 1
  )
  select array_agg(coalesce(c.n, 0) order by g.k)
  from reglages r
  cross join lateral generate_series(0, r.tranches) g(k)
  left join cases c on c.k = g.k;
$$;

comment on function public.histogramme_vitrine(text[], text[], text[], text[], text, boolean, boolean, text, int, int, int) is
  'Le nombre de pieces de la vitrine par tranche de prix, pour les filtres poses sauf le prix. `p_tranches + 1` cases : la derniere compte tout ce qui depasse le rail. Memes regles de filtre que `vitrine` (migration 45).';

grant execute on function public.histogramme_vitrine(text[], text[], text[], text[], text, boolean, boolean, text, int, int, int) to anon, authenticated;

notify pgrst, 'reload schema';
