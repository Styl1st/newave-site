"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { annoncer } from "@/components/Confirmations";
import BarreEnregistrement from "@/components/editeur/BarreEnregistrement";
import { saveBrandPresentation } from "@/app/espace-marque/actions";
import { doitAvoirDesPieces } from "@/lib/acces";
import FeuilleRetouche from "./FeuilleRetouche";
import RailRetouche from "./RailRetouche";
import { FournisseurRetouche, type Retouche } from "./ContexteRetouche";
import {
  brouillonDuServeur,
  champsModifies,
  enFormData,
  normalise,
  type Brouillon,
  type ChampBrouillon,
} from "./brouillon";
import { MOTS, type Voix } from "./mots";
import { SCENE } from "./apparence";
import type { Brand } from "@/lib/types";

/**
 * La scène de la retouche : la page, plus l'état qui la rend modifiable.
 *
 * ELLE ENVELOPPE TOUTE LA FICHE, y compris ce que le serveur a rendu.
 * Les blocs modifiables sont éparpillés — l'accroche dans l'en-tête, la
 * démarche et les métadonnées dans le bloc de verre — et ils partagent
 * un seul brouillon : il fallait un ancêtre commun. Les enfants
 * traversent ce composant sans devenir des composants client pour
 * autant ; ils restent rendus par le serveur, et seuls les quelques
 * blocs qui s'éditent sont, eux, du code client.
 *
 * QUI NE VOIT RIEN DE TOUT ÇA : les visiteurs. `/marques/[slug]` ne
 * monte cette scène que lorsque `getCatalogueInsight` a répondu — ce
 * qu'elle ne fait qu'à un gérant ou à un administrateur, après avoir
 * relu la base. Pour tous les autres, la page rend son propre balisage
 * et pas une ligne de ce dossier ne part dans le navigateur.
 *
 * LA MISE EN PAGE NE REMONTE PAS LA FICHE. Entrer en retouche change
 * deux classes sur un conteneur, pas la forme de l'arbre : le calque
 * intermédiaire est en `display:contents` hors retouche, donc invisible
 * pour la mise en page. Sans cette précaution, chaque aller-retour
 * démonterait toute la page — vidéos relancées, filtre de rayon perdu,
 * favori remis à zéro le temps d'un aller-retour au serveur.
 *
 * ON N'ENREGISTRE PAS EN SORTANT. Quitter la retouche avec des
 * modifications ne les jette pas et ne les envoie pas : elles restent au
 * brouillon, la page continue de les afficher, et la barre du bas
 * continue de dire qu'il y a quelque chose à faire. C'est la seule
 * réponse honnête — jeter le travail de quelqu'un parce qu'il a cliqué
 * sur « Quitter » serait une punition, et l'enregistrer à sa place
 * reviendrait à publier une phrase qu'il n'a pas fini d'écrire.
 */
