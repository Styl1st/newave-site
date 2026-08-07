-- ============================================================
--  MIGRATION 03 — corrige l'index qui bloquait l'import Shopify
--
--  A lancer dans le SQL Editor de Supabase, apres migration-02.sql.
--  Rejouable.
--
--  Pourquoi : l'index cree en 02 etait PARTIEL (clause WHERE).
--  Postgres n'accepte un index partiel dans un ON CONFLICT que si la
--  requete repete exactement la meme condition, ce que le client
--  Supabase ne sait pas exprimer. Resultat : "there is no unique or
--  exclusion constraint matching the ON CONFLICT specification".
--
--  Un index complet fait le meme travail : deux NULL ne se
--  ressemblent jamais du point de vue d'un index unique, donc les
--  pieces saisies a la main (source_id vide) ne se genent pas entre
--  elles.
-- ============================================================

drop index if exists public.products_source_unique;

create unique index if not exists products_source_unique
  on public.products (brand_id, source_id);

-- Verification : la ligne renvoyee ne doit plus contenir de "WHERE".
select indexdef
from pg_indexes
where schemaname = 'public' and indexname = 'products_source_unique';
