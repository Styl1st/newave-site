-- ============================================================
-- migration 23 — une illustration animee pour les marques
-- ============================================================
--
-- Beaucoup de marques ouvrent leur site sur une video plutot que sur
-- une photo. Notre lecture ne cherchait qu'une image : sur ces
-- sites-la, on repartait soit sans illustration, soit avec la vignette
-- de partage, qui n'est pas ce qu'ils montrent.
--
-- La video reste CHEZ EUX : on n'en garde que l'adresse, comme pour les
-- photos de pieces. Rien n'est heberge ici.
--
-- `cover_url` ne disparait pas et garde tout son role : c'est l'image
-- fixe, celle des cartes de l'annuaire et de l'apercu quand on partage
-- un lien. Une video ne peut remplacer ni l'une ni l'autre.
--
-- A passer dans l'editeur SQL de Supabase.

alter table public.brands
  add column if not exists cover_video_url text;

comment on column public.brands.cover_video_url is
  'Illustration animee, hebergee par la marque. cover_url reste l''image fixe et sert de premiere image.';

-- ---------- verification ----------
-- select name, cover_video_url from public.brands
-- where cover_video_url is not null;
