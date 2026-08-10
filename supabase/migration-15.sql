-- =====================================================================
--  MIGRATION 15 — LA CANDIDATURE DÉPOSE UNE FICHE, PAS UN FORMULAIRE
--
--  Jusqu'ici une candidature n'était qu'un message : la fiche de la
--  marque était ensuite ressaisie à la main dans l'administration.
--  Désormais le parcours lit le site de la marque, la personne relit
--  ce qu'on a trouvé, et l'envoi dépose une fiche EN BROUILLON déjà
--  remplie, rattachée à sa candidature.
--
--  À lancer dans Supabase, onglet SQL Editor. Le fichier peut être
--  relancé sans dommage.
-- =====================================================================


-- ---------------------------------------------------------------------
--  1. Les réseaux, au pluriel.
--
--  Une seule colonne « instagram » suffisait tant qu'on ne demandait
--  que ça. Un créateur qui n'existe que sur TikTok n'avait nulle part
--  où le dire. On garde l'ancienne colonne, qui alimente l'affichage,
--  et on ajoute la liste complète à côté.
--
--  Forme attendue : [{"reseau": "tiktok", "identifiant": "tamarque"}]
-- ---------------------------------------------------------------------
alter table public.brands
  add column if not exists reseaux jsonb not null default '[]'::jsonb;

alter table public.applications
  add column if not exists reseaux jsonb not null default '[]'::jsonb;


-- ---------------------------------------------------------------------
--  2. Une dépendance minuscule.
--
--  L'adresse d'une fiche ne peut pas contenir « é », et l'extension
--  « unaccent » n'est pas installée partout. Plutôt que de l'exiger,
--  on remplace les quelques lettres qui nous concernent.
-- ---------------------------------------------------------------------
create or replace function public.unaccent_simple(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select translate(
    t,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
  );
$$;


-- ---------------------------------------------------------------------
--  3. Déposer une candidature.
--
--  Cette fonction existe pour une seule raison : la table « brands »
--  n'accepte d'écriture que d'un administrateur, et c'est très bien
--  ainsi. On ne va pas ouvrir cette porte pour un formulaire public.
--
--  « security definer » laisse la fonction écrire au nom de son
--  propriétaire, mais elle ne fait QUE ce qui est écrit ici : une
--  fiche en brouillon, jamais publiée, jamais à la une, et une
--  candidature qui la référence. Rien d'autre ne passe.
--
--  « set search_path » n'est pas une coquetterie : sans lui, quelqu'un
--  pourrait créer une table de son nom dans un schéma qu'il contrôle
--  et détourner les écritures de la fonction.
-- ---------------------------------------------------------------------
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
  v_base     text;
  v_slug     text;
  v_n        int := 1;
  v_brand    uuid;
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

  -- L'adresse de la future fiche, dérivée du nom.
  v_base := left(
    trim(both '-' from regexp_replace(lower(unaccent_simple(v_marque)), '[^a-z0-9]+', '-', 'g')),
    60
  );
  if v_base = '' then v_base := 'marque'; end if;

  v_slug := v_base;
  while exists (select 1 from public.brands where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
    -- Au-delà, on renonce à créer la fiche : c'est très probablement la
    -- même marque proposée plusieurs fois, et on ne va pas empiler des
    -- brouillons identiques.
    if v_n > 5 then
      v_slug := null;
      exit;
    end if;
  end loop;

  if v_slug is not null then
    insert into public.brands (
      slug, name, tagline, description, country, city, categories,
      price_tier, website_url, shop_url, instagram, reseaux,
      logo_url, cover_url, featured, status
    ) values (
      v_slug,
      v_marque,
      left(coalesce(nullif(btrim(p_description), ''), 'Marque indépendante'), 160),
      coalesce(p_description, ''),
      coalesce(nullif(btrim(p_pays), ''), 'France'),
      nullif(btrim(coalesce(p_ville, '')), ''),
      coalesce(p_categories, '{}'),
      'intermediaire',
      nullif(btrim(coalesce(p_site, '')), ''),
      nullif(btrim(coalesce(p_site, '')), ''),
      nullif(btrim(coalesce(p_instagram, '')), ''),
      coalesce(p_reseaux, '[]'::jsonb),
      nullif(btrim(coalesce(p_logo, '')), ''),
      nullif(btrim(coalesce(p_couverture, '')), ''),
      false,
      'draft'
    )
    returning id into v_brand;
  end if;

  insert into public.applications (
    brand_id, user_id, relationship, brand_name, contact_name,
    email, instagram, reseaux, website, pitch, status
  ) values (
    v_brand,
    auth.uid(),
    v_relation,
    v_marque,
    v_contact,
    v_email,
    nullif(btrim(coalesce(p_instagram, '')), ''),
    coalesce(p_reseaux, '[]'::jsonb),
    nullif(btrim(coalesce(p_site, '')), ''),
    coalesce(p_pitch, ''),
    'nouvelle'
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Une fonction « security definer » est exécutable par tout le monde
-- par défaut : on le dit explicitement plutôt que de compter dessus.
revoke all on function public.deposer_candidature(
  text, text, text, text, text, text, text, jsonb, text, text, text, text[], text, text
) from public;

grant execute on function public.deposer_candidature(
  text, text, text, text, text, text, text, jsonb, text, text, text, text[], text, text
) to anon, authenticated;


notify pgrst, 'reload schema';
