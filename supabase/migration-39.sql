-- ============================================================
-- MIGRATION 39 — le forum, lot C : le profil public et la photo
-- ============================================================
--
-- A lancer dans le SQL Editor, apres migration-38.sql. Rejouable.
--
-- /forum/membre/[pseudo] montre qui est quelqu'un sur le forum : sa
-- photo, sa phrase, sa ville, ses annonces, ses reponses, et sa
-- reputation (le total des votes recus). Ce fichier ajoute :
--
--   1. un garde-fou sur la photo de profil : elle vient du bucket
--      `forum`, du dossier de la personne, et de nulle part ailleurs ;
--   2. UNE seule facon de compter la reputation (`forum_reputation`),
--      pour que le profil et la carte d'auteur d'une annonce disent
--      le meme nombre ;
--   3. les lectures du profil : `forum_profil` et `forum_reponses_de`.
--
-- Rien n'est supprime ni renomme : le site continue de tourner avant
-- comme apres.
-- ============================================================


-- ============================================================
--  1. LA PHOTO DE PROFIL
-- ============================================================
--
--  `profiles.avatar_url` existe depuis la migration 37 ; personne ne
--  pouvait encore la remplir. Elle se remplit maintenant depuis Mon
--  compte, avec une image envoyee dans le bucket `forum`, dossier
--  `{identifiant}/`.
--
--  POURQUOI UN DECLENCHEUR. La regle « chacun modifie son profil »
--  laisse ecrire n'importe quoi dans la colonne, directement depuis le
--  navigateur, sans passer par le site. Sans ce controle, une adresse
--  quelconque du web (pixel espion compris) s'afficherait a cote de
--  chaque annonce et de chaque message de la personne.
--
--  Le site, de son cote, n'affiche une photo que si elle est servie
--  par NOTRE Supabase (voir `photoSure` dans `lib/forum.ts`) : ce
--  declencheur verifie le dossier, le site verifie l'adresse.

create or replace function public.profiles_avatar_garde()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.avatar_url := nullif(trim(new.avatar_url), '');

  -- L'editeur SQL (auth.uid() nul) garde la main, comme pour le role.
  if auth.uid() is null or new.avatar_url is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.avatar_url is not distinct from old.avatar_url then
    return new;
  end if;

  if new.avatar_url not like '%/storage/v1/object/public/forum/' || new.id::text || '/%'
     or new.avatar_url like '%..%'
     or char_length(new.avatar_url) > 500 then
    raise exception 'La photo de profil ne vient pas de ton dossier du forum.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_avatar_garde on public.profiles;
create trigger profiles_avatar_garde
  before insert or update of avatar_url on public.profiles
  for each row execute function public.profiles_avatar_garde();


