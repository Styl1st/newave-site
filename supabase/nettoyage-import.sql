-- =====================================================================
--  NETTOYAGE DE L'IMPORT DE BASE
--
--  À coller dans Supabase, onglet SQL Editor.
--
--  Le fichier est en deux temps, et c'est volontaire : on REGARDE
--  d'abord, on supprime ensuite. Une suppression ne se défait pas,
--  alors qu'une relecture coûte trente secondes.
--
--  Les deux blocs sont indépendants : chacun se lance seul, en le
--  sélectionnant entièrement avant de cliquer sur Run.
-- =====================================================================


-- =====================================================================
--  ÉTAPE 1 : REGARDER
--
--  Sélectionne tout ce bloc, du « with » au point-virgule, et lance-le.
--  Chaque ligne du résultat est une marque qui disparaîtra, avec le
--  nombre de pièces qui partiront avec elle. Si une marque à toi
--  apparaît dans cette liste, arrête-toi et dis-le-moi.
-- =====================================================================
with importees (slug) as (values
  ('04lowlife'),               -- 04lowlife
  ('ala-tianan'),              -- ALA TIANAN
  ('alexander-spade'),         -- Alexander Spade
  ('beauzile'),                -- Beauzile
  ('betterme-studios'),        -- Betterme.studios
  ('celyne'),                  -- Celÿne
  ('cloud'),                   -- cloud
  ('crayonne'),                -- Crayonné
  ('customize509'),            -- Customize509
  ('d5ove'),                   -- D5OVE
  ('divice'),                  -- DIVICE
  ('double-crazy'),            -- Double crazy
  ('engineered-by-aryes'),     -- ENGINEERED BY ARYES
  ('eudi'),                    -- Eudi
  ('eye-of-the-storm'),        -- Eye of the storm
  ('family3-0'),               -- FAMILY3.0
  ('full-chaos'),              -- Full Chaos
  ('gained-not-given'),        -- Gained Not Given
  ('goodlou'),                 -- GoodLou
  ('holy-headen'),             -- Holy headen
  ('huni'),                    -- HUNI
  ('ikiway'),                  -- IKIWAY
  ('inflorescence-clo'),       -- inflorescence.clo
  ('insecure'),                -- Insecure
  ('kidsaint'),                -- Kidsaint
  ('pollen-fabrics'),          -- Pollen Fabrics
  ('krux-lavarta'),            -- Krux Lavarta
  ('kulture'),                 -- Kulture
  ('lior-blaq'),               -- Lior blaq
  ('logos-by-berlin'),         -- Logos by Berlin
  ('maison-acb'),              -- Maison ACB
  ('maison-de-cozy'),          -- Maison de cozy
  ('medusaboutik'),            -- Medusaboutik
  ('ncapped'),                 -- Ncapped
  ('nolannfringue'),           -- nolannfringue
  ('nostalgique-nightmares'),  -- Nostalgique nightmares
  ('nuit-d-ete'),              -- NUIT D’ÉTÉ
  ('oill'),                    -- OILL
  ('old-time-fever'),          -- OLD TIME FEVER
  ('ongnastudios'),            -- ongnastudios
  ('paranoid-syrange'),        -- Paranoid syrange
  ('personsoul'),              -- PERSONSOUL
  ('petale-de-l-ame'),         -- Pétale de l’âme
  ('phtmne'),                  -- Phtmne
  ('pointer-brand'),           -- Pointer brand
  ('projectisr'),              -- PROJECTISR
  ('protemoa'),                -- PROTÉMOA
  ('silentbleed'),             -- SilentBleed
  ('smnrffice'),               -- Smnrffice
  ('state-of-self-apparel'),   -- State.of.self.apparel
  ('supraw'),                  -- supraw
  ('innor'),                   -- INNOR
  ('moja-clothing'),           -- MOJA CLOTHING
  ('aamil'),                   -- AAMIL
  ('notifhcity'),              -- notifhcity
  ('hod'),                     -- HOD
  ('wick'),                    -- WICK
  ('flowz'),                   -- FLOWZ
  ('4weeks-collection'),       -- 4Weeks Collection
  ('7agapao'),                 -- 7AGAPAO
  ('adma'),                    -- ADMA
  ('artifice'),                -- Artifice.
  ('veesclothing'),            -- VeesClothing
  ('howss'),                   -- HOWSS
  ('sxeppa'),                  -- Sxeppa
  ('syxed'),                   -- Syxed
  ('triple-sphere'),           -- Triple sphere
  ('v2byvelare'),              -- v2byvelare
  ('vanden-paris'),            -- vanden.paris
  ('wessence'),                -- Wessence
  ('whodaatboi'),              -- Whodaatboi
  ('your-cult'),               -- Your cult
  ('yyildiz'),                 -- Yyildiz
  ('zizou'),                   -- Zizou
  ('zoav'),                    -- ZOAV
  ('peoplesense'),             -- PEOPLESENSE
  ('doomed-blxssm'),           -- doomed.blxssm
  ('2-visages')                -- 2.visages
)
select
  b.name                                                    as marque,
  b.slug,
  coalesce(b.shop_url, b.website_url, '(aucune)')           as boutique,
  (select count(*) from products p where p.brand_id = b.id) as pieces
