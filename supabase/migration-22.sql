-- ============================================================
-- migration 22 — la note d'une marque tient compte de ses pieces
-- ============================================================
--
-- Un avis depose sur une piece ne remontait nulle part. Une marque
-- dont les quinze pieces sont notees cinq etoiles n'affichait aucune
-- note, tant que personne n'avait note LA MARQUE elle-meme.
--
-- C'est contre-intuitif, et c'est surtout injuste : on note ce qu'on a
-- achete, c'est-a-dire une piece. Exiger en plus un avis sur l'entite
-- abstraite qu'est la marque revient a ne jamais rien afficher.
--
-- La vue rattache donc chaque avis a une marque : directement quand il
-- la vise, par la piece sinon. Rien d'autre ne change : les colonnes
-- gardent leurs noms, et tout ce qui lit cette vue continue de
-- fonctionner sans modification.
--
-- A passer dans l'editeur SQL de Supabase.

create or replace view public.brand_ratings as
with rattaches as (
  -- Un avis vise soit une marque, soit une piece : jamais les deux, la
  -- contrainte reviews_une_seule_cible s'en assure. `coalesce` choisit
  -- donc simplement celui des deux qui est renseigne.
  select coalesce(r.brand_id, p.brand_id) as brand_id, r.note
  from public.reviews r
  left join public.products p on p.id = r.product_id
)
select
  brand_id,
  round(avg(note))::int as note_moyenne,
  count(*)::int         as avis
from rattaches
where brand_id is not null
group by brand_id;

grant select on public.brand_ratings to anon, authenticated;

comment on view public.brand_ratings is
  'Note moyenne d''une marque : ses propres avis ET ceux de ses pieces.';

-- ---------- verification ----------
-- select b.name, r.note_moyenne, r.avis
-- from public.brand_ratings r join public.brands b on b.id = r.brand_id
-- order by r.avis desc limit 10;
