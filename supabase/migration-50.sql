-- ============================================================
-- MIGRATION 50 — les comptes du catalogue, calculés d'avance
-- ============================================================
--
-- À lancer dans le SQL Editor. Rejouable. Ne change aucun chiffre.
--
-- LE SYMPTÔME. Sur le site en ligne, l'en-tête de /pieces annonçait
-- « 23 marques » au lieu de 168, et la console du serveur redisait :
--   [newave] comptes du catalogue : canceling statement due to statement timeout
-- Quand les comptes ne répondent pas à temps, la page retombe sur ce
-- qu'elle a sous la main : les marques de ses vingt-quatre premières
-- pièces.
--
-- POURQUOI LA MIGRATION 48 N'A PAS SUFFI. Elle a supprimé les écritures
-- sur le disque, mais le calcul reste lourd (34 000 pièces passées une à
-- une pour trouver leur rayon) et sa durée dépend de la charge de la
-- base : mesurée à 0,6 s, à 1 s, puis à 5,4 s une heure plus tard, pour
-- la même requête. Au-delà de 3 s, Supabase coupe un visiteur.
--
-- CE QUI CHANGE. Le calcul ne se fait plus pendant la visite :
--   — `calculer_comptes_du_catalogue` fait le calcul, tel qu'il était
--     (migration 46) ; personne d'autre que la base ne l'appelle ;
--   — son résultat est rangé dans `cache_comptes`, une ligne par
--     taxonomie ;
--   — `comptes_du_catalogue`, celle que le site appelle (même nom, même
--     argument), lit cette ligne : quelques millisecondes ;
--   — toutes les dix minutes, pg_cron refait le calcul, sans limite de
--     temps puisqu'il ne tourne pas au nom d'un visiteur.
-- Les chiffres ont donc au plus dix minutes de retard. Le site gardait
-- déjà les siens cinq minutes en cache.
--
-- SI LA LIGNE MANQUE (une taxonomie que le site vient de changer), la
-- fonction calcule sur-le-champ comme avant et range le résultat : la
-- visite suivante est servie de la ligne.

-- 1. pg_cron. Disponible sur Supabase, simplement pas encore activé.
create extension if not exists pg_cron with schema pg_catalog;

-- 2. Le calcul, tel que la migration 46 le faisait.
create or replace function public.calculer_comptes_du_catalogue(p_taxonomie text[])
returns jsonb
language sql
stable
security definer
set search_path = public
set work_mem = '32MB'
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

revoke execute on function public.calculer_comptes_du_catalogue(text[]) from public, anon, authenticated;

-- 3. Le rangement. Personne n'y lit ni n'y écrit directement : RLS
--    active et aucune règle, seules les fonctions ci-dessous y touchent.
create table if not exists public.cache_comptes (
  taxonomie  text[] primary key,
  resultat   jsonb not null,
  calcule_le timestamptz not null default now()
);
alter table public.cache_comptes enable row level security;

-- 4. Ce que le site appelle. Même nom, même argument, même résultat.
--    `volatile` (plus `stable`) parce qu'elle peut écrire sa ligne.
create or replace function public.comptes_du_catalogue(p_taxonomie text[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_resultat jsonb;
begin
  select c.resultat into v_resultat
  from public.cache_comptes c
  where c.taxonomie = p_taxonomie;

  if v_resultat is not null then
    return v_resultat;
  end if;

  v_resultat := public.calculer_comptes_du_catalogue(p_taxonomie);

  -- Vingt taxonomies au plus : la fonction est ouverte à tous, il ne
  -- faut pas qu'on puisse remplir la table d'arguments inventés.
  if (select count(*) from public.cache_comptes) < 20 then
    insert into public.cache_comptes (taxonomie, resultat, calcule_le)
    values (p_taxonomie, v_resultat, now())
    on conflict (taxonomie) do update
      set resultat = excluded.resultat, calcule_le = excluded.calcule_le;
  end if;

  return v_resultat;
end;
$$;

grant execute on function public.comptes_du_catalogue(text[]) to anon, authenticated;

-- 5. Le rafraîchissement : chaque taxonomie rangée est recalculée.
create or replace function public.rafraichir_comptes_du_catalogue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taxonomie text[];
begin
  for v_taxonomie in select taxonomie from public.cache_comptes loop
    update public.cache_comptes
       set resultat = public.calculer_comptes_du_catalogue(v_taxonomie),
           calcule_le = now()
     where taxonomie = v_taxonomie;
  end loop;
end;
$$;

revoke execute on function public.rafraichir_comptes_du_catalogue() from public, anon, authenticated;

-- 6. La première ligne, avec la taxonomie du site (lib/taxonomy.ts,
--    `PRODUCT_CATEGORIES`, dans le même ordre : c'est la clé).
insert into public.cache_comptes (taxonomie, resultat, calcule_le)
values (
  array['Hauts', 'Bas', 'Vestes', 'Robes', 'Maille', 'Chaussures', 'Bijoux', 'Accessoires'],
  public.calculer_comptes_du_catalogue(array['Hauts', 'Bas', 'Vestes', 'Robes', 'Maille', 'Chaussures', 'Bijoux', 'Accessoires']),
  now()
)
on conflict (taxonomie) do update
  set resultat = excluded.resultat, calcule_le = excluded.calcule_le;

-- 7. Toutes les dix minutes. Rejouer la migration remplace la tâche
--    au lieu d'en ajouter une seconde.
select cron.unschedule(jobid) from cron.job where jobname = 'newave-comptes-du-catalogue';
select cron.schedule(
  'newave-comptes-du-catalogue',
  '*/10 * * * *',
  'select public.rafraichir_comptes_du_catalogue()'
);

notify pgrst, 'reload schema';
