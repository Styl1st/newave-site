-- ============================================================
-- MIGRATION 31 — compter les pièces sans les rapatrier
-- ============================================================
--
-- La vitrine annonçait « 983 pièces » alors que le site en porte des
-- milliers. Ce n'était pas un compteur en panne : `getVitrine()` prend
-- au plus dix pièces par marque, et la page comptait ce qu'elle avait
-- sous la main. Le vrai total ne peut pas se compter côté site — il
-- faudrait descendre chaque ligne pour les additionner, et PostgREST
-- s'arrête de toute façon à mille.
--
-- CE QUE FAIT CETTE FONCTION, ET POURQUOI ELLE EST LA SEULE FAÇON.
-- Compter par rayon demande de savoir dans quel rayon range une pièce,
-- or `categories` est un tableau : une pièce peut porter « Hauts » et
-- « Maille », et le site n'en retient qu'un — LE PREMIER de la liste
-- (voir `rayonDe` dans `lib/rayons.ts`). Huit comptages indépendants
-- « combien contiennent Hauts ? » compteraient cette pièce deux fois,
-- et la somme des rayons dépasserait le total. Il faut donc choisir le
-- rayon AVANT de grouper, ce que seul Postgres peut faire sur la table
-- entière.
--
-- ⚠️ LA LISTE DES RAYONS EST UN ARGUMENT, ELLE N'EST PAS ÉCRITE ICI.
-- Elle vit dans `lib/taxonomy.ts` et nulle part ailleurs. Recopiée dans
-- cette fonction, elle aurait été une seconde définition de la
-- taxonomie : le jour où un rayon s'ajoute, la page l'afficherait et le
-- comptage l'ignorerait, en le rangeant silencieusement dans « Autres ».
-- L'appelant passe donc sa propre liste, et les deux ne peuvent pas
-- diverger.
--
-- `with ordinality` N'EST PAS UNE COQUETTERIE. `unnest` ne promet aucun
-- ordre : sans le rang, « le premier rayon de la liste » deviendrait
-- « un rayon au hasard parmi ceux qui correspondent », et une pièce
-- changerait de colonne d'un rafraîchissement à l'autre. C'est le même
-- soin que l'ordre total demandé aux lectures par tranches.
--
-- CE QU'ELLE COMPTE : les pièces publiées, encore en vente, des marques
-- publiées. Ni plus ni moins que ce que l'annuaire montre. Elle ne
-- filtre pas sur la présence d'une photo : ce tri-là est fait par
-- `aUneIllustration`, en JavaScript, et le redire en SQL serait une
-- deuxième définition de plus.
--
-- `security definer` : même raison que `brand_favorite_counts`, il ne
-- sort que des nombres, jamais une ligne.
-- ------------------------------------------------------------

create or replace function public.compter_les_rayons(p_rayons text[])
returns table (rayon text, total int)
language sql
security definer
set search_path = public
stable
as $$
  select x.rayon, count(*)::int as total
  from (
    select (
      select c
      from unnest(p.categories) with ordinality as u(c, rang)
      where c = any (p_rayons)
      order by u.rang
      limit 1
    ) as rayon
    from public.products p
    join public.brands b on b.id = p.brand_id
    where p.status = 'published'
      and p.retired_at is null
      and b.status = 'published'
  ) x
  group by x.rayon
  order by count(*) desc;
$$;

comment on function public.compter_les_rayons(text[]) is
  'Compte les pieces publiees et en vente, par rayon. Le rayon retenu est le premier de `categories` qui figure dans la liste passee en argument ; NULL pour celles qui n''en portent aucun (« Autres » cote site). Ne rend que des nombres.';

grant execute on function public.compter_les_rayons(text[]) to anon, authenticated;

-- Le groupement lit `categories` sur toute la table : l'index GIN
-- n'accélère pas un `group by`, mais il sert déjà aux recherches par
-- rayon et coûte peu. On s'assure qu'il existe.
create index if not exists products_categories_idx
  on public.products using gin (categories);
