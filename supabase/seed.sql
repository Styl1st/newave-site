-- Donnees de depart. A lancer APRES schema.sql.
-- Rejouable : relancer ne cree pas de doublons.

insert into public.brands
  (slug, name, tagline, description, country, city, founded_year,
   categories, price_tier, website_url, shop_url, instagram, featured, status, published_at)
values
  ('engineered-by-aryes', 'Engineered By Aryes',
   'Minimalisme français, séries limitées',
   'Label français au vocabulaire épuré : chemises, pantalons, mailles et bijoux en argent. Des séries courtes, des noms de pièces empruntés à une poésie japonaise, et une obsession pour la coupe plutôt que pour le logo.',
   'France', 'Paris', 2022,
   array['Minimalisme','Maille','Bijoux'], 'premium',
   'https://shoparyes.fr', 'https://shoparyes.fr', 'engineeredbyaryes',
   true, 'published', now()),

  ('pollen-fabrics', 'Pollen Fabrics',
   'Le denim comme matière première',
   'Un travail du denim brut et des coupes larges, pensé pour durer plus d''une saison. Production en petites quantités, pièces retravaillées à la main.',
   'France', null, 2023,
   array['Denim','Streetwear'], 'intermediaire',
   null, null, 'pollenfabrics',
   true, 'published', now())
on conflict (slug) do nothing;

-- Deux posts d'exemple, sans visuel : tu les remplaceras depuis /admin.
insert into public.posts
  (slug, title, caption, keywords, brand_id, status, published_at)
select
  'premiere-selection-aryes',
  'La sélection Aryes',
  'Trois pièces qui résument la démarche : une coupe, une matière, aucun logo.',
  array['minimalisme','made in france','maille'],
  b.id, 'published', now()
from public.brands b where b.slug = 'engineered-by-aryes'
on conflict (slug) do nothing;

insert into public.posts
  (slug, title, caption, keywords, brand_id, status, published_at)
select
  'pollen-le-denim-brut',
  'Pollen, le denim brut',
  'Ce que ça change de porter un denim qui n''a pas été lavé quinze fois avant toi.',
  array['denim','streetwear','marque indé'],
  b.id, 'published', now()
from public.brands b where b.slug = 'pollen-fabrics'
on conflict (slug) do nothing;
