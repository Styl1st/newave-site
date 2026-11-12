-- ============================================================
-- MIGRATION 49 — l'histogramme des prix, réécrit pour répondre vite
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-47.sql. Rejouable.
-- Même nom, mêmes arguments, mêmes chiffres : rien à changer côté site.
--
-- LE SYMPTÔME. Le volet « Prix » de /pieces n'affichait pas ses barres,
-- et la console du serveur disait :
--   [newave] histogramme de la vitrine : canceling statement due to statement timeout
--
-- POURQUOI. La version de la migration 47 était une fonction SQL qui
-- portait tous ses filtres à la fois, chacun sous la forme « ce
-- paramètre est vide, OU la pièce le respecte ». Postgres prépare un
-- plan unique pour toutes les combinaisons possibles, sans savoir
-- lesquelles sont vides : il a choisi un plan qui croise chaque pièce
-- avec chaque marque. Mesuré le 12 novembre, sans aucun filtre : 6,5 s.
-- La même requête écrite à la main, avec seulement les filtres posés :
-- 80 ms.
--
-- CE QUI CHANGE. La fonction ÉCRIT sa requête avec les seuls filtres
-- posés, puis l'exécute. Postgres la planifie à chaque appel, en
-- connaissant les valeurs : il retrouve le bon plan.
--
-- Rien n'est collé dans le texte de la requête : toutes les valeurs
-- passent en paramètres (`using`), la recherche tapée comprise.

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
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_pas      int := greatest(coalesce(p_pas, 1), 1);
  v_tranches int := least(greatest(coalesce(p_tranches, 24), 1), 60);
  v_motif    text := case
    when p_q is null or p_q = '' then null
    else '%' || public.unaccent_simple(replace(p_q, chr(31), '')) || '%'
  end;
  v_sql      text;
  v_res      int[];
begin
  v_sql := '
    with prix as (
      select coalesce(p.price_eur_cents, p.price_cents) as prix
      from public.products p
      join public.brands b on b.id = p.brand_id and b.status = ''published''
      where p.status = ''published''
        and p.retired_at is null
        and p.a_un_visuel
        and coalesce(p.price_eur_cents, p.price_cents) is not null';

  -- Le rayon : la PREMIÈRE catégorie de la pièce qui figure dans la
  -- taxonomie reçue, comme dans `vitrine` (migration 45).
  if p_rayons is not null and array_length(p_rayons, 1) is not null then
    v_sql := v_sql || '
        and (
          select u.c
          from unnest(p.categories) with ordinality u(c, n)
          where u.c = any ($1)
          order by u.n
          limit 1
        ) = any ($2)';
  end if;

  if p_tags is not null and array_length(p_tags, 1) is not null then
    v_sql := v_sql || ' and p.tags && $3';
  end if;

  if p_tailles is not null and array_length(p_tailles, 1) is not null then
    v_sql := v_sql || ' and p.tailles && $4';
  end if;

  if p_marque is not null then
    v_sql := v_sql || ' and b.slug = $5';
  end if;

  if coalesce(p_stock, false) then
    v_sql := v_sql || ' and p.available';
  end if;

  if coalesce(p_promo, false) then
    v_sql := v_sql || '
        and p.compare_at_cents is not null
        and p.price_cents is not null
        and p.compare_at_cents > p.price_cents';
  end if;

  if v_motif is not null then
    v_sql := v_sql || '
        and (p.recherche ilike $6 or public.unaccent_simple(b.name) ilike $6)';
  end if;

  -- Une case par tranche, plus la dernière pour tout ce qui dépasse le
  -- rail ; les tranches vides comptent zéro.
  v_sql := v_sql || '
    ),
    cases as (
      select least(greatest((prix - $7) / $8, 0), $9) as k, count(*)::int as n
      from prix
      group by 1
    )
    select array_agg(coalesce(c.n, 0) order by g.k)
    from generate_series(0, $9) as g(k)
    left join cases c on c.k = g.k';

  execute v_sql
    into v_res
    using p_taxonomie, p_rayons, p_tags, p_tailles, p_marque, v_motif, coalesce(p_bas, 0), v_pas, v_tranches;

  return v_res;
end;
$$;

comment on function public.histogramme_vitrine(text[], text[], text[], text[], text, boolean, boolean, text, int, int, int) is
  'Le nombre de pieces de la vitrine par tranche de prix, pour les filtres poses sauf le prix. `p_tranches + 1` cases : la derniere compte tout ce qui depasse le rail. Memes regles de filtre que `vitrine` (migration 45). Requete ecrite avec les seuls filtres poses (migration 49).';

grant execute on function public.histogramme_vitrine(text[], text[], text[], text[], text, boolean, boolean, text, int, int, int) to anon, authenticated;

notify pgrst, 'reload schema';
