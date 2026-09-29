"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analyserLeSite,
  deposerLaCandidature,
  type Reseau,
  type Trouvaille,
} from "@/app/candidature/actions";
import type { ValeursFiche } from "@/components/admin/etat-fiche";
import ApercuFiche from "@/components/editeur/ApercuFiche";
import ApercuPieces from "@/components/parcours/ApercuPieces";
import { MARQUE_VIDE, VALEURS_VIDES } from "@/components/parcours/marque-vide";
import {
  CHAMP,
  CadreFiche,
  EcranChoix,
  LABEL,
  PRINCIPAL,
  SECONDAIRE,
  useEtapes,
  type Choix,
} from "@/components/parcours/Parcours";
import { BRAND_CATEGORIES } from "@/lib/taxonomy";

/**
 * Proposer une marque, en deux écrans et une confirmation.
 *
 *   1. Qui es-tu par rapport à cette marque.
 *   2. La fiche : on lit son site (ou tu remplis à la main), et tu vois
 *      tout de suite, à côté des champs, la carte que ça donnera dans
 *      l'annuaire et les pièces trouvées. Tu corriges, l'aperçu suit.
 *   3. C'est parti.
 *
 * Il y avait un écran de plus entre la lecture et les champs : une
 * phrase (« 12 pièces repérées »), un bouton « Vérifier les
 * informations », puis la fiche, sans rien montrer du résultat. La
 * lecture remplit maintenant la fiche sur place, avec l'aperçu.
 *
 * La forme des écrans vient de `parcours/Parcours` : l'administration
 * emprunte le même chemin pour ajouter une marque, et il n'était pas
 * question d'en tenir deux copies qui se répondraient de moins en moins
 * bien au fil des mois.
 *
 * CE QUI RESTE ICI EST CE QUI N'APPARTIENT QU'AU CANDIDAT : ce qu'on
 * lui demande de relire, et surtout la porte de sortie. Ce parcours-ci
 * se termine par une CANDIDATURE — un dossier en attente d'examen, qui
 * n'écrit rien dans l'annuaire. Celui de l'administration se termine
 * par une marque. Voir `admin/ParcoursNouvelleMarque`.
 *
 * Tout tient dans un seul composant, et c'est voulu : une candidature
 * à moitié remplie ne survit pas à un changement de page, et rien
 * n'est plus décourageant que de tout retaper parce qu'on a cliqué sur
 * « précédent ».
 */

type Relation = "proprietaire" | "decouvreur";

/** Le temps laissé pour lire la confirmation avant de rendre la main. */
const SECONDES_AVANT_ACCUEIL = 6;

const RESEAUX_CONNUS = [
  { cle: "instagram", nom: "Instagram" },
  { cle: "tiktok", nom: "TikTok" },
  { cle: "youtube", nom: "YouTube" },
  { cle: "pinterest", nom: "Pinterest" },
  { cle: "x", nom: "X" },
  { cle: "facebook", nom: "Facebook" },
  { cle: "depop", nom: "Depop" },
  { cle: "vinted", nom: "Vinted" },
] as const;

const QUI: readonly Choix<Relation>[] = [
  {
    valeur: "proprietaire",
    titre: "Je suis à la tête de cette marque",
    texte:
      "Tu la fondes ou tu la diriges. Une fois ta page validée, tu la gères toi-même : tes pièces, ta présentation, tes statistiques.",
  },
  {
    valeur: "decouvreur",
    titre: "Je la recommande",
    texte:
      "Tu n'en fais pas partie, mais son travail te paraît juste. On la contactera nous-mêmes de ta part.",
  },
];

/** L'état du formulaire de relecture, quelle qu'en soit l'origine. */
type Fiche = {
  marque: string;
  description: string;
  site: string;
  ville: string;
  pays: string;
  categories: string[];
  logo: string;
  couverture: string;
  contact: string;
  email: string;
  pitch: string;
};

