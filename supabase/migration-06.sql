-- ============================================================
--  MIGRATION 06 — vidéos dans les posts
--
--  A lancer dans le SQL Editor, apres migration-05.sql. Rejouable.
--
--  Les Reels et TikTok ne peuvent pas etre lus depuis un site tiers
--  sans passer par leur lecteur, qui redirige et pese lourd. On heberge
--  donc le fichier, comme pour les images.
-- ============================================================

alter table public.posts add column if not exists video_url text;

-- Image affichee avant lecture. Sans elle, le navigateur montre soit
-- un rectangle noir, soit la premiere image de la video, souvent moche.
alter table public.posts add column if not exists video_poster text;

comment on column public.posts.video_url is
  'MP4 heberge dans le bucket media. Le carrousel d''images reste utilisable en plus.';

-- Le bucket accepte deja n'importe quel type de fichier : ce sont les
-- politiques d'ecriture qui filtrent, et elles sont inchangees.
-- Verifie simplement la taille maximale dans Storage > Settings :
-- 50 Mo par defaut, largement suffisant pour un Reel.
