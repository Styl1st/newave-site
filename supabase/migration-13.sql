-- ============================================================
--  MIGRATION 13 — une piece retiree n'est pas une piece effacee
--
--  A lancer dans le SQL Editor, apres migration-12.sql. Rejouable.
--
--  Une marque retire une piece de sa boutique : serie epuisee, modele
--  arrete, refonte du site. Jusqu'ici la ligne disparaissait, et avec
--  elle les coups de cœur qu'elle avait recus.
--
--  C'est doublement dommage. Ces coups de cœur racontent ce que la
--  marque a fait, et cette trace continue de lui donner de la
--  visibilite longtemps apres que la piece a quitte l'etal. On garde
--  donc la fiche, on la marque comme retiree, et on le dit clairement
--  a qui la consulte.
-- ============================================================

alter table public.products
  add column if not exists retired_at timestamptz;

comment on column public.products.retired_at is
  'Date a laquelle la piece a disparu de la boutique de la marque. Non nulle = la fiche reste consultable mais la piece n''est plus en vente.';

-- Les pieces encore en vente d'abord, les retirees ensuite : c'est
-- l'ordre dans lequel on veut les voir sur une fiche de marque.
create index if not exists products_retired_idx
  on public.products (brand_id, retired_at nulls first, position);

-- Verification.
select count(*) filter (where retired_at is null)     as en_vente,
       count(*) filter (where retired_at is not null) as retirees
from public.products;