from brands b
where
    -- Trois garde-fous, et il faut les trois.
    --
    -- Le nom vient du fichier : une marque que tu as saisie toi-même
    -- n'est pas concernée, même si elle lui ressemble.
    b.slug in (select slug from importees)
    -- Elle est restée en brouillon : ce que tu as publié reste en ligne.
    and b.status = 'draft'
    -- Personne ne la gère : si un fondateur a réclamé sa page entre-temps,
    -- on ne la lui retire pas.
    and not exists (select 1 from brand_managers m where m.brand_id = b.id)
order by b.name;


-- =====================================================================
--  ÉTAPE 2 : SUPPRIMER
--
--  À ne lancer qu'après avoir relu la liste ci-dessus. Sélectionne
--  tout ce bloc et exécute-le d'un coup.
--
--  Les pièces partent avant les marques : selon la façon dont la clé
--  étrangère est déclarée, supprimer une marque qui porte encore des
--  pièces échouerait.
--
--  Le tout est dans une transaction. Si le compte final ne te convient
--  pas, remplace « commit » par « rollback » et relance : rien n'aura
--  été touché.
-- =====================================================================
begin;

with importees (slug) as (values
  ('04lowlife'),               -- 04lowlife
  ('ala-tianan'),              -- ALA TIANAN
  ('alexander-spade'),         -- Alexander Spade
  ('beauzile'),                -- Beauzile
  ('betterme-studios'),        -- Betterme.studios
  ('celyne'),                  -- Celÿne
  ('cloud'),                   -- cloud
  ('crayonne'),                -- Crayonné
  ('customize509'),            -- Customize509
  ('d5ove'),                   -- D5OVE
  ('divice'),                  -- DIVICE
  ('double-crazy'),            -- Double crazy
  ('engineered-by-aryes'),     -- ENGINEERED BY ARYES
  ('eudi'),                    -- Eudi
  ('eye-of-the-storm'),        -- Eye of the storm
  ('family3-0'),               -- FAMILY3.0
  ('full-chaos'),              -- Full Chaos
  ('gained-not-given'),        -- Gained Not Given
  ('goodlou'),                 -- GoodLou
  ('holy-headen'),             -- Holy headen
  ('huni'),                    -- HUNI
  ('ikiway'),                  -- IKIWAY
  ('inflorescence-clo'),       -- inflorescence.clo
  ('insecure'),                -- Insecure
  ('kidsaint'),                -- Kidsaint
  ('pollen-fabrics'),          -- Pollen Fabrics
  ('krux-lavarta'),            -- Krux Lavarta
  ('kulture'),                 -- Kulture
  ('lior-blaq'),               -- Lior blaq
  ('logos-by-berlin'),         -- Logos by Berlin
  ('maison-acb'),              -- Maison ACB
  ('maison-de-cozy'),          -- Maison de cozy
  ('medusaboutik'),            -- Medusaboutik
  ('ncapped'),                 -- Ncapped
  ('nolannfringue'),           -- nolannfringue
  ('nostalgique-nightmares'),  -- Nostalgique nightmares
  ('nuit-d-ete'),              -- NUIT D’ÉTÉ
  ('oill'),                    -- OILL
  ('old-time-fever'),          -- OLD TIME FEVER
  ('ongnastudios'),            -- ongnastudios
  ('paranoid-syrange'),        -- Paranoid syrange
  ('personsoul'),              -- PERSONSOUL
  ('petale-de-l-ame'),         -- Pétale de l’âme
  ('phtmne'),                  -- Phtmne
  ('pointer-brand'),           -- Pointer brand
  ('projectisr'),              -- PROJECTISR
  ('protemoa'),                -- PROTÉMOA
  ('silentbleed'),             -- SilentBleed
  ('smnrffice'),               -- Smnrffice
  ('state-of-self-apparel'),   -- State.of.self.apparel
  ('supraw'),                  -- supraw
  ('innor'),                   -- INNOR
  ('moja-clothing'),           -- MOJA CLOTHING
  ('aamil'),                   -- AAMIL
  ('notifhcity'),              -- notifhcity
  ('hod'),                     -- HOD
  ('wick'),                    -- WICK
  ('flowz'),                   -- FLOWZ
  ('4weeks-collection'),       -- 4Weeks Collection
  ('7agapao'),                 -- 7AGAPAO
  ('adma'),                    -- ADMA
  ('artifice'),                -- Artifice.
  ('veesclothing'),            -- VeesClothing
  ('howss'),                   -- HOWSS
  ('sxeppa'),                  -- Sxeppa
  ('syxed'),                   -- Syxed
  ('triple-sphere'),           -- Triple sphere
  ('v2byvelare'),              -- v2byvelare
  ('vanden-paris'),            -- vanden.paris
  ('wessence'),                -- Wessence
  ('whodaatboi'),              -- Whodaatboi
  ('your-cult'),               -- Your cult
  ('yyildiz'),                 -- Yyildiz
  ('zizou'),                   -- Zizou
  ('zoav'),                    -- ZOAV
  ('peoplesense'),             -- PEOPLESENSE
  ('doomed-blxssm'),           -- doomed.blxssm
  ('2-visages')                -- 2.visages
),
visees as (
  select b.id
  from brands b
  where
    -- Trois garde-fous, et il faut les trois.
    --
    -- Le nom vient du fichier : une marque que tu as saisie toi-même
    -- n'est pas concernée, même si elle lui ressemble.
    b.slug in (select slug from importees)
    -- Elle est restée en brouillon : ce que tu as publié reste en ligne.
    and b.status = 'draft'
    -- Personne ne la gère : si un fondateur a réclamé sa page entre-temps,
    -- on ne la lui retire pas.
    and not exists (select 1 from brand_managers m where m.brand_id = b.id)
)
delete from products
 where brand_id in (select id from visees);

