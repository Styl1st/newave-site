import type { Metadata } from "next";
import Link from "next/link";
import PageJuridique, { enParagraphes } from "@/components/PageJuridique";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Ce que tu peux faire sur NEWAVE SPHERE, ce qui est interdit, et ce qui se passe en cas d'abus.",
};

const CONTACT = "contact@newavesphere.fr";

/**
 * Les conditions d'utilisation.
 *
 * Ce n'est pas une obligation légale, contrairement aux mentions
 * légales. C'est un CONTRAT, et c'est justement ce qui manquait : sans
 * lui, retirer un avis ou fermer un compte se fait sans fondement, et
 * la personne concernée est fondée à demander de quel droit.
 *
 * Il est écrit pour être lu. Un texte que personne ne comprend
 * n'engage personne en pratique, quelle que soit sa valeur juridique —
 * et sur un site tenu par une seule personne, la clarté vaut mieux que
 * la couverture maximale. Chaque règle dit ce qu'elle interdit et
 * pourquoi.
 *
 * Deux choix pris par défaut, et à corriger si besoin :
 *   — quinze ans minimum, qui est l'âge du consentement numérique en
 *     France ;
 *   — la suppression d'un compte emporte tout ce qui s'y rattache,
 *     ce qui est déjà le comportement de la base.
 */

type Bloc = { titre: string; paragraphes: string[] };

const SECTIONS: Bloc[] = [
  {
    titre: "Ce qu'est ce site",
    paragraphes: [
      "NEWAVE SPHERE est un média et un annuaire : on présente des marques indépendantes, on écrit à leur sujet, et on renvoie vers leurs boutiques.",
      "**On ne vend rien.** Aucun achat ne se conclut ici : les commandes, les paiements, les livraisons et le service après-vente relèvent entièrement de la marque chez qui tu commandes. En cas de litige sur une commande, c'est vers elle qu'il faut te tourner.",
      "Les prix, les tailles et les disponibilités affichés sont relus automatiquement chez les marques, une fois par jour environ. Ils peuvent donc être en retard sur la réalité : **c'est la boutique qui fait foi**, toujours.",
    ],
  },
  {
    titre: "Créer un compte",
    paragraphes: [
      "Le compte est gratuit et facultatif : on peut tout parcourir sans. Il sert à mettre des marques en favori, à laisser des avis, et à gérer sa fiche quand on est une marque.",
      "**Il faut avoir quinze ans au moins.** C'est l'âge à partir duquel, en France, on peut consentir seul au traitement de ses données personnelles.",
      "Une adresse email valide est nécessaire, et elle doit être la tienne. Tu es responsable de ce qui se passe depuis ton compte : garde ton mot de passe pour toi, et signale-nous tout accès que tu n'aurais pas fait.",
    ],
  },
  {
    titre: "Ce que tu publies",
    paragraphes: [
      "Tu restes propriétaire de ce que tu écris. En le publiant ici, tu nous autorises simplement à l'afficher sur le site, ce qui est le minimum pour qu'un avis serve à quelque chose.",
      "**Ce qui n'a pas sa place :** les insultes, la haine et le harcèlement ; les propos discriminatoires ; les contenus qui ne concernent pas la marque dont il est question ; la publicité et le spam ; les fausses accusations ; tout ce qui relève de la vie privée d'autrui.",
      "Un avis négatif n'est pas un abus. Dire qu'une pièce est mal coupée, qu'une livraison a traîné ou qu'un tissu ne vaut pas son prix est exactement ce à quoi servent les avis. Ce qui est visé ici, c'est l'attaque, pas la critique.",
    ],
  },
  {
    titre: "La modération",
    paragraphes: [
      "N'importe qui peut **signaler** un avis, une pièce ou une fiche de marque, avec un motif et une explication. Le signalement ne supprime rien : il place le contenu dans une file que nous examinons.",
      "Nous pouvons **retirer un contenu** qui contrevient aux règles ci-dessus, et **suspendre ou fermer un compte** en cas d'abus répété ou grave. Nous nous engageons à ne le faire que pour ces motifs, et à répondre si tu contestes la décision à " + CONTACT + ".",
      "Nous pouvons aussi classer un signalement sans suite. Beaucoup traduisent un désaccord plutôt qu'un abus, et un avis défavorable mais honnête reste en ligne.",
    ],
  },
  {
    titre: "Les marques référencées",
    paragraphes: [
      "Une marque peut arriver dans l'annuaire de deux façons : parce que nous l'avons repérée et choisie, ou parce que quelqu'un l'a proposée et que nous avons accepté.",
      "**Aucun référencement ne s'achète.** L'ordre d'affichage, la mise en avant et le contenu éditorial ne dépendent d'aucun accord commercial. Si cela devait changer un jour, ce serait indiqué clairement, sur la fiche concernée.",
      "Les noms, logos, visuels et descriptions appartiennent aux marques. Ils sont repris pour les faire connaître, avec un lien vers leur boutique. Une marque qui veut corriger sa fiche, la compléter ou la retirer écrit à " + CONTACT + " : c'est fait sans discussion.",
    ],
  },
  {
    titre: "Supprimer ton compte",
    paragraphes: [
      "Tu peux partir quand tu veux, en écrivant à " + CONTACT + ".",
      "**Tout part avec le compte** : tes avis, tes favoris et tes coups de cœur sont effacés en même temps. Rien n'est conservé sous un pseudonyme, rien ne subsiste sous une autre forme.",
      "Les statistiques de fréquentation ne sont pas concernées, pour une raison simple : elles ne contiennent ni identifiant, ni adresse IP, ni rien qui te rattache à une visite. Il n'y a donc rien à en retirer.",
    ],
  },
  {
    titre: "Ce dont nous ne répondons pas",
    paragraphes: [
      "Le site est fourni tel quel. Nous faisons ce qu'il faut pour qu'il fonctionne, mais nous ne garantissons ni une disponibilité continue, ni l'absence de défaut. C'est d'ailleurs pour cela qu'il est encore en test.",
      "Nous ne répondons pas du contenu des sites vers lesquels nous renvoyons, ni des transactions qui s'y déroulent.",
      "Nous ne répondons pas non plus des avis déposés par les membres, tant qu'ils ne nous ont pas été signalés. Une fois un contenu illicite porté à notre connaissance, nous agissons dans les meilleurs délais.",
    ],
  },
  {
    titre: "Changements et droit applicable",
    paragraphes: [
      "Ces conditions peuvent évoluer. En cas de modification importante, les personnes inscrites en sont informées par email.",
      "Le droit applicable est le droit français, et les tribunaux français sont compétents. En cas de désaccord, écris-nous d'abord : la plupart des différends se règlent en deux messages.",
    ],
  },
];

export default function ConditionsPage() {
  return (
    <PageJuridique
      surtitre="Le cadre"
      titre="Conditions"
      plein="d'utilisation"
      intro="Ce que tu peux faire ici, ce qui est interdit, et ce qui se passe en cas d'abus. Écrit pour être lu en cinq minutes."
      parties={SECTIONS.map((s) => ({ titre: s.titre, contenu: enParagraphes(s.paragraphes) }))}
      pied={
        <>
          Dernière mise à jour : août 2026. Voir aussi la{" "}
          <Link href="/confidentialite" className="bf-lien">
            page confidentialité
          </Link>{" "}
          et les{" "}
          <Link href="/mentions-legales" className="bf-lien">
            mentions légales
          </Link>
          .
        </>
      }
    />
  );
}
