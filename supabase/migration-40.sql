-- ============================================================
-- MIGRATION 40 — les emails du site : l'accusé de réception
-- ============================================================
--
-- A lancer dans le SQL Editor, apres migration-39.sql. Rejouable.
--
-- Le site envoie maintenant lui-même un « Candidature reçue » à qui
-- dépose un dossier (voir src/lib/emails.ts). Le formulaire est public
-- et l'adresse y est tapée par n'importe qui : sans limite, il
-- suffirait d'y saisir l'adresse d'un tiers, une fois toutes les
-- trente secondes, pour noyer sa boîte sous nos messages. Il finirait
-- par nous classer en indésirable, et nos emails de confirmation
-- d'inscription avec.
--
-- Cette fonction répond à une seule question : cette adresse a-t-elle
-- déjà eu son accusé aujourd'hui ? Le site l'appelle juste après le
-- dépôt, candidature fraîche comprise. Elle renvoie donc vrai tant
-- qu'il n'y a qu'UNE candidature de cette adresse sur les dernières
-- vingt-quatre heures, faux au-delà.
--
-- Tant que ce fichier n'est pas lancé, le site n'envoie aucun accusé
-- (et le signale dans les journaux Vercel). Rien d'autre ne change.
-- ============================================================

create or replace function public.candidature_a_accuser(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select count(*) <= 1
  from public.applications
  where lower(email) = lower(btrim(coalesce(p_email, '')))
    and created_at > now() - interval '24 hours';
$$;

revoke all on function public.candidature_a_accuser(text) from public;
grant execute on function public.candidature_a_accuser(text) to anon, authenticated;
