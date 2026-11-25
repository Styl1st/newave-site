-- ============================================================
-- MIGRATION 52 — relire toutes les boutiques chaque nuit, côté serveur
-- ============================================================
--
-- À lancer dans le SQL Editor. Rejouable.
--
-- POURQUOI. Vercel ne lance une tâche planifiée qu'une fois par jour, et
-- une fonction n'y vit qu'une minute : sa tâche ne relisait que six
-- marques par jour, soit un tour complet par mois. Des pièces retirées
-- chez les marques restaient donc en vitrine, avec une photo morte et
-- un lien vers une 404.
--
-- CE QUE ÇA FAIT. Supabase appelle lui-même le site :
--   - /api/cron/catalogues toutes les cinq minutes de 2 h à 3 h 55 UTC.
--     Chaque appel relit les marques pas vues depuis 18 h, quatre à la
--     fois, pendant une demi-minute ; les appels suivants reprennent là.
--     Une fois tout le monde à jour, ils répondent sans rien faire.
--   - /api/cron/couleurs toutes les dix minutes de 4 h à 4 h 50 UTC,
--     pour les pièces arrivées dans la nuit.
--
-- LE SECRET. Les deux routes exigent `Authorization: Bearer CRON_SECRET`.
-- Il est créé ICI, au hasard, dans le coffre de Supabase (Vault), et ne
-- sort jamais de la base. À recopier une fois dans Vercel : Supabase →
-- Project Settings → Vault → `newave_cron_secret` → valeur, puis Vercel
-- → Settings → Environment Variables → CRON_SECRET. Les tâches de
-- vercel.json utilisent la même variable.

create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'newave_cron_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'newave_cron_secret',
      'CRON_SECRET du site (Vercel). Les tâches pg_cron l''envoient au site.'
    );
  end if;
end;
$$;

-- Un appel au site, avec le secret. Une minute d'attente au plus : c'est
-- la durée de vie d'une fonction Vercel.
create or replace function public.appeler_le_site(p_chemin text)
returns bigint
language sql
security definer
set search_path = public
as $$
  select net.http_get(
    url := 'https://newavesphere.fr' || p_chemin,
    headers := jsonb_build_object(
      'authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'newave_cron_secret')
    ),
    timeout_milliseconds := 65000
  );
$$;

revoke execute on function public.appeler_le_site(text) from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname in ('newave-catalogues', 'newave-couleurs');

select cron.schedule('newave-catalogues', '*/5 2-3 * * *', $$select public.appeler_le_site('/api/cron/catalogues')$$);
select cron.schedule('newave-couleurs', '*/10 4 * * *', $$select public.appeler_le_site('/api/cron/couleurs')$$);
