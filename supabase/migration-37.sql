-- ============================================================
-- MIGRATION 37 — le forum, lot A : annonces, commentaires, votes
-- ============================================================
--
-- A lancer dans le SQL Editor, apres migration-36.sql. Rejouable :
-- tout est en `if not exists`, `create or replace` ou
-- `drop ... if exists` suivi de sa recreation.
--
-- Ce que cette migration ajoute, et rien d'autre ne change :
--
--   1. un pseudo public sur les profils (`handle`), plus ville, bio
--      et avatar, et une vue qui ne laisse sortir QUE ces champs ;
--   2. les annonces, leurs commentaires (un seul niveau de reponse)
--      et les votes, positifs uniquement, sur les deux ;
--   3. les lectures du fil, de l'annonce et de la carte d'auteur,
--      calculees ici pour que le tri « Tendance » tienne la
--      pagination ;
--   4. deux nouvelles cibles pour `signalements`, et le masquage
--      automatique a trois signalements ;
--   5. un bucket `forum` pour les photos d'annonces, ou chacun
--      n'ecrit que dans son propre dossier.
--
-- LES DROITS SONT ICI, PAS DANS LE CODE. Les actions du site
-- transmettent ; c'est la base qui accepte ou refuse, comme partout
-- ailleurs.
--
-- La messagerie privee arrive avec la migration 38 (lot B).
-- ============================================================


-- ============================================================
--  1. LE PSEUDO PUBLIC
-- ============================================================
--
--  `profiles` n'est lisible que par son proprietaire, et c'est tres
--  bien ainsi : personne ne doit pouvoir aspirer la liste des membres
--  et leurs adresses. Le forum a pourtant besoin d'afficher un auteur.
--
--  Meme reponse que pour les avis (migration 14) : une vue qui ne
--  laisse sortir que ce que la personne a choisi de montrer, et
--  seulement pour qui s'est donne un pseudo. Pas de pseudo, pas de
--  ligne : on n'apparait sur le forum qu'en l'ayant decide.

alter table public.profiles
  add column if not exists handle     text,
  add column if not exists ville      text,
  add column if not exists bio        text,
  add column if not exists avatar_url text;

-- Minuscules, chiffres, point et tiret bas ; 3 a 24 caracteres ; ni
-- point au debut ni a la fin (« .lea » se lit mal dans une adresse).
-- Quelques noms sont gardes : personne ne doit pouvoir se faire
-- passer pour l'equipe.
alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles add constraint profiles_handle_format check (
  handle is null or (
    handle ~ '^[a-z0-9_][a-z0-9._]{1,22}[a-z0-9_]$'
    and handle not in ('admin', 'administrateur', 'newave', 'newavesphere', 'moderation',
                       'moderateur', 'support', 'forum', 'messages', 'membre', 'equipe')
  )
);

alter table public.profiles drop constraint if exists profiles_bio_longueur;
alter table public.profiles add constraint profiles_bio_longueur
  check (bio is null or char_length(bio) <= 160);

alter table public.profiles drop constraint if exists profiles_ville_longueur;
alter table public.profiles add constraint profiles_ville_longueur
  check (ville is null or char_length(ville) <= 60);

-- Un index partiel plutot qu'une contrainte d'unicite ordinaire : les
-- profils sans pseudo sont nombreux, et on ne veut indexer que les
-- autres.
create unique index if not exists profiles_handle_unique
  on public.profiles (handle) where handle is not null;