with importees (slug) as (values
  ('04lowlife'),               -- 04lowlife
  ('ala-tianan'),              -- ALA TIANAN
  ('alexander-spade'),         -- Alexander Spade
  ('beauzile'),                -- Beauzile
  ('betterme-studios'),        -- Betterme.studios
  ('celyne'),                  -- Celÿne
  ('cloud'),                   -- cloud
  ('crayonne'),                -- Crayonné
  ('customize509'),            -- Customize509
  ('d5ove'),                   -- D5OVE
  ('divice'),                  -- DIVICE
  ('double-crazy'),            -- Double crazy
  ('engineered-by-aryes'),     -- ENGINEERED BY ARYES
  ('eudi'),                    -- Eudi
  ('eye-of-the-storm'),        -- Eye of the storm
  ('family3-0'),               -- FAMILY3.0
  ('full-chaos'),              -- Full Chaos
  ('gained-not-given'),        -- Gained Not Given
  ('goodlou'),                 -- GoodLou
  ('holy-headen'),             -- Holy headen
  ('huni'),                    -- HUNI
  ('ikiway'),                  -- IKIWAY
  ('inflorescence-clo'),       -- inflorescence.clo
  ('insecure'),                -- Insecure
  ('kidsaint'),                -- Kidsaint
  ('pollen-fabrics'),          -- Pollen Fabrics
  ('krux-lavarta'),            -- Krux Lavarta
  ('kulture'),                 -- Kulture
  ('lior-blaq'),               -- Lior blaq
  ('logos-by-berlin'),         -- Logos by Berlin
  ('maison-acb'),              -- Maison ACB
  ('maison-de-cozy'),          -- Maison de cozy
  ('medusaboutik'),            -- Medusaboutik
  ('ncapped'),                 -- Ncapped
  ('nolannfringue'),           -- nolannfringue
  ('nostalgique-nightmares'),  -- Nostalgique nightmares
  ('nuit-d-ete'),              -- NUIT D’ÉTÉ
  ('oill'),                    -- OILL
  ('old-time-fever'),          -- OLD TIME FEVER
  ('ongnastudios'),            -- ongnastudios
  ('paranoid-syrange'),        -- Paranoid syrange
  ('personsoul'),              -- PERSONSOUL
  ('petale-de-l-ame'),         -- Pétale de l’âme
  ('phtmne'),                  -- Phtmne
  ('pointer-brand'),           -- Pointer brand
  ('projectisr'),              -- PROJECTISR
  ('protemoa'),                -- PROTÉMOA
  ('silentbleed'),             -- SilentBleed
  ('smnrffice'),               -- Smnrffice
  ('state-of-self-apparel'),   -- State.of.self.apparel
  ('supraw'),                  -- supraw
  ('innor'),                   -- INNOR
  ('moja-clothing'),           -- MOJA CLOTHING
  ('aamil'),                   -- AAMIL
  ('notifhcity'),              -- notifhcity
  ('hod'),                     -- HOD
  ('wick'),                    -- WICK
  ('flowz'),                   -- FLOWZ
  ('4weeks-collection'),       -- 4Weeks Collection
  ('7agapao'),                 -- 7AGAPAO
  ('adma'),                    -- ADMA
  ('artifice'),                -- Artifice.
  ('veesclothing'),            -- VeesClothing
  ('howss'),                   -- HOWSS
  ('sxeppa'),                  -- Sxeppa
  ('syxed'),                   -- Syxed
  ('triple-sphere'),           -- Triple sphere
  ('v2byvelare'),              -- v2byvelare
  ('vanden-paris'),            -- vanden.paris
  ('wessence'),                -- Wessence
  ('whodaatboi'),              -- Whodaatboi
  ('your-cult'),               -- Your cult
  ('yyildiz'),                 -- Yyildiz
  ('zizou'),                   -- Zizou
  ('zoav'),                    -- ZOAV
  ('peoplesense'),             -- PEOPLESENSE
  ('doomed-blxssm'),           -- doomed.blxssm
  ('2-visages')                -- 2.visages
)
delete from brands b
where
    -- Trois garde-fous, et il faut les trois.
    --
    -- Le nom vient du fichier : une marque que tu as saisie toi-même
    -- n'est pas concernée, même si elle lui ressemble.
    b.slug in (select slug from importees)
    -- Elle est restée en brouillon : ce que tu as publié reste en ligne.
    and b.status = 'draft'
    -- Personne ne la gère : si un fondateur a réclamé sa page entre-temps,
    -- on ne la lui retire pas.
    and not exists (select 1 from brand_managers m where m.brand_id = b.id);

commit;
