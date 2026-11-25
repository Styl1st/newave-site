-- ============================================================
-- MIGRATION 53 — une recherche qui répond à la frappe
-- ============================================================
--
-- À lancer dans le SQL Editor. Rejouable. Ne change aucun résultat.
--
-- `name ilike '%sup%'` sur quarante mille pièces : la base lisait toute
-- la table, et compter les résultats prenait près de deux secondes. Avec
-- un index trigramme (pg_trgm), la même question se règle dans l'index.
--
-- Deux index, partiels comme la vitrine : seules les pièces en ligne.
--   - sur `name`, pour la recherche du site (`rechercher`, /api/recherche) ;
--   - sur `recherche`, pour le champ de la vitrine (`vitrine`, migration 45).
--
-- Un trigramme, ce sont trois lettres : en deçà, l'index ne sert pas, et
-- le site ne compte plus les résultats d'une recherche de deux lettres.

create extension if not exists pg_trgm with schema extensions;

create index if not exists products_nom_trgm_idx
  on public.products using gin (name extensions.gin_trgm_ops)
  where status = 'published' and retired_at is null;

create index if not exists products_recherche_trgm_idx
  on public.products using gin (recherche extensions.gin_trgm_ops)
  where status = 'published' and retired_at is null;

analyze public.products;