-- Le formulaire de pseudo verifie a la frappe. Il ne peut pas lire
-- `profiles` (RLS) : cette fonction repond oui ou non, sans rien dire
-- de qui porte deja le nom.
create or replace function public.handle_disponible(h text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select h ~ '^[a-z0-9_][a-z0-9._]{1,22}[a-z0-9_]$'
     and h not in ('admin', 'administrateur', 'newave', 'newavesphere', 'moderation',
                   'moderateur', 'support', 'forum', 'messages', 'membre', 'equipe')
     and not exists (
       select 1 from public.profiles p
       where p.handle = h and p.id is distinct from auth.uid()
     );
$$;

grant execute on function public.handle_disponible(text) to authenticated;

create or replace view public.forum_membres
with (security_invoker = off) as
select
  p.id,
  p.handle,
  coalesce(nullif(trim(p.display_name), ''), p.handle) as nom,
  p.ville,
  p.bio,
  p.avatar_url,
  p.created_at
from public.profiles p
where p.handle is not null;

comment on view public.forum_membres is
  'Le visage public d''un membre du forum. Ne laisse sortir ni l''email ni le role.';

grant select on public.forum_membres to anon, authenticated;


-- ============================================================
--  2. LES ANNONCES
-- ============================================================

create table if not exists public.forum_annonces (
  id            uuid primary key default gen_random_uuid(),
  auteur_id     uuid not null references auth.users(id) on delete cascade,
  -- Publiee au nom d'une marque que l'auteur gere, ou en son nom
  -- propre (null). Si la marque disparait, l'annonce reste, au nom de
  -- la personne.
  marque_id     uuid references public.brands(id) on delete set null,
  rubrique      text not null check (rubrique in
                  ('casting', 'photo', 'collab', 'evenement', 'idees', 'discussion')),
  titre         text not null check (char_length(trim(titre)) between 3 and 90),
  texte         text not null default '' check (char_length(texte) <= 4000),
  ville         text check (ville is null or char_length(ville) <= 60),
  images        text[] not null default '{}' check (cardinality(images) <= 4),
  -- Date, remuneration, profils, adresse… selon la rubrique. Libre,
  -- mais borne : c'est un bandeau de quatre cases, pas un document.
  details       jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 4000),
  cloturee      boolean not null default false,
  masque        boolean not null default false,
  -- Tenus a jour par les declencheurs plus bas, jamais par le site.
  -- Des compteurs plutot qu'un comptage a chaque lecture : le fil se
  -- trie sur les votes, et il doit repondre en moins de trois
  -- secondes aux visiteurs anonymes.
  votes         int not null default 0,
  commentaires  int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists forum_annonces_votes_idx
  on public.forum_annonces (votes desc, created_at desc) where not masque;
create index if not exists forum_annonces_recentes_idx
  on public.forum_annonces (created_at desc) where not masque;
create index if not exists forum_annonces_auteur_idx
  on public.forum_annonces (auteur_id, created_at desc);
create index if not exists forum_annonces_marque_idx
  on public.forum_annonces (marque_id) where marque_id is not null;

-- ---------- le garde-fou ----------
--
--  RLS dit QUI peut ecrire une ligne, pas QUELLES colonnes. Sans ce
--  declencheur, l'auteur d'une annonce pourrait s'offrir mille votes,
--  ou se demasquer apres trois signalements, en une requete depuis
--  son navigateur. Meme principe que `protect_profile_role`.
--
--  `pg_trigger_depth() > 1` reconnait nos propres declencheurs (les
--  compteurs, le masquage) : ils passent. Une requete du site arrive
--  toujours a la profondeur 1.
create or replace function public.forum_annonces_garde()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  prefixe text;
begin
  if tg_op = 'INSERT' then
    new.votes        := 0;
    new.commentaires := 0;
    new.masque       := false;
    new.cloturee     := false;
    new.created_at   := now();
    new.updated_at   := now();

    -- Publication directe, sans relecture : un plafond evite qu'un
    -- compte vide le fil sous ses annonces. L'administration n'y est
    -- pas soumise.
    if not public.is_admin() and (
      select count(*) from public.forum_annonces
      where auteur_id = new.auteur_id and created_at > now() - interval '24 hours'
    ) >= 5 then
      raise exception 'Cinq annonces par jour au plus. Tu pourras republier demain.';
    end if;
  else
    if pg_trigger_depth() > 1 then
      return new;
    end if;

    new.votes        := old.votes;
    new.commentaires := old.commentaires;
    new.auteur_id    := old.auteur_id;
    new.created_at   := old.created_at;
    if not public.is_admin() then
      new.masque := old.masque;
    end if;
    new.updated_at := now();
  end if;

  new.titre := trim(new.titre);
  new.ville := nullif(trim(new.ville), '');

  -- Les photos viennent du bucket `forum`, dans le dossier de
  -- l'auteur, et de nulle part ailleurs. Sans cette verification,
  -- n'importe quelle adresse du web pourrait s'afficher sur le site,
  -- pixel espion compris.
  prefixe := '%/storage/v1/object/public/forum/' || new.auteur_id::text || '/%';
  if exists (select 1 from unnest(new.images) as u(url) where u.url not like prefixe) then
    raise exception 'Une photo ne vient pas de ton dossier du forum.';
  end if;

  return new;
end;
$$;

drop trigger if exists forum_annonces_garde on public.forum_annonces;
create trigger forum_annonces_garde
  before insert or update on public.forum_annonces
  for each row execute function public.forum_annonces_garde();

alter table public.forum_annonces enable row level security;

-- Tout le monde lit, sauf ce qui est masque : l'auteur voit encore la
-- sienne (avec un bandeau « en cours de relecture »), l'admin tout.
drop policy if exists "forum : lecture des annonces" on public.forum_annonces;
create policy "forum : lecture des annonces"
  on public.forum_annonces for select
  using (not masque or auteur_id = auth.uid() or public.is_admin());

-- Publier : etre connecte, s'etre donne un pseudo (sans lui, l'annonce
-- n'aurait pas d'auteur a afficher), et, au nom d'une marque, la gerer.
drop policy if exists "forum : publier une annonce" on public.forum_annonces;
create policy "forum : publier une annonce"
  on public.forum_annonces for insert to authenticated
  with check (
    auteur_id = auth.uid()
    and (marque_id is null or public.manages_brand(marque_id))
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.handle is not null)
  );