const FICHE_VIDE: Fiche = {
  marque: "",
  description: "",
  site: "",
  ville: "",
  pays: "France",
  categories: [],
  logo: "",
  couverture: "",
  contact: "",
  email: "",
  pitch: "",
};

export default function ParcoursCandidature() {
  const router = useRouter();

  const { etape, aller, revenir, haut } = useEtapes();
  const [relation, setRelation] = useState<Relation>("proprietaire");
  const [fiche, setFiche] = useState<Fiche>(FICHE_VIDE);
  const [reseaux, setReseaux] = useState<Reseau[]>([]);

  const [adresse, setAdresse] = useState("");
  const [verdict, setVerdict] = useState<{ ok: boolean; texte: string } | null>(null);
  const [lu, setLu] = useState<Trouvaille | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [analyse, lancerAnalyse] = useTransition();
  const [envoi, lancerEnvoi] = useTransition();

  /*
   * La fiche se déplie après une lecture, ou sur « Remplir à la main ».
   * Le défilement attend le rendu qui la montre : la lecture se termine
   * dans une transition, et une fiche encore cachée n'a pas de place.
   */
  const [ouverte, setOuverte] = useState(false);
  const [depliages, setDepliages] = useState(0);
  const refFiche = useRef<HTMLDivElement>(null);
  const deplier = () => {
    setOuverte(true);
    setDepliages((n) => n + 1);
  };
  useEffect(() => {
    if (depliages > 0) refFiche.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [depliages]);

  const proprietaire = relation === "proprietaire";

  function modifier<K extends keyof Fiche>(champ: K, valeur: Fiche[K]) {
    setFiche((f) => ({ ...f, [champ]: valeur }));
  }

  /* ---------------- la lecture du site ---------------- */

  function analyser() {
    setVerdict(null);
    setErreur(null);

    const formData = new FormData();
    formData.set("site", adresse);

    lancerAnalyse(async () => {
      const res = await analyserLeSite(formData);

      if (!res.ok) {
        setVerdict({ ok: false, texte: res.error });
        return;
      }

      const t = res.trouvaille;
      setLu(t);
      // Une ligne : le résultat, c'est l'aperçu, juste en dessous.
      setVerdict({
        ok: true,
        texte: `${t.nom ?? "La marque"} a bien répondu : la fiche est remplie. Regarde l'aperçu et corrige ce qui cloche.`,
      });

      setFiche((f) => ({
        ...f,
        marque: t.nom ?? f.marque,
        description: t.description || f.description,
        site: t.site,
        ville: t.ville ?? f.ville,
        pays: t.pays ?? f.pays,
        categories: t.categories.length > 0 ? t.categories : f.categories,
        logo: t.logo ?? "",
        couverture: t.couverture ?? "",
      }));

      if (t.instagram) {
        setReseaux((r) =>
          r.some((x) => x.reseau === "instagram")
            ? r
            : [...r, { reseau: "instagram", identifiant: t.instagram as string }]
        );
      }

      deplier();
    });
  }

  /* ---------------- l'envoi ---------------- */

  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);

    const formData = new FormData();
    formData.set("relation", relation);
    formData.set("marque", fiche.marque);
    formData.set("description", fiche.description);
    formData.set("site", fiche.site);
    formData.set("ville", fiche.ville);
    formData.set("pays", fiche.pays);
    formData.set("categories", fiche.categories.join(","));
    formData.set("logo", fiche.logo);
    formData.set("couverture", fiche.couverture);
    formData.set("contact", fiche.contact);
    formData.set("email", fiche.email);
    formData.set("pitch", fiche.pitch);
    formData.set("reseaux", JSON.stringify(reseaux));

    lancerEnvoi(async () => {
      const res = await deposerLaCandidature(formData);
      if (!res.ok) {
        setErreur(res.error);
        return;
      }
      // Remplacer, pas empiler : « précédent » ne doit pas rouvrir un
      // dossier déjà parti, prêt à être renvoyé une seconde fois.
      aller("fin", { remplacer: true });
    });
  }

  return (
    <div ref={haut} className="scroll-mt-28">
      {etape === "choix" && (
        <EcranChoix
          choix={QUI}
          onChoisir={(r) => {
            setRelation(r);
            aller("fiche");
          }}
        />
      )}

      {etape === "fiche" && (
        <CadreFiche
          onRetour={() => revenir("choix")}
          ouverte={ouverte}
          onManuel={deplier}
          refFiche={refFiche}
          sansSite={{
            titre: "Pas de site ? Ce n'est pas un problème.",
            texte:
              "Beaucoup de créateurs vendent d'abord en message privé, sur Instagram ou sur Vinted, et montent leur boutique plus tard. Tu peux proposer tes pièces dès maintenant, et renseigner ton site le jour où il existera.",
          }}
          lecture={
            <LectureDuSite
              proprietaire={proprietaire}
              adresse={adresse}
              setAdresse={setAdresse}
              analyse={analyse}
              verdict={verdict}
              onAnalyser={analyser}
              onManuel={deplier}
            />
          }
          apercu={
            <>
              <ApercuFiche
                brand={MARQUE_VIDE}
                valeurs={valeursDeLaCandidature(fiche, reseaux)}
                sansAccroche
              />
              {lu && (
                <ApercuPieces
                  pieces={lu.apercu}
                  total={lu.pieces}
                  note={
                    proprietaire
                      ? "Lues sur ton site. Une fois ta page validée, tu pourras importer ton catalogue en un clic."
                      : "Lues sur son site. Elles arriveront sur sa page si la marque rejoint l'annuaire."
                  }
                />
              )}
            </>
          }
        >
          <FormulaireFiche
            proprietaire={proprietaire}
            fiche={fiche}
            modifier={modifier}
            reseaux={reseaux}
            setReseaux={setReseaux}
            erreur={erreur}
            envoi={envoi}
            onEnvoyer={envoyer}
          />
        </CadreFiche>
      )}

      {etape === "fin" && (
        <EcranEnvoye proprietaire={proprietaire} onFin={() => router.push("/")} />
      )}
    </div>
  );
}

