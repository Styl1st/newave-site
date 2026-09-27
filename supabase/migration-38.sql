-- ============================================================
-- MIGRATION 38 — le forum, lot B : la messagerie privée
-- ============================================================
--
-- A lancer dans le SQL Editor, apres migration-37.sql. Rejouable.
--
-- « Répondre en privé » sur une annonce ouvre une conversation à deux,
-- qui garde l'annonce épinglée en haut. Ce fichier ajoute :
--
--   1. les conversations (deux personnes + une annonce), les messages,
--      ce que chacun a lu, et les blocages ;
--   2. les règles : une conversation ne se lit et ne s'écrit QUE par
--      ses deux participants. L'administration n'y a accès qu'en
--      lecture, et seulement si la conversation a été signalée ;
--   3. les lectures de la boîte (`mes_conversations`) et du compteur
--      de non-lus ;
--   4. une troisième cible pour `signalements` ;
--   5. un bucket PRIVÉ pour les pièces jointes : pas d'adresse publique,
--      des liens signés à durée courte ;
--   6. l'abonnement Realtime sur les messages, pour qu'ils arrivent
--      sans recharger.
-- ============================================================


-- ============================================================
--  1. LES TABLES
-- ============================================================

create table if not exists public.conversations (
  id                  uuid primary key default gen_random_uuid(),
  -- L'annonce d'où elle est née. Si l'annonce est retirée, la
  -- conversation reste (on ne supprime pas l'échange de deux
  -- personnes) et affiche « Annonce retirée ».
  annonce_id          uuid references public.forum_annonces(id) on delete set null,
  -- a : la personne qui a répondu ; b : l'auteur de l'annonce.
  a_id                uuid not null references auth.users(id) on delete cascade,
  b_id                uuid not null references auth.users(id) on delete cascade,
  dernier_message_at  timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint conversations_deux_personnes check (a_id <> b_id)
);

-- UNE conversation par annonce et par paire : relancer « Répondre en
-- privé » rouvre la même, n'en crée pas une deuxième.
create unique index if not exists conversations_une_par_annonce
  on public.conversations (annonce_id, least(a_id, b_id), greatest(a_id, b_id))
  where annonce_id is not null;

create index if not exists conversations_a_idx on public.conversations (a_id, dernier_message_at desc);
create index if not exists conversations_b_idx on public.conversations (b_id, dernier_message_at desc);

