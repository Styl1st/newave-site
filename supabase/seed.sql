-- Deux marques et deux articles pour demarrer.
-- A lancer APRES schema.sql.

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

insert into public.articles
  (slug, title, excerpt, body, brand_slug, reading_minutes, status, published_at)
values
  ('pourquoi-les-series-limitees',
   'Pourquoi les séries limitées changent tout',
   'Produire moins n''est pas qu''un argument écologique. C''est aussi ce qui permet à une marque naissante de survivre à sa première année.',
   'Corps de l''article, à écrire.',
   'engineered-by-aryes', 4, 'published', now()),

  ('dans-l-atelier-de-pollen-fabrics',
   'Dans l''atelier de Pollen Fabrics',
   'Trois mois pour une coupe. On est allés voir comment se fabrique un pantalon quand personne ne presse le bouton.',
   'Corps de l''article, à écrire.',
   'pollen-fabrics', 6, 'published', now())
on conflict (slug) do nothing;