drop policy if exists "forum : modifier son annonce" on public.forum_annonces;
create policy "forum : modifier son annonce"
  on public.forum_annonces for update
  using (auteur_id = auth.uid() or public.is_admin())
  with check (
    (auteur_id = auth.uid() and (marque_id is null or public.manages_brand(marque_id)))
    or public.is_admin()
  );

drop policy if exists "forum : retirer son annonce" on public.forum_annonces;
create policy "forum : retirer son annonce"
  on public.forum_annonces for delete
  using (auteur_id = auth.uid() or public.is_admin());


-- ============================================================
--  3. LES COMMENTAIRES
-- ============================================================
--
--  UN SEUL NIVEAU DE REPONSE. Un arbre profond se lit mal sur un
--  telephone et finit en conversation a deux, ce qui est le role des
--  messages prives. Repondre a une reponse la rattache donc au
--  commentaire de tete, sans erreur : c'est ce que la personne
--  voulait dire.

create table if not exists public.forum_commentaires (
  id          uuid primary key default gen_random_uuid(),
  annonce_id  uuid not null references public.forum_annonces(id) on delete cascade,
  auteur_id   uuid not null references auth.users(id) on delete cascade,
  parent_id   uuid references public.forum_commentaires(id) on delete cascade,
  texte       text not null check (char_length(trim(texte)) between 1 and 2000),
  votes       int not null default 0,
  masque      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists forum_commentaires_annonce_idx
  on public.forum_commentaires (annonce_id, created_at);
create index if not exists forum_commentaires_auteur_idx
  on public.forum_commentaires (auteur_id);
create index if not exists forum_commentaires_parent_idx
  on public.forum_commentaires (parent_id) where parent_id is not null;

create or replace function public.forum_commentaires_garde()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  grand_parent uuid;
  annonce_du_parent uuid;
begin
  if tg_op = 'INSERT' then
    new.votes      := 0;
    new.masque     := false;
    new.created_at := now();
    new.texte      := trim(new.texte);

    if new.parent_id is not null then
      select c.parent_id, c.annonce_id into grand_parent, annonce_du_parent
      from public.forum_commentaires c where c.id = new.parent_id;

      if not found or annonce_du_parent <> new.annonce_id then
        raise exception 'Le commentaire auquel tu reponds n''existe plus.';
      end if;
      if grand_parent is not null then
        new.parent_id := grand_parent;
      end if;
    end if;

    if not public.is_admin() and (
      select count(*) from public.forum_commentaires
      where auteur_id = new.auteur_id and created_at > now() - interval '1 hour'
    ) >= 30 then
      raise exception 'Trente commentaires par heure au plus. Fais une pause, on garde la place.';
    end if;

    return new;
  end if;

  if pg_trigger_depth() > 1 then
    return new;
  end if;

  new.votes      := old.votes;
  new.auteur_id  := old.auteur_id;
  new.annonce_id := old.annonce_id;
  new.parent_id  := old.parent_id;
  new.created_at := old.created_at;
  if not public.is_admin() then
    new.masque := old.masque;
  end if;
  return new;
end;
$$;

drop trigger if exists forum_commentaires_garde on public.forum_commentaires;
create trigger forum_commentaires_garde
  before insert or update on public.forum_commentaires
  for each row execute function public.forum_commentaires_garde();

-- Le nombre de reponses affiche sur la carte : les commentaires
-- visibles seulement.
create or replace function public.forum_compter_commentaires()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cible uuid := case when tg_op = 'DELETE' then old.annonce_id else new.annonce_id end;
begin
  update public.forum_annonces a
  set commentaires = (
    select count(*) from public.forum_commentaires c
    where c.annonce_id = cible and not c.masque
  )
  where a.id = cible;
  return null;
end;
$$;

drop trigger if exists forum_commentaires_compte on public.forum_commentaires;
create trigger forum_commentaires_compte
  after insert or delete or update of masque on public.forum_commentaires
  for each row execute function public.forum_compter_commentaires();

alter table public.forum_commentaires enable row level security;

-- Visible si l'annonce l'est (la sous-requete passe par la regle des
-- annonces) et si lui-meme n'est pas masque.
drop policy if exists "forum : lecture des commentaires" on public.forum_commentaires;
create policy "forum : lecture des commentaires"
  on public.forum_commentaires for select
  using (
    (not masque or auteur_id = auth.uid() or public.is_admin())
    and exists (select 1 from public.forum_annonces a where a.id = annonce_id)
  );

drop policy if exists "forum : commenter" on public.forum_commentaires;
create policy "forum : commenter"
  on public.forum_commentaires for insert to authenticated
  with check (
    auteur_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.handle is not null)
    and exists (select 1 from public.forum_annonces a where a.id = annonce_id and not a.masque)
  );