-- ============================================================
--  2. LA REPUTATION
-- ============================================================
--
--  LA REPUTATION, C'EST LE TOTAL DES VOTES RECUS, sur ses annonces et
--  sur ses commentaires. Affichee, jamais classee entre membres.
--
--  CE QUI COMPTE POUR LA PERSONNE, ET CE QUI COMPTE POUR SA MARQUE.
--  Une annonce publiee au nom d'une marque appartient a la marque : ni
--  elle, ni les commentaires que la personne y ecrit (ils sont signes
--  du nom de la marque sous l'annonce) ne comptent sur son profil.
--  Sinon le profil trahirait qui se cache derriere la marque, et deux
--  ecrans diraient deux nombres differents.
--
--  Rien de masque ne compte : une annonce en relecture ne rapporte
--  rien tant qu'un administrateur ne l'a pas remise.
--
--  `security definer` : les totaux sont publics, et on veut le meme
--  nombre pour tout le monde. En `invoker`, l'auteur d'une annonce
--  masquee verrait ses propres lignes que les autres ne voient pas.
--  La fonction ne renvoie que des nombres.

create or replace function public.forum_reputation(p_auteur uuid)
returns table (votes_recus bigint, annonces bigint, reponses bigint, reponses_utiles bigint)
language sql
stable
security definer
set search_path = public
as $$
  with annonces_perso as (
    select a.votes
    from public.forum_annonces a
    where a.auteur_id = p_auteur and a.marque_id is null and not a.masque
  ),
  commentaires_perso as (
    select c.votes
    from public.forum_commentaires c
    join public.forum_annonces a on a.id = c.annonce_id
    where c.auteur_id = p_auteur
      and not c.masque
      and not a.masque
      and not (a.marque_id is not null and a.auteur_id = c.auteur_id)
  )
  select
    coalesce((select sum(votes) from annonces_perso), 0)
      + coalesce((select sum(votes) from commentaires_perso), 0),
    (select count(*) from annonces_perso),
    (select count(*) from commentaires_perso),
    (select count(*) from commentaires_perso where votes > 0);
$$;

grant execute on function public.forum_reputation(uuid) to anon, authenticated;

-- La carte d'auteur de la page annonce (migration 37) compte desormais
-- de la meme facon. Memes colonnes, pour ne rien casser cote site.
create or replace function public.forum_carte_auteur(p_auteur uuid, p_marque uuid default null)
returns table (votes_recus bigint, annonces bigint, reponses_utiles bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce((select sum(a.votes) from public.forum_annonces a
              where a.marque_id = p_marque and not a.masque), 0),
    (select count(*) from public.forum_annonces a where a.marque_id = p_marque and not a.masque),
    0::bigint
  where p_marque is not null
  union all
  select r.votes_recus, r.annonces, r.reponses_utiles
  from public.forum_reputation(p_auteur) r
  where p_marque is null;
$$;

grant execute on function public.forum_carte_auteur(uuid, uuid) to anon, authenticated;


-- ============================================================
--  3. LE PROFIL
-- ============================================================

-- ---------- l'en-tete ----------
--
--  Le visage public (la vue `forum_membres` : ni email, ni role) et la
--  reputation, en une lecture. Rien si le pseudo n'existe pas.
create or replace function public.forum_profil(p_handle text)
returns table (
  id               uuid,
  handle           text,
  nom              text,
  ville            text,
  bio              text,
  avatar_url       text,
  created_at       timestamptz,
  votes_recus      bigint,
  annonces         bigint,
  reponses         bigint,
  reponses_utiles  bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.id, m.handle, m.nom, m.ville, m.bio, m.avatar_url, m.created_at,
    r.votes_recus, r.annonces, r.reponses, r.reponses_utiles
  from public.forum_membres m
  cross join lateral public.forum_reputation(m.id) r
  where m.handle = lower(trim(p_handle));
$$;

grant execute on function public.forum_profil(text) to anon, authenticated;

-- ---------- l'onglet Reponses ----------
--
--  Ses commentaires, du plus recent au plus ancien, avec le titre de
--  l'annonce ou ils ont ete ecrits. Memes exclusions que la
--  reputation : rien de masque, rien de signe au nom d'une marque.
create or replace function public.forum_reponses_de(
  p_auteur   uuid,
  p_limite   int default 30,
  p_decalage int default 0
)
returns table (
  id                uuid,
  texte             text,
  votes             int,
  created_at        timestamptz,
  est_reponse       boolean,
  annonce_id        uuid,
  annonce_titre     text,
  annonce_rubrique  text,
  total             bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    left(c.texte, 400),
    c.votes,
    c.created_at,
    c.parent_id is not null,
    a.id,
    a.titre,
    a.rubrique,
    count(*) over ()
  from public.forum_commentaires c
  join public.forum_annonces a on a.id = c.annonce_id
  where c.auteur_id = p_auteur
    and not c.masque
    and not a.masque
    and not (a.marque_id is not null and a.auteur_id = c.auteur_id)
  order by c.created_at desc
  limit least(greatest(p_limite, 1), 60)
  offset greatest(p_decalage, 0);
$$;

grant execute on function public.forum_reponses_de(uuid, int, int) to anon, authenticated;


-- ============================================================
--  VERIFICATION
-- ============================================================

select 'fonction forum_profil' as quoi,
  case when exists (select 1 from pg_proc where proname = 'forum_profil') then 'OK' else 'MANQUE' end as etat
union all select 'fonction forum_reponses_de',
  case when exists (select 1 from pg_proc where proname = 'forum_reponses_de') then 'OK' else 'MANQUE' end
union all select 'fonction forum_reputation',
  case when exists (select 1 from pg_proc where proname = 'forum_reputation') then 'OK' else 'MANQUE' end
union all select 'garde-fou de la photo de profil',
  case when exists (select 1 from pg_trigger where tgname = 'profiles_avatar_garde') then 'OK' else 'MANQUE' end;

notify pgrst, 'reload schema';
