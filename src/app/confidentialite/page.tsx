import type { Metadata } from "next";
import PageJuridique, { enParagraphes } from "@/components/PageJuridique";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Quelles données NEWAVE SPHERE collecte, pourquoi, et comment les faire supprimer.",
};

const SECTIONS = [
  {
    titre: "Ce qu'on collecte, et rien d'autre",
    contenu: [
      "**Si tu crées un compte** : ton adresse email et le nom que tu choisis d'afficher. Ton mot de passe n'est jamais stocké en clair, et nous ne pouvons donc pas le lire.",
      "**Si tu mets une marque en favori** : le lien entre ton compte et cette marque.",
      "**Si tu proposes une marque** : les informations que tu remplis dans le formulaire, et ton compte s'il existe.",
      "**À chaque visite** : la page consultée et, le cas échéant, le site depuis lequel tu es arrivé. Nous en gardons le domaine, jamais l'adresse complète. Rien d'autre : ni adresse IP, ni empreinte de navigateur, ni identifiant. Deux de tes visites sont indiscernables de deux visiteurs différents, donc rien ne permet de te suivre.",
      "Aucun traceur publicitaire, aucun profilage, aucune revente. Ces chiffres nous servent uniquement à savoir quelles marques intéressent, et à le montrer à celles qu'on référence.",
    ],
  },
  {
    titre: "Les cookies",
    contenu: [
      "Deux cookies seulement, et tous deux strictement nécessaires au fonctionnement : celui qui te garde connecté, et celui du mot de passe d'accès pendant la phase de test.",
      "La mesure de fréquentation, elle, ne pose **aucun** cookie et ne dépose rien dans ton navigateur. C'est pour cette raison qu'aucune bannière de consentement ne t'est imposée : la réglementation ne l'exige que pour les traceurs qui suivent les personnes.",
    ],
  },
  {
    titre: "Où vivent ces données",
    contenu: [
      "La base et les images sont hébergées par **Supabase**, sur des serveurs situés dans l'Union européenne.",
      "Le site est servi par **Vercel Inc.**, dont l'infrastructure est mondiale.",
      "Les emails automatiques, confirmation d'inscription et mot de passe oublié, sont envoyés par **Resend**, aux États-Unis. Ils ne contiennent que ton adresse et un lien.",
      "La boîte **contact@newavesphere.fr** est hébergée par **OVHcloud**, en France.",
    ],
  },
  {
    titre: "Les liens sortants",
    contenu: [
      "Quand tu cliques vers la boutique d'une marque, tu quittes NEWAVE SPHERE et les règles du site d'arrivée s'appliquent.",
      "Nous comptons ces clics de façon anonyme. Nous retenons la marque concernée et la page d'origine, sans aucune donnée permettant de t'identifier. Cela nous sert à savoir quelles marques intéressent, et à justifier notre travail auprès d'elles.",
    ],
  },
  {
    titre: "Combien de temps",
    contenu: [
      "Ton compte et tes favoris restent tant que tu ne demandes pas leur suppression.",
      "Les candidatures de marques sont conservées trois ans, le temps d'un éventuel partenariat.",
    ],
  },
  {
    titre: "À quel titre on traite ces données",
    contenu: [
      "Le règlement européen demande que chaque traitement repose sur une base précise. Voici les nôtres, sans détour.",
      "**Ton compte et tes favoris** : l'exécution du service que tu as demandé en t'inscrivant. Sans ces données, il n'y a pas de compte.",
      "**Les avis** : ton consentement, donné au moment où tu écris. Tu peux retirer un avis quand tu veux, et il disparaît.",
      "**La mesure de fréquentation** : notre intérêt légitime à savoir quelles marques intéressent. Elle ne repose sur aucun identifiant, ce qui est précisément ce qui la rend acceptable sans te demander ton avis.",
      "**Les emails de service**, confirmation d'inscription et mot de passe oublié : l'exécution du service. Ce ne sont pas des messages publicitaires et tu ne peux pas t'en désinscrire, parce que sans eux ton compte ne fonctionne pas.",
    ],
  },
  {
    titre: "Quinze ans minimum",
    contenu: [
      "Il faut avoir **au moins quinze ans** pour créer un compte. C'est l'âge à partir duquel, en France, on peut consentir seul au traitement de ses données.",
      "Si tu es parent et que tu constates qu'un compte a été créé par un enfant plus jeune, écris à **contact@newavesphere.fr** : il sera supprimé, avec tout ce qui s'y rattache.",
    ],
  },
  {
    titre: "Ce qui sort de l'Union européenne",
    contenu: [
      "Une seule chose, et il faut le dire : les emails automatiques passent par **Resend**, société américaine. Le message contient ton adresse et un lien, rien d'autre.",
      "Ce transfert repose sur les clauses contractuelles types de la Commission européenne, le cadre prévu pour ces cas.",
      "Tout le reste reste sur des serveurs situés dans l'Union : ta base, tes favoris, tes avis, tes images.",
    ],
  },
  {
    titre: "Tes droits",
    contenu: [
      "Tu peux accéder à tes données, les corriger, les emporter ou les faire supprimer. Ton nom affiché et ton mot de passe se modifient directement depuis ton compte.",
      "Pour tout le reste, écris à **contact@newavesphere.fr**. Nous répondons sous un mois.",
      "En cas de désaccord, tu peux saisir la CNIL.",
    ],
  },
];

export default function ConfidentialitePage() {
  return (
    <PageJuridique
      surtitre="Données personnelles"
      titre="Confidentialité"
      intro="En clair, sans jargon : ce qu'on sait de toi, pourquoi, et comment l'effacer."
      parties={SECTIONS.map((s) => ({ titre: s.titre, contenu: enParagraphes(s.contenu) }))}
      pied={
        <>
          Ce texte décrit fidèlement le fonctionnement du site. Il ne remplace pas l&apos;avis
          d&apos;un juriste : fais-le relire avant l&apos;ouverture au public, et complète les
          mentions légales avec ton statut et ton numéro d&apos;immatriculation.
        </>
      }
    />
  );
}