-- Pas de modification par les membres : un commentaire qui a recu des
-- votes et qu'on reecrit ensuite fait mentir ses votes. On le retire
-- et on en ecrit un autre.
drop policy if exists "forum : moderer un commentaire" on public.forum_commentaires;
create policy "forum : moderer un commentaire"
  on public.forum_commentaires for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "forum : retirer son commentaire" on public.forum_commentaires;
create policy "forum : retirer son commentaire"
  on public.forum_commentaires for delete
  using (auteur_id = auth.uid() or public.is_admin());


-- ============================================================
--  4. LES VOTES
-- ============================================================
--
--  PAS `product_likes`. Les coups de cœur expirent au bout de sept
--  jours ; un vote du forum est permanent. Deux tables a part, une
--  par cible, et pas de vote negatif : on fait monter, ou on retire
--  son vote.
--
--  La liste de qui a vote n'est lisible par personne d'autre que le
--  votant lui-meme. Les totaux sortent par les compteurs.

create table if not exists public.forum_votes (
  user_id     uuid not null references auth.users(id) on delete cascade,
  annonce_id  uuid not null references public.forum_annonces(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, annonce_id)
);

create table if not exists public.forum_votes_com (
  user_id         uuid not null references auth.users(id) on delete cascade,
  commentaire_id  uuid not null references public.forum_commentaires(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, commentaire_id)
);