export default function SceneRetouche({
  brand,
  pieces,
  voix,
  children,
}: {
  brand: Brand;
  /** Combien de pièces au catalogue, brouillons compris. */
  pieces: number;
  /** Les mots, et rien d'autre. Voir `mots.ts`. */
  voix: Voix;
  children: React.ReactNode;
}) {
  const router = useRouter();

  /*
   * L'état de départ, celui que le serveur vient d'envoyer. Il change à
   * chaque fois que la page revient du serveur — après un
   * enregistrement, par exemple.
   */
  const initiales = useMemo(() => brouillonDuServeur(brand), [brand]);

  /** Ce qu'on croit être en base. C'est à lui qu'on compare. */
  const [enBase, setEnBase] = useState(initiales);
  const enBaseVif = useRef(initiales);
  const [brouillon, setBrouillon] = useState(initiales);

  const [actif, setActif] = useState(false);
  const [champOuvert, setChampOuvert] = useState<ChampBrouillon | null>(null);
  const [feuille, setFeuille] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [etroit, setEtroit] = useState(false);

  const modifications = champsModifies(enBase, brouillon);

  /*
   * Le serveur a parlé : c'est lui qui a raison.
   *
   * Mais pas au point d'écraser ce qu'on est en train d'écrire. Une
   * page peut revenir du serveur pendant qu'on retouche — un autre
   * onglet, une relecture de catalogue — et reposer alors l'ancienne
   * accroche par-dessus la nouvelle serait le pire de tous les bugs :
   * silencieux, et à la frappe près.
   */
  useEffect(() => {
    const precedent = enBaseVif.current;
    enBaseVif.current = initiales;
    setEnBase(initiales);
    setBrouillon((courant) => (champsModifies(courant, precedent) === 0 ? initiales : courant));
  }, [initiales]);

  /*
   * L'écran étroit se demande au navigateur, pas au premier rendu : le
   * serveur ne connaît pas la largeur de l'écran, et deviner ferait
   * diverger le HTML rendu de celui qu'attend le navigateur.
   */
  useEffect(() => {
    const requete = window.matchMedia("(max-width: 639px)");
    const suivre = () => setEtroit(requete.matches);
    suivre();
    requete.addEventListener("change", suivre);
    return () => requete.removeEventListener("change", suivre);
  }, []);

  const definir = useCallback(
    <C extends ChampBrouillon>(champ: C, valeur: Brouillon[C]) => {
      setBrouillon((courant) => ({ ...courant, [champ]: valeur }) as Brouillon);
    },
    []
  );

  const enregistrer = useCallback(async () => {
    setEnCours(true);

    /*
     * On envoie la version normalisée, et c'est elle qu'on garde comme
     * référence : `saveBrandPresentation` coupe les blancs et repose ses
     * valeurs par défaut, donc c'est ELLE qui se retrouve en base. Sans
     * ça, un espace en fin de phrase suffirait à laisser la barre
     * « une modification non enregistrée » après un enregistrement
     * parfaitement abouti.
     */
    const envoye = normalise(brouillon);
    const resultat = await saveBrandPresentation(enFormData(envoye, brand.slug));
    setEnCours(false);

    if (!resultat.ok) {
      annoncer(resultat.error ?? "L'enregistrement n'est pas passé.", "erreur");
      return;
    }

    enBaseVif.current = envoye;
    setEnBase(envoye);
    setBrouillon(envoye);
    setChampOuvert(null);
    annoncer(MOTS[voix].enregistre);
    router.refresh();
  }, [brand.slug, brouillon, router, voix]);

  const annulerTout = useCallback(() => {
    setBrouillon(enBaseVif.current);
    setChampOuvert(null);
  }, []);

  const ouvrir = useCallback(
    (champ: ChampBrouillon) => {
      setChampOuvert(champ);
      // C'est ici, et nulle part ailleurs, que se décide l'édition en
      // place ou la feuille : les blocs de la page disent seulement quel
      // champ on vient de toucher.
      if (etroit) setFeuille(true);
    },
    [etroit]
  );

  const valeur: Retouche = {
    actif,
    entrer: () => {
      setActif(true);
      // Au doigt, la retouche EST la feuille : entrer sans l'ouvrir
      // laisserait devant une page qui a l'air normale.
      if (etroit) setFeuille(true);
    },
    sortir: () => {
      setActif(false);
      setChampOuvert(null);
      setFeuille(false);
    },
    voix,
    mots: MOTS[voix],
    slug: brand.slug,
    nom: brand.name,
    pieces,
    /*
     * L'adresse vient du BROUILLON : coller celle de sa boutique doit
     * faire réagir la check-list tout de suite, sans passer par un
     * enregistrement. `website_url` et « comment on achète », eux, ne se
     * modifient pas ici et restent ceux de la base.
     */
    exigeDesPieces: doitAvoirDesPieces({
      shop_url: brouillon.shop_url,
      website_url: brand.website_url,
      acces: brand.acces,
    }),
    brouillon,
    definir,
    modifications,
    enCours,
    enregistrer: () => void enregistrer(),
    annulerTout,
    champOuvert,
    ouvrir,
    fermer: () => setChampOuvert(null),
    feuille,
    ouvrirFeuille: (champ) => {
      setChampOuvert(champ ?? null);
      setFeuille(true);
    },
    fermerFeuille: () => {
      setFeuille(false);
      setChampOuvert(null);
    },
    etroit,
  };

  return (
    <FournisseurRetouche value={valeur}>
      <div
        className={
          actif
            ? "mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-7 px-[var(--pad)] py-7 sm:py-11 xl:grid-cols-[minmax(0,1fr)_300px]"
            : SCENE
        }
      >
        {/* Hors retouche, ce calque n'existe pas pour la mise en page :
            la fiche retrouve exactement la colonne du visiteur. */}
        <div className={actif ? "min-w-0" : "contents"}>{children}</div>
        {actif && <RailRetouche />}
      </div>

      <GardeSortie modifications={modifications} />

      {/* La barre du site, telle quelle. Elle ne s'affiche qu'à partir
          de la première modification, et « Publier » n'est pas de son
          ressort : la mise en ligne passe par l'administration. */}
      <BarreEnregistrement
        modifications={modifications}
        enCours={enCours}
        obstacle={null}
        peutPublier={false}
        onEnregistrer={() => void enregistrer()}
        onPublier={() => {}}
        onAnnuler={annulerTout}
      />

      <FeuilleRetouche />
    </FournisseurRetouche>
  );
}

