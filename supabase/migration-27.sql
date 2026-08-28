-- Migration 27 — les adresses d'images en http, relevées en https.
--
-- LE SYMPTÔME : des cartes de marque blanches, sans image et sans
-- erreur. Aucun message, rien dans les journaux du serveur, rien qui
-- ressemble à une panne.
--
-- LA CAUSE : quelques marques ont enregistré leurs visuels en `http`
-- tout court. NEWAVE est servi en `https`, et un navigateur REFUSE de
-- charger une ressource non chiffrée dans une page chiffrée. Il la
-- bloque silencieusement, ce qui est exactement ce qu'on lui demande de
-- faire depuis dix ans, et ce qui rend le problème invisible sans
-- ouvrir la console.
--
-- Le site relève déjà l'adresse au moment de l'afficher (voir
-- `lib/vignette` et `api/img`), donc cette migration n'est pas
-- obligatoire. Elle règle le problème à la source, ce qui vaut mieux :
-- les vidéos de couverture, elles, ne passent par aucune de ces deux
-- fonctions et resteraient bloquées.
--
-- ON NE PERD RIEN. Un hébergeur incapable de répondre en `https` ne
-- pouvait de toute façon pas afficher son image chez nous. Au pire elle
-- reste absente, comme aujourd'hui ; au mieux, et c'est le cas général
-- puisque tous les CDN modernes le savent, elle apparaît enfin.

update public.brands
set logo_url = replace(logo_url, 'http://', 'https://')
where logo_url like 'http://%';

update public.brands
set cover_url = replace(cover_url, 'http://', 'https://')
where cover_url like 'http://%';

update public.brands
set cover_video_url = replace(cover_video_url, 'http://', 'https://')
where cover_video_url like 'http://%';

update public.products
set image_url = replace(image_url, 'http://', 'https://')
where image_url like 'http://%';

-- Le carrousel est un tableau : on le reconstruit élément par élément.
update public.products
set images = (
  select array_agg(replace(adresse, 'http://', 'https://') order by rang)
  from unnest(images) with ordinality as t(adresse, rang)
)
where exists (
  select 1 from unnest(images) as adresse where adresse like 'http://%'
);

-- Combien il en restait, pour le savoir avant de refermer l'onglet.
select
  (select count(*) from public.brands where logo_url like 'http://%'
     or cover_url like 'http://%' or cover_video_url like 'http://%') as marques_restantes,
  (select count(*) from public.products where image_url like 'http://%') as pieces_restantes;