create index if not exists forum_votes_annonce_idx on public.forum_votes (annonce_id);
create index if not exists forum_votes_com_idx on public.forum_votes_com (commentaire_id);

-- Recompter plutot qu'ajouter un : un compteur qui fait « +1 » derive
-- des qu'une ligne part par un chemin qu'on n'a pas prevu (compte
-- supprime, cascade). Un recomptage retombe toujours juste.
create or replace function public.forum_compter_votes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cible uuid := case when tg_op = 'DELETE' then old.annonce_id else new.annonce_id end;
begin
  update public.forum_annonces a
  set votes = (select count(*) from public.forum_votes v where v.annonce_id = cible)
  where a.id = cible;
  return null;
end;
$$;

drop trigger if exists forum_votes_compte on public.forum_votes;
create trigger forum_votes_compte
  after insert or delete on public.forum_votes
  for each row execute function public.forum_compter_votes();

create or replace function public.forum_compter_votes_com()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cible uuid := case when tg_op = 'DELETE' then old.commentaire_id else new.commentaire_id end;
begin
  update public.forum_commentaires c
  set votes = (select count(*) from public.forum_votes_com v where v.commentaire_id = cible)
  where c.id = cible;
  return null;
end;
$$;

drop trigger if exists forum_votes_com_compte on public.forum_votes_com;
create trigger forum_votes_com_compte
  after insert or delete on public.forum_votes_com
  for each row execute function public.forum_compter_votes_com();

alter table public.forum_votes     enable row level security;
alter table public.forum_votes_com enable row level security;

drop policy if exists "forum : lire ses votes" on public.forum_votes;
create policy "forum : lire ses votes"
  on public.forum_votes for select using (user_id = auth.uid());

-- On ne vote ni pour soi, ni pour une annonce masquee.
drop policy if exists "forum : voter" on public.forum_votes;
create policy "forum : voter"
  on public.forum_votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.forum_annonces a
      where a.id = annonce_id and a.auteur_id <> auth.uid() and not a.masque
    )
  );

drop policy if exists "forum : retirer son vote" on public.forum_votes;
create policy "forum : retirer son vote"
  on public.forum_votes for delete using (user_id = auth.uid());

drop policy if exists "forum : lire ses votes de commentaires" on public.forum_votes_com;
create policy "forum : lire ses votes de commentaires"
  on public.forum_votes_com for select using (user_id = auth.uid());

drop policy if exists "forum : voter pour un commentaire" on public.forum_votes_com;
create policy "forum : voter pour un commentaire"
  on public.forum_votes_com for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.forum_commentaires c
      where c.id = commentaire_id and c.auteur_id <> auth.uid() and not c.masque
    )
  );

drop policy if exists "forum : retirer son vote de commentaire" on public.forum_votes_com;
create policy "forum : retirer son vote de commentaire"
  on public.forum_votes_com for delete using (user_id = auth.uid());


-- ============================================================
--  5. LES LECTURES
-- ============================================================
--
--  En `security invoker` : les regles ci-dessus s'appliquent a qui
--  lit, exactement comme une requete directe. Les fonctions ne
--  donnent aucun droit de plus, elles evitent seulement au site de
--  refaire les jointures et le calcul du tri.