create table if not exists public.messages (
  id                   uuid primary key default gen_random_uuid(),
  conversation_id      uuid not null references public.conversations(id) on delete cascade,
  auteur_id            uuid not null references auth.users(id) on delete cascade,
  texte                text not null default '' check (char_length(texte) <= 2000),
  -- Le chemin dans le bucket privé `messages`, jamais une adresse.
  piece_jointe         text,
  piece_jointe_nom     text check (piece_jointe_nom is null or char_length(piece_jointe_nom) <= 120),
  piece_jointe_taille  int check (piece_jointe_taille is null or piece_jointe_taille between 0 and 10485760),
  created_at           timestamptz not null default now(),
  constraint messages_pas_vide check (char_length(trim(texte)) > 0 or piece_jointe is not null)
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- Jusqu'où chacun a lu. Une ligne par personne et par conversation.
create table if not exists public.conversation_lus (
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  lu_at            timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- La colonne de signalement vient ici, avec les tables : la fonction
-- `conversation_signalee` (plus bas) la lit, et Postgres vérifie les
-- colonnes dès la création d'une fonction SQL.
alter table public.signalements
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

create table if not exists public.blocages (
  user_id     uuid not null references auth.users(id) on delete cascade,
  bloque_id   uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, bloque_id),
  constraint blocages_pas_soi check (user_id <> bloque_id)
);


-- ============================================================
--  2. LES FONCTIONS D'AIGUILLAGE
-- ============================================================
--
--  `security definer`, comme `is_admin` : les règles des messages
--  interrogent les conversations, celles des conversations les
--  signalements. Sans ces fonctions, les règles se liraient les unes
--  les autres et tourneraient en rond.

create or replace function public.est_participant(p_conversation uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation and auth.uid() in (c.a_id, c.b_id)
  );
$$;

-- Un blocage vaut dans les deux sens : ni l'un ni l'autre n'écrit plus.
create or replace function public.blocage_entre(x uuid, y uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.blocages b
    where (b.user_id = x and b.bloque_id = y) or (b.user_id = y and b.bloque_id = x)
  );
$$;

-- Participer ET ne pas être bloqué : c'est ce qu'il faut pour écrire.
create or replace function public.peut_ecrire(p_conversation uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation
      and auth.uid() in (c.a_id, c.b_id)
      and not public.blocage_entre(c.a_id, c.b_id)
  );
$$;

-- L'administration ne lit une conversation que si quelqu'un l'a
-- signalée et que le signalement n'est pas encore traité.
create or replace function public.conversation_signalee(p_conversation uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_admin() and exists (
    select 1 from public.signalements s
    where s.conversation_id = p_conversation and s.traite_at is null
  );
$$;


-- ============================================================
--  3. LES GARDE-FOUS
-- ============================================================

-- La conversation : c'est la base qui dit à qui elle s'adresse (l'auteur
-- de l'annonce), pas le navigateur. Et un plafond contre les envois en
-- masse : vingt nouvelles conversations par jour.
create or replace function public.conversations_garde()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  auteur uuid;
begin
  select a.auteur_id into auteur from public.forum_annonces a where a.id = new.annonce_id;
  if auteur is null then
    raise exception 'Cette annonce n''existe plus.';
  end if;
  new.b_id := auteur;
  new.created_at := now();
  new.dernier_message_at := now();

  if not public.is_admin() and (
    select count(*) from public.conversations
    where a_id = new.a_id and created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'Vingt nouvelles conversations par jour au plus. Réessaie demain.';
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_garde on public.conversations;
create trigger conversations_garde
  before insert on public.conversations
  for each row execute function public.conversations_garde();

-- Le message : l'heure est celle de la base, le texte nettoyé, et la
-- pièce jointe forcément rangée dans le dossier de SA conversation et
-- de SON auteur.
create or replace function public.messages_garde()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.created_at := now();
  new.texte := trim(new.texte);
  if new.piece_jointe is not null
     and new.piece_jointe not like new.conversation_id::text || '/' || new.auteur_id::text || '/%' then
    raise exception 'La pièce jointe ne vient pas de cette conversation.';
  end if;

  if not public.is_admin() and (
    select count(*) from public.messages
    where auteur_id = new.auteur_id and created_at > now() - interval '1 hour'
  ) >= 120 then
    raise exception 'Beaucoup de messages en peu de temps. Fais une pause, puis reprends.';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_garde on public.messages;
create trigger messages_garde
  before insert on public.messages
  for each row execute function public.messages_garde();

-- Après l'envoi : la conversation remonte en tête de la boîte, et
-- l'auteur l'a évidemment « lue » jusque-là (un message qu'on vient
-- d'écrire ne se signale pas comme non lu).
create or replace function public.messages_apres()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations set dernier_message_at = new.created_at
  where id = new.conversation_id;

  insert into public.conversation_lus (conversation_id, user_id, lu_at)
  values (new.conversation_id, new.auteur_id, new.created_at)
  on conflict (conversation_id, user_id) do update set lu_at = excluded.lu_at;
  return null;
end;
$$;

drop trigger if exists messages_apres on public.messages;
create trigger messages_apres
  after insert on public.messages
  for each row execute function public.messages_apres();


-- ============================================================
--  4. LES RÈGLES
-- ============================================================

alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.conversation_lus enable row level security;
alter table public.blocages         enable row level security;

-- ---------- conversations ----------
drop policy if exists "messagerie : lire ses conversations" on public.conversations;
create policy "messagerie : lire ses conversations"
  on public.conversations for select
  using (auth.uid() in (a_id, b_id) or public.conversation_signalee(id));

-- On ouvre une conversation en son nom, sur une annonce encore ouverte
-- et visible, avec un pseudo, et sans blocage entre les deux.
drop policy if exists "messagerie : ouvrir une conversation" on public.conversations;
create policy "messagerie : ouvrir une conversation"
  on public.conversations for insert to authenticated
  with check (
    a_id = auth.uid()
    and a_id <> b_id
    and not public.blocage_entre(a_id, b_id)
    and exists (
      select 1 from public.forum_annonces x
      where x.id = annonce_id and not x.cloturee and not x.masque
    )
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.handle is not null)
  );

-- Aucune règle de modification ni de suppression : la date du dernier
-- message est tenue par le déclencheur, et une conversation ne se
-- supprime pas d'un seul côté.

-- ---------- messages ----------
drop policy if exists "messagerie : lire les messages" on public.messages;
create policy "messagerie : lire les messages"
  on public.messages for select
  using (public.est_participant(conversation_id) or public.conversation_signalee(conversation_id));

drop policy if exists "messagerie : écrire" on public.messages;
create policy "messagerie : écrire"
  on public.messages for insert to authenticated
  with check (auteur_id = auth.uid() and public.peut_ecrire(conversation_id));

-- ---------- ce qu'on a lu ----------
drop policy if exists "messagerie : ses lectures" on public.conversation_lus;
create policy "messagerie : ses lectures"
  on public.conversation_lus for select
  using (user_id = auth.uid());

drop policy if exists "messagerie : noter une lecture" on public.conversation_lus;
create policy "messagerie : noter une lecture"
  on public.conversation_lus for insert to authenticated
  with check (user_id = auth.uid() and public.est_participant(conversation_id));

drop policy if exists "messagerie : mettre à jour une lecture" on public.conversation_lus;
create policy "messagerie : mettre à jour une lecture"
  on public.conversation_lus for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.est_participant(conversation_id));

-- ---------- blocages ----------
--  Chacun voit ceux qu'IL a bloqués, jamais qui l'a bloqué : le dire
--  reviendrait à prévenir la personne bloquée.
drop policy if exists "messagerie : ses blocages" on public.blocages;
create policy "messagerie : ses blocages"
  on public.blocages for select using (user_id = auth.uid());

drop policy if exists "messagerie : bloquer" on public.blocages;
create policy "messagerie : bloquer"
  on public.blocages for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "messagerie : débloquer" on public.blocages;
create policy "messagerie : débloquer"
  on public.blocages for delete using (user_id = auth.uid());


-- ============================================================
--  5. LES LECTURES
-- ============================================================

-- ---------- ouvrir (ou rouvrir) ----------
--
--  Renvoie la conversation existante sur cette annonce, ou la crée.
--  Deux clics rapprochés ne font pas deux conversations : l'index
--  unique tranche, et on relit.
create or replace function public.ouvrir_conversation(p_annonce uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  c uuid;
begin
  select id into c from public.conversations
  where annonce_id = p_annonce and auth.uid() in (a_id, b_id)
  limit 1;
  if c is not null then
    return c;
  end if;

  insert into public.conversations (annonce_id, a_id, b_id)
  values (p_annonce, auth.uid(), auth.uid())  -- b_id est remplacé par l'auteur, voir `conversations_garde`
  on conflict (annonce_id, least(a_id, b_id), greatest(a_id, b_id)) where annonce_id is not null
  do nothing
  returning id into c;

  if c is null then
    select id into c from public.conversations
    where annonce_id = p_annonce and auth.uid() in (a_id, b_id)
    limit 1;
  end if;
  return c;
end;
$$;

grant execute on function public.ouvrir_conversation(uuid) to authenticated;

-- ---------- la boîte ----------
--
--  Une ligne par conversation qui a au moins un message : l'autre
--  personne, l'annonce, le dernier message, et si c'est non lu.
--
--  NON LU = le dernier message n'est pas de moi ET je ne l'ai pas
--  encore vu. Une conversation dont le dernier message est le mien
--  n'est jamais « non lue ».
create or replace function public.mes_conversations()
returns table (
  id                   uuid,
  annonce_id           uuid,
  annonce_titre        text,
  annonce_rubrique     text,
  annonce_ville        text,
  annonce_cloturee     boolean,
  annonce_image        text,
  annonce_auteur_id    uuid,
  annonce_marque_nom   text,
  autre_id             uuid,
  autre_handle         text,
  autre_nom            text,
  autre_avatar         text,
  mon_annonce          boolean,
  dernier_texte        text,
  dernier_auteur_id    uuid,
  dernier_piece_nom    text,
  dernier_at           timestamptz,
  non_lu               boolean,
  bloquee              boolean,
  je_bloque            boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.annonce_id,
    x.titre,
    x.rubrique,
    x.ville,
    coalesce(x.cloturee, false),
    x.images[1],
    x.auteur_id,
    br.name,
    autre.id,
    m.handle,
    m.nom,
    m.avatar_url,
    c.b_id = auth.uid(),
    left(d.texte, 160),
    d.auteur_id,
    d.piece_jointe_nom,
    d.created_at,
    d.auteur_id <> auth.uid() and (l.lu_at is null or l.lu_at < d.created_at),
    public.blocage_entre(c.a_id, c.b_id),
    exists (select 1 from public.blocages b where b.user_id = auth.uid() and b.bloque_id = autre.id)
  from public.conversations c
  cross join lateral (
    select case when c.a_id = auth.uid() then c.b_id else c.a_id end as id
  ) autre
  join lateral (
    select mm.texte, mm.auteur_id, mm.piece_jointe_nom, mm.created_at
    from public.messages mm
    where mm.conversation_id = c.id
    order by mm.created_at desc
    limit 1
  ) d on true
  left join public.forum_annonces x on x.id = c.annonce_id
  left join public.brands br on br.id = x.marque_id
  left join public.forum_membres m on m.id = autre.id
  left join public.conversation_lus l on l.conversation_id = c.id and l.user_id = auth.uid()
  where auth.uid() in (c.a_id, c.b_id)
  order by c.dernier_message_at desc
  limit 200;
$$;

grant execute on function public.mes_conversations() to authenticated;

-- ---------- la pastille ----------
create or replace function public.messages_non_lus()
returns int
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int
  from public.conversations c
  join lateral (
    select mm.auteur_id, mm.created_at from public.messages mm
    where mm.conversation_id = c.id
    order by mm.created_at desc
    limit 1
  ) d on true
  left join public.conversation_lus l on l.conversation_id = c.id and l.user_id = auth.uid()
  where auth.uid() in (c.a_id, c.b_id)
    and d.auteur_id <> auth.uid()
    and (l.lu_at is null or l.lu_at < d.created_at);
$$;

grant execute on function public.messages_non_lus() to authenticated;


-- ============================================================
--  6. LES SIGNALEMENTS
-- ============================================================

-- La colonne `conversation_id` est ajoutée plus haut, avec les tables.
alter table public.signalements
  drop constraint if exists signalements_une_seule_cible,
  add constraint signalements_une_seule_cible
    check (num_nonnulls(review_id, product_id, brand_id, annonce_id, commentaire_id, conversation_id) = 1);

create unique index if not exists signalements_par_conversation
  on public.signalements (user_id, conversation_id) where conversation_id is not null;


-- ============================================================
--  7. LES PIÈCES JOINTES
-- ============================================================
--
--  UN BUCKET PRIVÉ. Un book, un devis, une pièce d'identité envoyée par
--  erreur : rien de ce qui passe ici ne doit avoir une adresse qui
--  s'ouvre pour qui la trouve. On lit par des liens signés, valables
--  quelques minutes, que seuls les deux participants peuvent obtenir.
--
--  Rangement : `{conversation}/{auteur}/{fichier}`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('messages', 'messages', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Le premier dossier d'un chemin, en identifiant de conversation, ou
-- null si ce n'en est pas un (un chemin fabriqué à la main ne doit pas
-- faire échouer la règle, seulement la refuser).
create or replace function public.conversation_du_chemin(nom text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(nom, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(nom, '/', 1)::uuid
  end;
$$;

drop policy if exists "messagerie : joindre un fichier" on storage.objects;
create policy "messagerie : joindre un fichier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'messages'
    and split_part(name, '/', 2) = auth.uid()::text
    and public.peut_ecrire(public.conversation_du_chemin(name))
  );

drop policy if exists "messagerie : lire une pièce jointe" on storage.objects;
create policy "messagerie : lire une pièce jointe"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'messages'
    and (
      public.est_participant(public.conversation_du_chemin(name))
      or public.conversation_signalee(public.conversation_du_chemin(name))
    )
  );


-- ============================================================
--  8. LE TEMPS RÉEL
-- ============================================================
--
--  Les messages sont publiés sur le canal Realtime de Supabase : la
--  conversation ouverte les reçoit sans recharger. Les règles de
--  lecture ci-dessus s'appliquent aussi là : on ne reçoit que les
--  messages de ses propres conversations.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;


-- ============================================================
--  VERIFICATION
-- ============================================================

select 'table conversations' as quoi,
  case when to_regclass('public.conversations') is not null then 'OK' else 'MANQUE' end as etat
union all select 'table messages',
  case when to_regclass('public.messages') is not null then 'OK' else 'MANQUE' end
union all select 'fonction mes_conversations',
  case when exists (select 1 from pg_proc where proname = 'mes_conversations') then 'OK' else 'MANQUE' end
union all select 'signalements.conversation_id',
  case when exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'signalements' and column_name = 'conversation_id')
  then 'OK' else 'MANQUE' end
union all select 'bucket messages (privé)',
  case when exists (select 1 from storage.buckets where id = 'messages' and not public) then 'OK' else 'MANQUE' end
union all select 'messages dans Realtime',
  case when exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages') then 'OK' else 'MANQUE' end;

notify pgrst, 'reload schema';
