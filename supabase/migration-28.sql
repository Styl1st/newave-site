-- Migration 28 — les logos enregistrés en taille de favicon.
--
-- LE SYMPTÔME : des logos définitivement flous, que rien ne rattrapait.
-- On a essayé le rognage des marges, le flou derrière, le détourage du
-- fond, l'agrandissement, un seuil de définition. Aucun n'a marché, et
-- pour une bonne raison : le problème n'était pas dans l'affichage.
--
-- LA CAUSE : l'import prenait l'icône d'onglet du site quand il ne
-- trouvait pas mieux. Une icône d'onglet fait seize ou trente-deux
-- pixels, c'est sa raison d'être. Le logo de Kwest était enregistré en
-- `?crop=center&height=32&width=32`, soit trente-deux pixels de côté,
-- puis affiché sur une carte de trois cents.
--
-- Pire : le site remplaçait `width=32` par `width=400` sans toucher au
-- reste. Le CDN renvoyait donc une image ANNONCÉE à quatre cents pixels
-- mais fabriquée à partir de trente-deux. Le test de définition voyait
-- quatre cents, se déclarait satisfait, et affichait la bouillie.
--
-- CE QUE FAIT CETTE MIGRATION. Elle retire les consignes de découpe des
-- adresses enregistrées, pour repartir du fichier d'origine. Là où
-- l'adresse ne contient QUE des consignes de miniature, c'est-à-dire là
-- où le fichier lui-même est un carré de trente-deux pixels, elle efface
-- le logo : la carte montrera alors le défilé des pièces de la marque,
-- ce qui vaut infiniment mieux qu'un carré flou.
--
-- EFFACER UN LOGO N'EFFACE RIEN D'AUTRE. La fiche, les pièces, les avis
-- et les coups de cœur ne bougent pas. Et la relecture des boutiques le
-- remplira à nouveau si la marque publie un vrai logo un jour.

-- 1. On enlève les paramètres de découpe des adresses Shopify.
--    `regexp_replace` retire chaque clé et son signe, en gardant le
--    reste de la chaîne intacte.
update public.brands
set logo_url = regexp_replace(
  regexp_replace(
    regexp_replace(logo_url, '[?&](width|height)=\d+', '', 'g'),
    '[?&]crop=[a-z]+', '', 'g'
  ),
  -- Le premier paramètre restant doit repasser en `?`, sinon l'adresse
  -- commence par `&` et le serveur ne la comprend plus.
  '&', '?'
)
where logo_url ~ '[?&](width|height)=\d+';

-- 2. Les logos qui étaient DES icônes d'onglet, et rien d'autre.
--    On les reconnaît à leur nom de fichier : les thèmes Shopify et
--    WordPress les nomment tous de la même façon.
update public.brands
set logo_url = null
where logo_url ~* '(favicon|apple-touch-icon)';

-- Ce qu'il reste à surveiller. Les marques listées ici montreront le
-- défilé de leurs pièces tant qu'elles n'auront pas de vrai logo.
select name, slug, logo_url
from public.brands
where logo_url is null and status = 'published'
order by name;