-- ---------- le fil ----------
--
--  Trois tris :
--    populaires : les votes, puis les plus recentes ;
--    recentes   : la date de publication ;
--    tendance   : votes / (heures + 2)^0,8. Une annonce d'hier a
--                 vingt votes passe devant une annonce d'il y a un
--                 mois a cinquante. Les annonces cloturees en sortent.
--
--  Le calcul est ici et non dans le navigateur : trie en JavaScript,
--  il ne vaudrait que pour la page chargee, et la deuxieme page
--  reprendrait un autre ordre.
create or replace function public.forum_fil(
  p_tri       text default 'populaires',
  p_ville     text default null,
  p_rubrique  text default null,
  p_q         text default null,
  p_limite    int  default 24,
  p_decalage  int  default 0
)
returns table (
  id             uuid,
  rubrique       text,
  titre          text,
  extrait        text,
  ville          text,
  images         text[],
  details        jsonb,
  cloturee       boolean,
  votes          int,
  commentaires   int,
  created_at     timestamptz,
  auteur_id      uuid,
  auteur_handle  text,
  auteur_nom     text,
  auteur_avatar  text,
  marque_id      uuid,
  marque_nom     text,
  marque_slug    text,
  a_vote         boolean,
  total          bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select a.*
    from public.forum_annonces a
    where not a.masque
      and (p_ville is null or p_ville = '' or a.ville = p_ville)
      and (p_rubrique is null or p_rubrique = '' or a.rubrique = p_rubrique)
      and (
        p_q is null or trim(p_q) = ''
        or strpos(lower(a.titre || ' ' || a.texte || ' ' || coalesce(a.ville, '')), lower(trim(p_q))) > 0
      )
      and (p_tri is distinct from 'tendance' or not a.cloturee)
  )
  select
    b.id,
    b.rubrique,
    b.titre,
    left(b.texte, 280) as extrait,
    b.ville,
    b.images,
    b.details,
    b.cloturee,
    b.votes,
    b.commentaires,
    b.created_at,
    b.auteur_id,
    m.handle,
    m.nom,
    m.avatar_url,
    br.id,
    br.name,
    br.slug,
    exists (
      select 1 from public.forum_votes v
      where v.annonce_id = b.id and v.user_id = auth.uid()
    ),
    count(*) over ()
  from base b
  left join public.forum_membres m on m.id = b.auteur_id
  left join public.brands br on br.id = b.marque_id
  order by
    case when p_tri = 'recentes' then b.created_at end desc nulls last,
    case when p_tri = 'tendance'
      then b.votes / power(extract(epoch from (now() - b.created_at)) / 3600.0 + 2, 0.8)
    end desc nulls last,
    b.votes desc,
    b.created_at desc
  limit least(greatest(p_limite, 1), 96)
  offset greatest(p_decalage, 0);
$$;

grant execute on function public.forum_fil(text, text, text, text, int, int) to anon, authenticated;

