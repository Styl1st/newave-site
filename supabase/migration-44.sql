-- ============================================================
-- MIGRATION 44 — les notes de recherche sortent des bios
-- ============================================================
--
-- À lancer dans le SQL Editor, après migration-43.sql. Rejouable.
-- Rien à changer côté code : le site fonctionne avant comme après.
--
-- LE PROBLÈME. Quand l'annuaire a été rempli en lot, la colonne de
-- notes du tableur — ce qu'on avait trouvé, ou pas, en cherchant le
-- site de chaque marque — a été versée dans `brands.description`. Une
-- fiche sans vraie bio affichait donc à tout le monde « vitrine Shopify
-- repérée, sans domaine propre », « rien trouvé, présence Instagram
-- uniquement », « bettermestudios.store, à confirmer d'un coup d'œil ».
--
-- Le site masque déjà les tournures les plus nettes (voir `lib/bio`).
-- Cette migration règle le fond : la note quitte la bio, et la fiche
-- redevient une fiche sans bio, que la page sait afficher proprement.
--
-- CE QUI EST CONSIDÉRÉ COMME UNE NOTE. Un texte court (240 signes au
-- plus), d'une seule ligne, qui ne se termine pas par une ponctuation —
-- une bio rédigée finit par un point, une note prise en passant jamais —
-- ET qui, en plus :
--   — commence par une minuscule, un @ ou un guillemet (les notes
--     commencent par « rien trouvé », « boutique… », « marque… », un nom
--     de domaine) ;
--   — ou emploie une tournure de note : « à confirmer », « sans
--     rapport », « aucun domaine », « renvoie vers »…
--
-- LES MARQUES QUI ONT UN GÉRANT NE SONT PAS TOUCHÉES. Leur bio a pu être
-- écrite par elles, en minuscules et sans point si c'est leur style.
--
-- RIEN N'EST PERDU. Chaque texte retiré est d'abord copié dans
-- `notes_import`, une table que ni les visiteurs ni les gérants ne
-- peuvent lire (RLS active, aucune règle d'accès) : seul le SQL Editor
-- y voit. Le bloc « ANNULER » en bas remet tout en place.
--
-- LA DERNIÈRE REQUÊTE LISTE CE QUI A ÉTÉ RETIRÉ : c'est le résultat qui
-- s'affiche quand on lance le fichier. À relire d'un œil.
-- ============================================================

create table if not exists public.notes_import (
  brand_id    uuid primary key references public.brands(id) on delete cascade,
  texte       text not null,
  retiree_le  timestamptz not null default now()
);

alter table public.notes_import enable row level security;

comment on table public.notes_import is
  'Notes de recherche retirées de brands.description (migration 44). Lisibles au SQL Editor seulement.';

with notes as (
  select b.id, btrim(b.description) as texte
  from public.brands b
  where btrim(b.description) <> ''
    and length(btrim(b.description)) <= 240
    and position(E'\n' in b.description) = 0
    and btrim(b.description) !~ '[.!?…]$'
    and not exists (select 1 from public.brand_managers m where m.brand_id = b.id)
    and (
      btrim(b.description) ~ '^[a-zà-ÿ@«"]'
      or btrim(b.description) ~* '(rien trouv|rien de s[uû]r|à (confirmer|vérifier|fusionner)|sans rapport|(sans|aucun) domaine|n''est pas (un site actif|référencé)|renvoie (bien )?vers|(instagram|tiktok)( et (instagram|tiktok))? uniquement|vitrine \S+ rep[eé]r[eé]e|est bien (son|le) compte|ne peut pas être lu|est une autre marque)'
    )
),
archivees as (
  insert into public.notes_import (brand_id, texte)
  select id, texte from notes
  on conflict (brand_id) do update set texte = excluded.texte, retiree_le = now()
  returning brand_id
)
update public.brands b
set description = ''
from notes n
where b.id = n.id;

-- Ce qui a été retiré, marque par marque.
select b.name as marque, b.slug, n.texte as note_retiree, n.retiree_le
from public.notes_import n
join public.brands b on b.id = n.brand_id
order by n.retiree_le desc, b.name;

-- ============================================================
-- ANNULER (à lancer seul, si une vraie bio a été prise pour une note)
-- ============================================================
-- Pour une seule marque, remplacer le slug :
--
--   update public.brands b set description = n.texte
--   from public.notes_import n
--   where n.brand_id = b.id and b.slug = 'le-slug-de-la-marque';
--   delete from public.notes_import
--   where brand_id = (select id from public.brands where slug = 'le-slug-de-la-marque');
--
-- Pour tout remettre :
--
--   update public.brands b set description = n.texte
--   from public.notes_import n where n.brand_id = b.id and b.description = '';
--   delete from public.notes_import;
-- ============================================================
