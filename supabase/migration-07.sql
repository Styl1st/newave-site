-- ============================================================
--  MIGRATION 07 — le rôle « créateur »
--
--  A lancer dans le SQL Editor, apres migration-06.sql. Rejouable.
--
--  Trois roles desormais :
--    membre    : lit, met en favori
--    createur  : en plus, gere la ou les marques qui lui sont rattachees
--    admin     : tout
--
--  Le role est une ETIQUETTE, pas un droit. Ce qui autorise reellement
--  a modifier une marque, c'est la ligne dans brand_managers. Un
--  createur sans rattachement ne peut rien toucher, et c'est voulu :
--  on ne veut pas de droits qui survivent a la perte d'une marque.
-- ============================================================

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('membre', 'createur', 'admin'));

-- Rattrapage : toute personne deja gerante d'une marque devient
-- createur, sauf les admins qu'on ne retrograde pas.
update public.profiles p
set role = 'createur'
where p.role = 'membre'
  and exists (select 1 from public.brand_managers m where m.user_id = p.id);

select role, count(*) from public.profiles group by role order by role;
