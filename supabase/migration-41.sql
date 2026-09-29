-- ============================================================
-- MIGRATION 41 — compter les pièces de chaque marque, pour l'admin
-- ============================================================
--
-- A lancer dans le SQL Editor, apres migration-40.sql. Rejouable.
--
-- LE BUG QU'ELLE RÈGLE. La liste des marques de l'administration
-- comptait les pièces en rapatriant UNE LIGNE PAR PIÈCE, par tranches
-- de mille, avec un plafond de vingt tranches. La table `products`
-- garde aussi les brouillons et les pièces retirées, elle grossit vite.
-- Passé vingt mille lignes, ou à la première tranche ratée en route
-- (délai dépassé), le reste n'était plus compté, sans un mot : des
-- marques complètes, publiées, catalogue importé, s'affichaient
-- « 0 pièce » avec la jauge rouge « sans catalogue ».
--
-- Ici, c'est Postgres qui compte : une ligne par marque, quelle que
-- soit la taille du catalogue.
--
-- CE QU'ELLE COMPTE : toutes les pièces de la marque, brouillons et
-- retirées comprises. C'est le même chiffre que celui que relit
-- l'action de publication (`count` sur `products` par `brand_id`) : la
-- liste doit dire la même chose que la règle qu'elle annonce.
--
-- `security definer` + `is_admin()` : elle lit toute la table sans
-- faire évaluer les règles RLS ligne à ligne, mais ne répond qu'à un
-- administrateur. Pour tout autre compte, elle ne rend rien.
--
-- Tant que ce fichier n'est pas lancé, le site compte marque par
-- marque (une requête `count` par fiche) : juste, mais plus lent.
-- ============================================================

create or replace function public.compter_les_pieces_par_marque()
returns table (brand_id uuid, total int)
language sql
stable
security definer
set search_path = public
as $$
  select p.brand_id, count(*)::int as total
  from public.products p
  where public.is_admin()
  group by p.brand_id;
$$;

comment on function public.compter_les_pieces_par_marque() is
  'Nombre de pieces par marque (brouillons et retirees comprises), pour la liste de l''administration. Ne repond qu''a un administrateur.';

revoke all on function public.compter_les_pieces_par_marque() from public;
grant execute on function public.compter_les_pieces_par_marque() to authenticated;

notify pgrst, 'reload schema';