/**
 * Ne pas laisser partir avec du travail sur les bras.
 *
 * DEUX SORTIES, DEUX GARDES. Fermer l'onglet ou recharger passe par
 * `beforeunload`, que le navigateur gère lui-même. Mais l'essentiel des
 * départs se fait par un lien de la page — « Mes pièces », un onglet de
 * la barre du gérant — et ceux-là ne déclenchent rien du tout : la
 * navigation est interne, la page n'est jamais déchargée, et le
 * brouillon disparaît sans un mot.
 *
 * DEUX APPUIS PLUTÔT QU'UN `confirm()`. Les navigateurs mobiles
 * escamotent les boîtes natives dès qu'ils les jugent envahissantes, et
 * le lien paraîtrait alors simplement cassé. Le premier clic prévient,
 * le second laisse partir.
 */
function GardeSortie({ modifications }: { modifications: number }) {
  const dejaPrevenu = useRef<string | null>(null);

  useEffect(() => {
    if (modifications === 0) return;

    const surDechargement = (e: BeforeUnloadEvent) => e.preventDefault();

    const surClic = (e: MouseEvent) => {
      // Ce que le navigateur ne traite pas comme une navigation simple
      // ne nous regarde pas : nouvel onglet, téléchargement, clic droit.
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const cible = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(cible instanceof HTMLAnchorElement)) return;
      if (cible.target === "_blank" || cible.hasAttribute("download")) return;

      const destination = new URL(cible.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      // Une ancre de la page même : on ne quitte rien.
      if (destination.pathname === window.location.pathname) return;

      if (dejaPrevenu.current === cible.href) return;

      e.preventDefault();
      dejaPrevenu.current = cible.href;
      window.setTimeout(() => {
        dejaPrevenu.current = null;
      }, 6000);
      annoncer(
        `${modifications} modification${modifications > 1 ? "s" : ""} non enregistrée${
          modifications > 1 ? "s" : ""
        }. Touche encore ce lien pour partir sans enregistrer.`,
        "info"
      );
    };

    window.addEventListener("beforeunload", surDechargement);
    document.addEventListener("click", surClic, true);
    return () => {
      window.removeEventListener("beforeunload", surDechargement);
      document.removeEventListener("click", surClic, true);
    };
  }, [modifications]);

  return null;
}
