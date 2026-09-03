-- Migration 29 — de quoi faire vivre les seuils des coups de cœur.
--
-- L'écran « 12a » ne refait pas la page des coups de cœur à chaque
-- palier : il la fait SE COMPORTER autrement selon ce qu'il y a en base.
-- En dessous de cent cœurs, pas de podium et pas de sélecteur de
-- période — trois voix d'écart suffiraient à tout changer, et un
-- classement qui ment coûte plus cher qu'un classement absent.
--
-- Deux choses manquaient à la base pour cela : compter les cœurs SUR UNE
-- FENÊTRE de temps, et savoir ce qui vient d'être mis de côté.
--
-- CE QUI NE CHANGE PAS, ET NE CHANGERA PAS : on ne dit jamais qui a mis
-- quoi en favori. Les deux fonctions ci-dessous sont `security definer`
-- — elles lisent donc par-dessus les règles RLS — et c'est exactement
-- pour cela qu'aucune ne renvoie `user_id`. La table `favorites` a une
-- colonne `user_id` ; elle ne sort d'ici sous aucune forme, pas même
-- agrégée, pas même « pour être filtrée ensuite côté serveur ».


-- ------------------------------------------------------------
--  1. LES TOTAUX, ÉVENTUELLEMENT SUR UNE FENÊTRE
--
--  `brand_favorite_counts()` existe depuis la migration 12 et ne savait
--  compter que depuis toujours. La page a maintenant besoin de « cette
--  semaine » et « ce mois ».
--
--  ⚠️ IL FAUT SUPPRIMER L'ANCIENNE AVANT DE POSER LA NOUVELLE.
--
--  `create or replace` ne remplace que la fonction DE MÊME SIGNATURE.
--  Ajouter un paramètre crée donc une SURCHARGE : les deux versions
--  coexisteraient, l'une sans argument, l'autre avec un argument par
--  défaut. Et un appel sans argument — celui que fait le site à deux
--  endroits — deviendrait alors ambigu pour PostgreSQL, qui refuserait
--  de choisir : « function public.brand_favorite_counts() is not
--  unique ». La page des coups de cœur tomberait entièrement, pour un
--  paramètre ajouté.
--
--  On supprime donc explicitement l'ancienne, puis on pose la nouvelle
--  avec `default null`, ce qui laisse l'appel sans argument continuer de
--  fonctionner exactement comme avant.
-- ------------------------------------------------------------

drop function if exists public.brand_favorite_counts();

create or replace function public.brand_favorite_counts(
  p_depuis timestamptz default null
)
returns table (brand_id uuid, favoris int)
language sql
security definer
set search_path = public
stable
as $$
  select f.brand_id, count(*)::int as favoris
  from public.favorites f
  join public.brands b on b.id = f.brand_id
  where b.status = 'published'
    -- `p_depuis is null` d'abord : quand aucune fenêtre n'est demandée,
    -- la condition disparaît et la requête est mot pour mot celle
    -- d'avant.
    and (p_depuis is null or f.created_at >= p_depuis)
  group by f.brand_id
  order by count(*) desc;
$$;

comment on function public.brand_favorite_counts(timestamptz) is
  'Totaux publics des favoris par marque publiee, depuis toujours ou depuis p_depuis. Ne revele jamais l''identite des personnes : seuls les nombres sortent.';

grant execute on function public.brand_favorite_counts(timestamptz) to anon, authenticated;


-- ------------------------------------------------------------
--  2. CE QUI VIENT D'ÊTRE MIS DE CÔTÉ
--
--  Le rail de la page montre trois lignes : une vignette, un nom, une
--  ancienneté. Rien d'autre, et surtout personne d'autre.
--
--  La fonction ne rend QUE `brand_id` et `created_at`. C'est une
--  contrainte de conception, pas une économie : tant que `user_id` ne
--  sort pas de cette fonction, aucun appelant ne peut le divulguer par
--  accident, quelle que soit la façon dont la page évoluera ensuite.
--
--  On ne renvoie pas non plus une ligne par favori sans distinction : la
--  même marque mise de côté trois fois de suite occuperait les trois
--  lignes du rail. Un `distinct on` garde le dernier cœur de chaque
--  marque, ce qui donne trois marques différentes.
-- ------------------------------------------------------------

create or replace function public.brand_favorite_recent(
  p_limite int default 3
)
returns table (brand_id uuid, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select brand_id, created_at
  from (
    select distinct on (f.brand_id) f.brand_id, f.created_at
    from public.favorites f
    join public.brands b on b.id = f.brand_id
    where b.status = 'published'
    order by f.brand_id, f.created_at desc
  ) dernier
  order by created_at desc
  -- Une borne dure en plus du paramètre : cette fonction est exécutable
  -- par `anon`, et rien n'empêche d'appeler avec un million.
  limit least(greatest(coalesce(p_limite, 3), 1), 50);
$$;

comment on function public.brand_favorite_recent(int) is
  'Les dernieres marques mises de cote : marque et horodatage seulement. Ne revele jamais qui a mis quoi de cote.';

grant execute on function public.brand_favorite_recent(int) to anon, authenticated;


-- ------------------------------------------------------------
--  3. LES INDEX QUE CES DEUX LECTURES DEMANDENT
--
--  `favorites_brand_idx` existe depuis la migration 12 et sert le
--  regroupement par marque. Les deux nouveautés trient et filtrent sur
--  la DATE, ce qu'aucun index ne couvrait.
-- ------------------------------------------------------------

create index if not exists favorites_created_idx
  on public.favorites (created_at desc);

-- Pour le `distinct on (brand_id) ... order by brand_id, created_at desc`
-- ci-dessus : l'index rend le dernier cœur de chaque marque immédiat.
create index if not exists favorites_brand_created_idx
  on public.favorites (brand_id, created_at desc);


-- ------------------------------------------------------------
--  VÉRIFICATION
--
--  Les deux appels que fait le site, dans les deux formes.
-- ------------------------------------------------------------

select 'counts (toujours)' as appel, count(*)::text as lignes
from public.brand_favorite_counts()
union all
select 'counts (7 jours)', count(*)::text
from public.brand_favorite_counts(now() - interval '7 days')
union all
select 'recent', count(*)::text
from public.brand_favorite_recent(3);
