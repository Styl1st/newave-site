-- ============================================================
--  DIAGNOSTIC — pourquoi une piece n'apparait pas sur le site
--
--  A lancer dans le SQL Editor. Ne modifie rien, lit seulement.
-- ============================================================

-- Pour qu'une piece s'affiche publiquement, TROIS conditions :
--   1. la piece est en 'published'
--   2. SA MARQUE est en 'published'
--   3. la piece est bien rattachee a la marque que tu regardes
--
-- La colonne "verdict" te dit laquelle manque.

select
  b.name    as marque,
  b.slug,
  b.status  as statut_marque,
  p.name    as piece,
  p.status  as statut_piece,
  case
    when b.status <> 'published' then 'La MARQUE est en brouillon'
    when p.status <> 'published' then 'La PIECE est en brouillon'
    else 'Visible'
  end as verdict
from public.products p
join public.brands b on b.id = p.brand_id
order by b.name, p.position, p.name;

-- Compte rapide par marque.
select
  b.name as marque,
  b.status as statut_marque,
  count(*) filter (where p.status = 'published') as pieces_publiees,
  count(*) filter (where p.status = 'draft')     as pieces_brouillon
from public.brands b
left join public.products p on p.brand_id = b.id
group by b.name, b.status
order by b.name;
