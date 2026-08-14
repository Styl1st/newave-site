-- ============================================================
-- migration 20 — dire si un post est une video
-- ============================================================
--
-- La pastille « Vidéo » s'affichait sur tout post portant un lien
-- Instagram, ce qui est faux la plupart du temps : un carrousel de
-- photos a lui aussi son lien. On promettait donc une lecture qui
-- n'existait pas.
--
-- On ne devine plus, on demande. Une case a cocher dans le formulaire,
-- et la pastille suit.
--
-- A passer dans l'editeur SQL de Supabase.

alter table public.posts
  add column if not exists est_video boolean not null default false;

comment on column public.posts.est_video is
  'Le post renvoie vers une video (reel, TikTok) plutot que vers des photos.';

-- ---------- valeur de depart pour l'existant ----------
--
-- On ne laisse pas tout a faux : l'adresse permet de trancher dans la
-- quasi-totalite des cas. Un lien TikTok est toujours une video ; chez
-- Instagram, /reel/ et /tv/ le sont, /p/ ne l'est pas.
--
-- C'est une supposition, mais une supposition sur des donnees deja
-- ecrites, corrigeable en deux clics. Repartir de zero aurait oblige a
-- reprendre chaque post a la main.
update public.posts
set est_video = true
where est_video = false
  and (
    tiktok_url is not null
    or instagram_url ~* '/(reel|reels|tv)/'
  );

-- ---------- verification ----------
-- select est_video, count(*) from public.posts group by est_video;
