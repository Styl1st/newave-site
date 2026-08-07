-- ============================================================
--  MIGRATION 04 — fiches de pieces
--
--  A lancer dans le SQL Editor, apres migration-03.sql. Rejouable.
--
--  Ajoute de quoi faire une vraie page produit : adresse propre,
--  tailles avec leur disponibilite, et prix barre pour les promos.
-- ============================================================

-- Adresse de la page : /marques/<marque>/<piece>
alter table public.products add column if not exists slug text;

-- Prix barre. Rempli seulement s'il est SUPERIEUR au prix courant,
-- sinon on afficherait une fausse promo.
alter table public.products add column if not exists compare_at_cents int;

-- Tailles : [{"label":"M","available":true}, ...]
-- Du jsonb plutot qu'une table dediee : ces valeurs viennent de la
-- boutique, ne sont jamais interrogees seules, et changent en bloc.
alter table public.products add column if not exists sizes jsonb not null default '[]'::jsonb;

-- Intitule de l'option chez la marque : "Taille", "Couleur", "Format"...
alter table public.products add column if not exists size_label text not null default 'Taille';

-- Les pieces deja importees n'ont pas de slug : on en fabrique un a
-- partir du nom. unaccent n'est pas garanti, donc on reste sur des
-- remplacements simples, suffisants pour du francais.
update public.products
set slug = trim(both '-' from regexp_replace(lower(
      translate(name,
        'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
        'aaaaaaceeeeiiiinooooouuuuyy')
    ), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

-- Deux pieces d'une meme marque ne peuvent pas partager la meme adresse.
-- Les NULL ne se genent pas entre eux, donc une piece sans slug reste possible.
create unique index if not exists products_brand_slug_unique
  on public.products (brand_id, slug);

create index if not exists products_slug_idx on public.products (slug);
