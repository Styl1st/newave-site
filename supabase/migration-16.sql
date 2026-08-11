-- =====================================================================
--  MIGRATION 16
--
--    1. Une candidature ne crée plus de fiche. Elle en crée une quand
--       ON L'ACCEPTE, et pas avant.
--    2. Les prix étrangers deviennent lisibles : on retient le taux de
--       change et on affiche l'équivalent en euros.
--
--  À lancer après migration-15.sql. Rejouable sans dommage.
-- =====================================================================


-- ---------------------------------------------------------------------
--  1. La candidature porte la fiche, sans la créer.
--
--  La migration précédente déposait un brouillon dès l'envoi. C'était
--  une erreur : l'annuaire se remplissait de fiches que personne
--  n'avait encore acceptées, et il devenait impossible de distinguer
--  « en attente de relecture » de « relu, gardé de côté ». Un brouillon
--  doit vouloir dire une seule chose.
--
--  Les informations recueillies sont donc rangées SUR la candidature.
--  La fiche naîtra à l'acceptation, remplie d'un coup.
-- ---------------------------------------------------------------------
alter table public.applications
  add column if not exists description text not null default '',
  add column if not exists pays        text,
  add column if not exists ville       text,
  add column if not exists categories  text[] not null default '{}',
  add column if not exists logo_url    text,
  add column if not exists cover_url   text;

create or replace function public.deposer_candidature(
  p_relation    text,
  p_marque      text,
  p_contact     text,
  p_email       text,
  p_pitch       text,
  p_site        text default null,
  p_instagram   text default null,
  p_reseaux     jsonb default '[]'::jsonb,
  p_description text default '',
  p_pays        text default 'France',
  p_ville       text default null,
  p_categories  text[] default '{}',
  p_logo        text default null,
  p_couverture  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marque   text := btrim(coalesce(p_marque, ''));
  v_contact  text := btrim(coalesce(p_contact, ''));
  v_email    text := lower(btrim(coalesce(p_email, '')));
  v_relation text := case when p_relation = 'decouvreur' then 'decouvreur' else 'proprietaire' end;
  v_id       uuid;
begin
  -- Le strict nécessaire pour qu'on puisse répondre à quelqu'un.
  if v_marque = '' or v_contact = '' or v_email = '' then
    raise exception 'Le nom de la marque, ton nom et ton email sont nécessaires.';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Cette adresse email ne semble pas valide.';
  end if;
  if length(v_marque) > 120 or length(v_contact) > 120 or length(coalesce(p_pitch, '')) > 5000 then
    raise exception 'Un des champs dépasse la longueur autorisée.';
  end if;

  -- Garde-fou contre l'envoi en rafale. Pas un pare-feu, juste de quoi
  -- décourager un formulaire cliqué cent fois de suite.
  if exists (
    select 1 from public.applications
    where lower(email) = v_email
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'Une candidature vient d''être envoyée depuis cette adresse. Laisse-nous une minute.';
  end if;

  insert into public.applications (
    user_id, relationship, brand_name, contact_name, email,
    instagram, reseaux, website, pitch,
    description, pays, ville, categories, logo_url, cover_url,
    status
  ) values (
    auth.uid(),
    v_relation,
    v_marque,
    v_contact,
    v_email,
    nullif(btrim(coalesce(p_instagram, '')), ''),
    coalesce(p_reseaux, '[]'::jsonb),
    nullif(btrim(coalesce(p_site, '')), ''),
    coalesce(p_pitch, ''),
    coalesce(p_description, ''),
    nullif(btrim(coalesce(p_pays, '')), ''),
    nullif(btrim(coalesce(p_ville, '')), ''),
    coalesce(p_categories, '{}'),
    nullif(btrim(coalesce(p_logo, '')), ''),
    nullif(btrim(coalesce(p_couverture, '')), ''),
    'nouvelle'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.deposer_candidature(
  text, text, text, text, text, text, text, jsonb, text, text, text, text[], text, text
) from public;

grant execute on function public.deposer_candidature(
  text, text, text, text, text, text, text, jsonb, text, text, text, text[], text, text
) to anon, authenticated;


-- ---------------------------------------------------------------------
--  2. Les taux de change.
--
--  Une boutique danoise affiche 899 DKK. Repris tel quel, ça se lit
--  comme un prix délirant à côté d'un article français à 89 €, alors
--  que c'est la même chose. On garde le prix d'origine, qui fait foi
--  chez la marque, et on affiche l'équivalent en euros à côté.
--
--  Une ligne par devise, rafraîchie chaque jour par la tâche qui
--  relit déjà les catalogues. Si la table est vide ou périmée, le site
--  se contente d'afficher le prix d'origine : mieux vaut un prix en
--  couronnes qu'une conversion inventée.
-- ---------------------------------------------------------------------
create table if not exists public.taux_change (
  devise       text primary key,
  -- Combien d'unités de cette devise valent UN euro.
  pour_un_euro numeric not null check (pour_un_euro > 0),
  maj_at       timestamptz not null default now()
);

alter table public.taux_change enable row level security;

-- Les taux sont affichés à tout le monde : ils sont publics par nature.
drop policy if exists "lecture publique des taux" on public.taux_change;
create policy "lecture publique des taux"
  on public.taux_change for select using (true);

drop policy if exists "ecriture admin des taux" on public.taux_change;
create policy "ecriture admin des taux"
  on public.taux_change for all
  using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
--  3. Le prix en euros, rangé à côté du prix d'origine.
--
--  On aurait pu convertir au moment de l'affichage. Il aurait alors
--  fallu transporter la table des taux jusqu'à chaque carte de chaque
--  grille, sur toutes les pages du site. On convertit donc une fois,
--  à la lecture du catalogue, et la relecture quotidienne remet la
--  valeur à jour en même temps que les prix.
--
--  Nul quand la conversion est impossible : une devise inconnue vaut
--  mieux affichée telle quelle qu'approximée au hasard.
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists price_eur_cents      integer,
  add column if not exists compare_at_eur_cents integer;


notify pgrst, 'reload schema';
