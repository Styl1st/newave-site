import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Quelles données NEWAVE SPHERE collecte, pourquoi, et comment les faire supprimer.",
};

const SECTIONS = [
  {
    titre: "Ce qu'on collecte, et rien d'autre",
    contenu: [
      "**Si tu crées un compte** : ton adresse email et le nom que tu choisis d'afficher. Ton mot de passe n'est jamais stocké en clair — nous ne pouvons pas le lire.",
      "**Si tu mets une marque en favori** : le lien entre ton compte et cette marque.",
      "**Si tu proposes une marque** : les informations que tu remplis dans le formulaire, et ton compte s'il existe.",
      "**À chaque visite** : la page consultée et, le cas échéant, le site depuis lequel tu es arrivé — au domaine près, jamais l'adresse complète. Rien d'autre : ni adresse IP, ni empreinte de navigateur, ni identifiant. Deux de tes visites sont indiscernables de deux visiteurs différents, donc rien ne permet de te suivre.",
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
      "Les emails de la marque transitent par **OVHcloud**, en France.",
    ],
  },
  {
    titre: "Les liens sortants",
    contenu: [
      "Quand tu cliques vers la boutique d'une marque, tu quittes NEWAVE SPHERE et les règles du site d'arrivée s'appliquent.",
      "Nous comptons ces clics de façon anonyme — la marque concernée et la page d'origine, sans aucune donnée permettant de t'identifier. Cela nous sert à savoir quelles marques intéressent, et à justifier notre travail auprès d'elles.",
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
    titre: "Tes droits",
    contenu: [
      "Tu peux accéder à tes données, les corriger, les emporter ou les faire supprimer. Ton nom affiché et ton mot de passe se modifient directement depuis ton compte.",
      "Pour tout le reste, écris à **contact@newavesphere.fr**. Nous répondons sous un mois.",
      "En cas de désaccord, tu peux saisir la CNIL.",
    ],
  },
];

/** Met en gras les segments entre doubles astérisques. */
function riche(texte: string) {
  return texte.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-extrabold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-[var(--pad)] py-12">
      <header className="rise">
        <p className="eyebrow m-0">Données personnelles</p>
        <h1 className="m-0 mt-2 text-[clamp(26px,6.4vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
          Confidentialité
        </h1>
        <p className="m-0 mt-4 text-[15px] leading-relaxed text-white/82">
          En clair, sans jargon : ce qu&apos;on sait de toi, pourquoi, et comment
          l&apos;effacer.
        </p>
      </header>

      <div className="glass rise rise-1 mt-8 flex flex-col gap-8 p-6 sm:p-8">
        {SECTIONS.map((s) => (
          <section key={s.titre}>
            <h2 className="m-0 text-[16.5px] font-extrabold text-white">{s.titre}</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {s.contenu.map((c, i) => (
                <p key={i} className="m-0 text-[14.5px] leading-relaxed text-white/85">
                  {riche(c)}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="m-0 mt-6 text-[12.5px] leading-relaxed text-white/50">
        Ce texte décrit fidèlement le fonctionnement du site. Il ne remplace pas
        l&apos;avis d&apos;un juriste : fais-le relire avant l&apos;ouverture au public,
        et complète les mentions légales avec ton statut et ton numéro d&apos;immatriculation.
      </p>
    </div>
  );
}
