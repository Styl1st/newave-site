-- ============================================================
-- MIGRATION 32 — compter les marques comme on compte les rayons
-- ============================================================
--
-- L'en-tête des pièces annonçait « 26 507 pièces au catalogue · 141
-- marques » et, deux centimètres plus bas, le filtre « Marque » disait
-- « Toutes (133) ». Les deux nombres étaient exacts et ils ne parlaient
-- pas de la même chose : 141 comptait les marques publiées, 133 celles
-- dont une pièce se trouvait dans la VITRINE — au plus dix par marque,
-- et seulement celles qui portent une photo. Huit marques tombaient
-- dans l'écart, et de l'extérieur cela ressemble à une page qui se
-- contredit.
--
-- C'est le même défaut que la migration 31 a corrigé pour les rayons,
-- et il se corrige de la même façon : LA COLONNE DE FILTRES ANNONCE LE
-- SITE, PAS L'ÉCHANTILLON QUE LA PAGE A SOUS LA MAIN. On demande donc
-- le comptage à Postgres, marque par marque, sur la table entière.
--
-- ⚠️ `left join` ET NON `join`. Une marque publiée qui n'a pas encore
-- importé son catalogue doit sortir avec un total de zéro, sinon elle
-- disparaît du compte et l'on retombe exactement sur l'écart qu'on est
-- en train de boucher. C'est aussi ce qui garantit que le nombre rendu
-- ici est le même que celui de l'annuaire.
--
-- CE QU'ELLE COMPTE : les pièces publiées, encore en vente, des marques
-- publiées. Le même périmètre que `compter_les_rayons`, au mot près,
-- pour que la somme des marques et celle des rayons tombent juste.
-- Elle ne filtre pas sur la présence d'une photo : ce tri-là est fait
-- par `aUneIllustration`, en JavaScript, et le redire en SQL serait une
-- deuxième définition de la même règle.
--
-- L'ORDRE EST LAISSÉ AU SITE. Trier des noms français demande une
-- collation, et « Étoile » ne se range pas au même endroit selon celle
-- de la base. `localeCompare("fr")` le fait côté navigateur, il le fait
-- déjà pour cette liste, et deux tris valent moins qu'un.
--
-- `security definer` : même raison que `compter_les_rayons`, elle ne
-- sort que des noms publics et des nombres.
-- ------------------------------------------------------------

create or replace function public.compter_les_marques()
returns table (slug text, nom text, total int)
language sql
security definer
set search_path = public
stable
as $$
  select
    b.slug,
    b.name as nom,
    count(p.id)::int as total
  from public.brands b
  left join public.products p
    on p.brand_id = b.id
   and p.status = 'published'
   and p.retired_at is null
  where b.status = 'published'
  group by b.slug, b.name;
$$;

comment on function public.compter_les_marques() is
  'Compte les pieces publiees et en vente de chaque marque publiee. Les marques sans piece sortent a zero : c''est ce qui fait tomber ce compte sur celui de l''annuaire. Ne rend que des noms publics et des nombres.';

grant execute on function public.compter_les_marques() to anon, authenticated;

-- Le groupement passe par `brand_id` sur toute la table des pièces.
create index if not exists products_brand_id_idx
  on public.products (brand_id);