-- ---------- une annonce ----------
--
--  Le texte entier, et `masque` : l'auteur d'une annonce masquee la
--  voit encore (la regle de lecture le permet), avec un bandeau. Pour
--  tous les autres, la fonction ne renvoie rien, comme si l'annonce
--  n'existait pas.
create or replace function public.forum_annonce(p_id uuid)
returns table (
  id             uuid,
  rubrique       text,
  titre          text,
  texte          text,
  ville          text,
  images         text[],
  details        jsonb,
  cloturee       boolean,
  masque         boolean,
  votes          int,
  commentaires   int,
  created_at     timestamptz,
  auteur_id      uuid,
  auteur_handle  text,
  auteur_nom     text,
  auteur_avatar  text,
  marque_id      uuid,
  marque_nom     text,
  marque_slug    text,
  a_vote         boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.id, a.rubrique, a.titre, a.texte, a.ville, a.images, a.details,
    a.cloturee, a.masque, a.votes, a.commentaires, a.created_at,
    a.auteur_id, m.handle, m.nom, m.avatar_url,
    br.id, br.name, br.slug,
    exists (
      select 1 from public.forum_votes v
      where v.annonce_id = a.id and v.user_id = auth.uid()
    )
  from public.forum_annonces a
  left join public.forum_membres m on m.id = a.auteur_id
  left join public.brands br on br.id = a.marque_id
  where a.id = p_id;
$$;

grant execute on function public.forum_annonce(uuid) to anon, authenticated;

-- ---------- ses commentaires ----------
create or replace function public.forum_commentaires_de(p_annonce uuid)
returns table (
  id             uuid,
  parent_id      uuid,
  texte          text,
  votes          int,
  masque         boolean,
  created_at     timestamptz,
  auteur_id      uuid,
  auteur_handle  text,
  auteur_nom     text,
  auteur_avatar  text,
  a_vote         boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id, c.parent_id, c.texte, c.votes, c.masque, c.created_at,
    c.auteur_id, m.handle, m.nom, m.avatar_url,
    exists (
      select 1 from public.forum_votes_com v
      where v.commentaire_id = c.id and v.user_id = auth.uid()
    )
  from public.forum_commentaires c
  left join public.forum_membres m on m.id = c.auteur_id
  where c.annonce_id = p_annonce
  order by c.parent_id nulls first, c.votes desc, c.created_at asc
  limit 500;
$$;

grant execute on function public.forum_commentaires_de(uuid) to anon, authenticated;

-- ---------- la carte d'auteur ----------
--
--  LA REPUTATION, C'EST LE TOTAL DES VOTES RECUS. Affichee sur la
--  carte et le profil, jamais classee entre membres : un classement
--  pousserait a publier pour monter, pas pour aider.
--
--  Au nom d'une marque, on compte les annonces de la marque ; au nom
--  d'une personne, ses annonces personnelles et ses commentaires.
create or replace function public.forum_carte_auteur(p_auteur uuid, p_marque uuid default null)
returns table (votes_recus bigint, annonces bigint, reponses_utiles bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    case when p_marque is not null then
      coalesce((select sum(a.votes) from public.forum_annonces a
                where a.marque_id = p_marque and not a.masque), 0)
    else
      coalesce((select sum(a.votes) from public.forum_annonces a
                where a.auteur_id = p_auteur and a.marque_id is null and not a.masque), 0)
      + coalesce((select sum(c.votes) from public.forum_commentaires c
                  where c.auteur_id = p_auteur and not c.masque), 0)
    end,
    case when p_marque is not null then
      (select count(*) from public.forum_annonces a where a.marque_id = p_marque and not a.masque)
    else
      (select count(*) from public.forum_annonces a
       where a.auteur_id = p_auteur and a.marque_id is null and not a.masque)
    end,
    (select count(*) from public.forum_commentaires c
     where c.auteur_id = p_auteur and not c.masque and c.votes > 0);
$$;

grant execute on function public.forum_carte_auteur(uuid, uuid) to anon, authenticated;


-- ============================================================
--  6. LES SIGNALEMENTS
-- ============================================================
--
--  ON ETEND LA PILE EXISTANTE, ON N'EN CREE PAS UNE DEUXIEME. Deux
--  colonnes de plus, la contrainte « une cible et une seule » qui
--  les compte, et les memes index partiels que les autres cibles.
--  La messagerie ajoutera `conversation_id` a son tour (migration 38).

alter table public.signalements
  add column if not exists annonce_id     uuid references public.forum_annonces(id)     on delete cascade,
  add column if not exists commentaire_id uuid references public.forum_commentaires(id) on delete cascade;

-- Supprimee et recreee dans la meme instruction : il n'existe aucun
-- instant ou la table n'a plus de contrainte.
alter table public.signalements
  drop constraint if exists signalements_une_seule_cible,
  add constraint signalements_une_seule_cible
    check (num_nonnulls(review_id, product_id, brand_id, annonce_id, commentaire_id) = 1);

create unique index if not exists signalements_par_annonce
  on public.signalements (user_id, annonce_id) where annonce_id is not null;
create unique index if not exists signalements_par_commentaire
  on public.signalements (user_id, commentaire_id) where commentaire_id is not null;

-- ---------- le masquage automatique ----------
--
--  Trois personnes differentes, trois signalements pas encore
--  traites : l'annonce ou le commentaire sort des listes en attendant
--  qu'un administrateur tranche. Trois et pas un : un seul
--  signalement, c'est souvent un desaccord ; trois, c'est un probleme
--  qu'on ne laisse pas en vitrine pendant la nuit.
--
--  `security definer` est indispensable : la personne qui signale n'a
--  aucun droit sur l'annonce, et c'est bien normal.
create or replace function public.forum_masquer_si_signale()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.annonce_id is not null then
    if (select count(distinct s.user_id) from public.signalements s
        where s.annonce_id = new.annonce_id and s.traite_at is null) >= 3 then
      update public.forum_annonces set masque = true
      where id = new.annonce_id and not masque;
    end if;
  elsif new.commentaire_id is not null then
    if (select count(distinct s.user_id) from public.signalements s
        where s.commentaire_id = new.commentaire_id and s.traite_at is null) >= 3 then
      update public.forum_commentaires set masque = true
      where id = new.commentaire_id and not masque;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists signalements_forum_masquage on public.signalements;
create trigger signalements_forum_masquage
  after insert on public.signalements
  for each row execute function public.forum_masquer_si_signale();

-- « Classer sans suite » remet en vitrine ce que les signalements
-- avaient masque. Retirer, lui, supprime la ligne : il n'y a plus
-- rien a remettre.
create or replace function public.forum_demasquer_si_classe()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.annonce_id is not null and not exists (
    select 1 from public.signalements s
    where s.annonce_id = new.annonce_id and s.traite_at is null
  ) then
    update public.forum_annonces set masque = false where id = new.annonce_id and masque;
  elsif new.commentaire_id is not null and not exists (
    select 1 from public.signalements s
    where s.commentaire_id = new.commentaire_id and s.traite_at is null
  ) then
    update public.forum_commentaires set masque = false where id = new.commentaire_id and masque;
  end if;
  return null;
end;
$$;

drop trigger if exists signalements_forum_classement on public.signalements;
create trigger signalements_forum_classement
  after update of traite_at on public.signalements
  for each row
  when (new.traite_at is not null and old.traite_at is null)
  execute function public.forum_demasquer_si_classe();


-- ============================================================
--  7. LES PHOTOS
-- ============================================================
--
--  UN BUCKET A PART, ET NON `media`. `media` porte les visuels des
--  marques et des posts, et n'accepte que l'administration. Y ouvrir
--  un prefixe aux membres, c'est parier qu'une regle de chemin ne sera
--  jamais mal ecrite ; ici, au pire, on ne touche qu'au forum.
--
--  Chacun n'ecrit que dans son dossier, `{son identifiant}/…`. Les
--  images sont deja allegees dans le navigateur (voir
--  `alleger-image`) ; la limite de 6 Mo n'est qu'un filet.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forum', 'forum', true, 6291456,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Pas de lecture publique par l'API : le bucket est public, les
-- adresses s'ouvrent sans elle. La regle ci-dessous ne sert qu'a
-- retrouver SES fichiers (le stockage l'exige pour les supprimer).
drop policy if exists "forum : voir ses photos" on storage.objects;
create policy "forum : voir ses photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'forum' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "forum : envoyer une photo" on storage.objects;
create policy "forum : envoyer une photo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'forum' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "forum : supprimer une photo" on storage.objects;
create policy "forum : supprimer une photo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'forum'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );


-- ============================================================
--  VERIFICATION
-- ============================================================

select 'profiles.handle' as quoi,
  case when exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'handle')
  then 'OK' else 'MANQUE' end as etat
union all select 'table forum_annonces',
  case when to_regclass('public.forum_annonces') is not null then 'OK' else 'MANQUE' end
union all select 'table forum_commentaires',
  case when to_regclass('public.forum_commentaires') is not null then 'OK' else 'MANQUE' end
union all select 'tables forum_votes / forum_votes_com',
  case when to_regclass('public.forum_votes') is not null
        and to_regclass('public.forum_votes_com') is not null then 'OK' else 'MANQUE' end
union all select 'fonction forum_fil',
  case when exists (select 1 from pg_proc where proname = 'forum_fil') then 'OK' else 'MANQUE' end
union all select 'signalements.annonce_id',
  case when exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'signalements' and column_name = 'annonce_id')
  then 'OK' else 'MANQUE' end
union all select 'bucket forum',
  case when exists (select 1 from storage.buckets where id = 'forum') then 'OK' else 'MANQUE' end;

-- L'API garde en memoire la liste des colonnes et des fonctions : on
-- la force a relire, sinon le site repondrait « function does not
-- exist » pendant quelques minutes.
notify pgrst, 'reload schema';