/**
 * Ce que la saisie donne, dans la forme que lit l'aperçu.
 *
 * `ApercuFiche` est celui de l'éditeur des fiches : il rend la vraie
 * carte de l'annuaire. On lui donne donc ce qu'une fiche porterait si
 * la candidature était acceptée telle quelle, rien de plus.
 */
function valeursDeLaCandidature(fiche: Fiche, reseaux: Reseau[]): ValeursFiche {
  return {
    ...VALEURS_VIDES,
    name: fiche.marque.trim(),
    description: fiche.description.trim(),
    shop_url: fiche.site.trim(),
    city: fiche.ville.trim(),
    country: fiche.pays.trim(),
    categories: fiche.categories,
    logo_url: fiche.logo,
    cover_url: fiche.couverture,
    instagram: reseaux.find((r) => r.reseau === "instagram")?.identifiant.trim() ?? "",
  };
}

/* ==================== 2a. la lecture du site ==================== */

function LectureDuSite({
  proprietaire,
  adresse,
  setAdresse,
  analyse,
  verdict,
  onAnalyser,
  onManuel,
}: {
  proprietaire: boolean;
  adresse: string;
  setAdresse: (v: string) => void;
  analyse: boolean;
  verdict: { ok: boolean; texte: string } | null;
  onAnalyser: () => void;
  onManuel: () => void;
}) {
  return (
    <section className="glass p-4 sm:p-7">
      <h2 className="m-0 text-[17px] font-extrabold text-white">
        {proprietaire ? "Tu as un site ?" : "Cette marque a un site ?"}
      </h2>
      <p className="m-0 mt-2 max-w-2xl text-[14px] leading-relaxed text-white/78">
        Colle son adresse : on récupère la présentation, le logo, la photo, la ville et
        les réseaux, et la fiche se remplit juste en dessous, avec l&apos;aperçu de la
        carte telle qu&apos;elle paraîtra. Tu corriges ce qui cloche, rien de plus.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          className={CHAMP}
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="tamarque.fr"
          aria-label="Adresse du site"
          disabled={analyse}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (adresse.trim() && !analyse) onAnalyser();
            }
          }}
        />
        <button
          type="button"
          onClick={onAnalyser}
          disabled={analyse || !adresse.trim()}
          className={`${PRINCIPAL} inline-flex shrink-0 items-center justify-center gap-2`}
        >
          {analyse ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(23,10,51,0.25)] border-t-[var(--color-ink)]" />
              Lecture…
            </>
          ) : (
            "Lire le site"
          )}
        </button>
      </div>

      {/* Le verdict, en vert ou en rouge. On ne laisse pas quelqu'un
          deviner si ça a marché : un formulaire qui ne dit rien, on
          le reclique trois fois. */}
      {verdict && !analyse && (
        <div
          role="status"
          className={`mt-4 flex items-start gap-3 rounded-[var(--radius)] border p-4 ${
            verdict.ok
              ? "border-[#8fe0b0] bg-[rgba(47,122,79,0.28)]"
              : "border-[#ff9db0] bg-[rgba(194,39,63,0.28)]"
          }`}
        >
          <span
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-black ${
              verdict.ok ? "bg-[#8fe0b0] text-[#14432a]" : "bg-[#ff9db0] text-[#5c0f1e]"
            }`}
            aria-hidden
          >
            {verdict.ok ? "✓" : "!"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[13.5px] font-bold leading-relaxed text-white">
              {verdict.texte}
            </p>
            {/* Plus de « Vérifier les informations » : la fiche et son
                aperçu se sont dépliés juste en dessous. */}
            {!verdict.ok && (
              <button type="button" onClick={onManuel} className={`${SECONDAIRE} mt-3`}>
                Remplir à la main
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ==================== 2b. la fiche ==================== */

function FormulaireFiche({
  proprietaire,
  fiche,
  modifier,
  reseaux,
  setReseaux,
  erreur,
  envoi,
  onEnvoyer,
}: {
  proprietaire: boolean;
  fiche: Fiche;
  modifier: <K extends keyof Fiche>(champ: K, valeur: Fiche[K]) => void;
  reseaux: Reseau[];
  setReseaux: (r: Reseau[]) => void;
  erreur: string | null;
  envoi: boolean;
  onEnvoyer: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  function ajouterReseau() {
    const libres = RESEAUX_CONNUS.filter((r) => !reseaux.some((x) => x.reseau === r.cle));
    setReseaux([...reseaux, { reseau: (libres[0] ?? RESEAUX_CONNUS[0]).cle, identifiant: "" }]);
  }

  return (
    <form onSubmit={onEnvoyer} className="flex flex-col gap-5">
      {/* ---- la marque ---- */}
      <section className="glass flex flex-col gap-5 p-4 sm:p-7">
        <h2 className="m-0 text-[15.5px] font-extrabold text-white">La marque</h2>

        {/* Les visuels repris du site. Ils se voient dans l'aperçu ;
            ici, on peut retirer celui qui est tombé à côté (une icône
            d'onglet, la photo d'un seul article) plutôt que de le
            laisser partir avec le dossier. */}
        {(fiche.logo || fiche.couverture) && (
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["logo", "Logo"],
                ["couverture", "Couverture"],
              ] as const
            ).map(([champ, nom]) =>
              fiche[champ] ? (
                <div
                  key={champ}
                  className="flex items-center gap-3 rounded-[var(--radius)] border border-white/20 bg-white/6 p-2 pr-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fiche[champ]}
                    alt=""
                    className="h-12 w-12 rounded-[10px] bg-white/90 object-contain"
                  />
                  <span className="text-[12.5px] font-bold text-white/80">{nom}</span>
                  <button
                    type="button"
                    onClick={() => modifier(champ, "")}
                    className="rounded-full border border-white/25 px-3 py-1.5 text-[12px] font-bold text-white/70 transition hover:border-white/50 hover:text-white"
                  >
                    Retirer
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}

        <div>
          <label className={LABEL} htmlFor="marque">Nom de la marque *</label>
          <input
            id="marque"
            className={CHAMP}
            value={fiche.marque}
            onChange={(e) => modifier("marque", e.target.value)}
            required
            maxLength={120}
            placeholder="Le nom de ta marque"
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="description">
            {proprietaire ? "Ta démarche" : "Ce que fait cette marque"}
          </label>
          <textarea
            id="description"
            className={`${CHAMP} min-h-[120px] resize-y`}
            value={fiche.description}
            onChange={(e) => modifier("description", e.target.value)}
            placeholder="Matières, ateliers, quantités, ce que tu refuses de faire. Trois paragraphes honnêtes valent mieux qu'une page de communication."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className={LABEL} htmlFor="site">Site ou boutique</label>
            <input
              id="site"
              className={CHAMP}
              value={fiche.site}
              onChange={(e) => modifier("site", e.target.value)}
              placeholder="https://"
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="pays">Pays</label>
            <input
              id="pays"
              className={CHAMP}
              value={fiche.pays}
              onChange={(e) => modifier("pays", e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="ville">Ville</label>
            <input
              id="ville"
              className={CHAMP}
              value={fiche.ville}
              onChange={(e) => modifier("ville", e.target.value)}
              placeholder="Paris"
            />
          </div>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className={`${LABEL} p-0`}>Catégories</legend>
          <div className="flex flex-wrap gap-1.5">
            {BRAND_CATEGORIES.map((c) => {
              const actif = fiche.categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    modifier(
                      "categories",
                      actif ? fiche.categories.filter((x) => x !== c) : [...fiche.categories, c]
                    )
                  }
                  aria-pressed={actif}
                  className={`rounded-full px-3.5 py-2 text-[12px] font-bold transition ${
                    actif
                      ? "bg-white text-[var(--color-ink)]"
                      : "border border-white/25 text-white/75 hover:border-white/50 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      {/* ---- les réseaux ---- */}
      <section className="glass flex flex-col gap-4 p-4 sm:p-7">
        <div>
          <h2 className="m-0 text-[15.5px] font-extrabold text-white">Où vous trouver</h2>
          <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-white/65">
            Ajoute autant de réseaux que tu veux. C&apos;est souvent par là qu&apos;on
            découvre une marque avant d&apos;acheter.
          </p>
        </div>

        {reseaux.map((r, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row">
            <select
              value={r.reseau}
              aria-label="Réseau"
              onChange={(e) =>
                setReseaux(reseaux.map((x, j) => (j === i ? { ...x, reseau: e.target.value } : x)))
              }
              className={`${CHAMP} sm:w-48`}
            >
              {RESEAUX_CONNUS.map((o) => (
                <option key={o.cle} value={o.cle}>
                  {o.nom}
                </option>
              ))}
            </select>
            <input
              className={CHAMP}
              value={r.identifiant}
              aria-label="Identifiant"
              onChange={(e) =>
                setReseaux(
                  reseaux.map((x, j) => (j === i ? { ...x, identifiant: e.target.value } : x))
                )
              }
              placeholder="tamarque, sans l'arobase"
            />
            <button
              type="button"
              onClick={() => setReseaux(reseaux.filter((_, j) => j !== i))}
              aria-label="Retirer ce réseau"
              className="shrink-0 rounded-full border border-white/25 px-4 py-3 text-[13px] font-bold text-white/70 transition hover:border-white/50 hover:text-white"
            >
              Retirer
            </button>
          </div>
        ))}

        <button type="button" onClick={ajouterReseau} className={`${SECONDAIRE} self-start`}>
          + Ajouter un réseau
        </button>
      </section>

      {/* ---- le contact ---- */}
      <section className="glass flex flex-col gap-5 p-4 sm:p-7">
        <div>
          <h2 className="m-0 text-[15.5px] font-extrabold text-white">Pour te répondre</h2>
          <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-white/65">
            {proprietaire
              ? "On lit chaque dossier à la main, et on vérifie que la marque est bien la tienne avant de t'en donner les clés. C'est à cette adresse qu'on écrira."
              : "On te dira ce qu'il advient de ta recommandation, et on contactera la marque de ta part."}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="contact">Ton nom *</label>
            <input
              id="contact"
              className={CHAMP}
              value={fiche.contact}
              onChange={(e) => modifier("contact", e.target.value)}
              required
              maxLength={120}
              placeholder="Prénom Nom"
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="email">Ton email *</label>
            <input
              id="email"
              type="email"
              className={CHAMP}
              value={fiche.email}
              onChange={(e) => modifier("email", e.target.value)}
              required
              placeholder="toi@tamarque.fr"
            />
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="pitch">
            {proprietaire ? "Un mot pour nous" : "Pourquoi cette marque"}
          </label>
          <textarea
            id="pitch"
            className={`${CHAMP} min-h-[110px] resize-y`}
            value={fiche.pitch}
            onChange={(e) => modifier("pitch", e.target.value)}
            placeholder={
              proprietaire
                ? "Ce qui te tient à cœur, ce que tu prépares. On lit tout."
                : "Ce qui t'a marqué chez elle."
            }
          />
        </div>
      </section>

      {erreur && (
        <p className="m-0 rounded-[var(--radius)] border border-[#ff9db0] bg-[rgba(194,39,63,0.28)] px-5 py-3.5 text-[13.5px] leading-relaxed text-white">
          {erreur}
        </p>
      )}

      <button type="submit" disabled={envoi} className={`${PRINCIPAL} self-start`}>
        {envoi ? "Envoi…" : "Publier ma candidature"}
      </button>

      <p className="m-0 text-[12.5px] leading-relaxed text-white/62">
        Tes informations servent uniquement à étudier ta candidature. Elles ne sont ni
        revendues ni transmises. Tu peux demander leur suppression à tout moment à
        contact@newavesphere.fr.
      </p>
    </form>
  );
}

/* ==================== 4. c'est parti ==================== */

/**
 * La porte de sortie du candidat, et elle n'appartient qu'à lui : ce
 * parcours se termine par un DOSSIER EN ATTENTE, pas par une marque en
 * ligne. C'est la seule chose qu'on ne partage pas avec le parcours de
 * l'administration, et c'est justement toute la différence.
 */
function EcranEnvoye({
  proprietaire,
  onFin,
}: {
  proprietaire: boolean;
  onFin: () => void;
}) {
  const [reste, setReste] = useState(SECONDES_AVANT_ACCUEIL);

  useEffect(() => {
    if (reste <= 0) {
      onFin();
      return;
    }
    const t = setTimeout(() => setReste((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [reste, onFin]);

  return (
    <div className="glass flex flex-col items-center gap-4 p-8 text-center sm:p-12">
      <span
        className="grid h-16 w-16 place-items-center rounded-full bg-[#8fe0b0] text-[30px] font-black text-[#14432a]"
        aria-hidden
      >
        ✓
      </span>

      <h2 className="m-0 text-[clamp(20px,4.4vw,26px)] font-extrabold tracking-[-0.02em] text-white">
        Ta candidature est partie.
      </h2>

      <p className="m-0 max-w-lg text-[15px] leading-relaxed text-white/85">
        {proprietaire
          ? "On lit chaque dossier nous-mêmes, et on vérifie que la marque est bien la tienne avant de t'en confier la page. La réponse arrivera par email, même si c'est un non."
          : "Merci pour la recommandation. On va regarder cette marque, et on la contactera directement si son travail nous parle."}
      </p>

      <p className="m-0 text-[13px] font-bold uppercase tracking-[0.12em] text-white/50">
        Retour à l&apos;accueil dans {reste} seconde{reste > 1 ? "s" : ""}
      </p>

      <button type="button" onClick={onFin} className={SECONDAIRE}>
        Y aller tout de suite
      </button>
    </div>
  );
}
