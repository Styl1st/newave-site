"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  analyserLeSite,
  deposerLaCandidature,
  type Reseau,
  type Trouvaille,
} from "@/app/candidature/actions";
import { BRAND_CATEGORIES } from "@/lib/taxonomy";

/**
 * Proposer une marque, en quatre écrans.
 *
 *   1. Qui es-tu par rapport à cette marque.
 *   2. On lit son site, ou tu remplis à la main.
 *   3. Tu relis ce qu'on a trouvé, tu corriges.
 *   4. C'est parti.
 *
 * Tout tient dans un seul composant, et c'est voulu : une candidature
 * à moitié remplie ne survit pas à un changement de page, et rien
 * n'est plus décourageant que de tout retaper parce qu'on a cliqué sur
 * « précédent ».
 *
 * Le premier écran ne demandait rien avant, il demandait tout : le
 * choix, le nom, le contact, l'email, l'Instagram, le site et un
 * paragraphe. Une page pareille se referme avant d'être lue.
 */

type Etape = "choix" | "source" | "relecture" | "envoye";
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

const CHAMP =
  "w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55";
const LABEL = "eyebrow mb-2 block";
const PRINCIPAL =
  "rounded-full bg-white px-7 py-3.5 text-[14px] font-black text-[var(--color-ink)] shadow-[0_4px_14px_rgba(35,12,85,0.3)] transition hover:shadow-[0_8px_22px_rgba(35,12,85,0.45)] active:scale-[.97] disabled:opacity-55";
const SECONDAIRE =
  "rounded-full border border-white/40 bg-white/8 px-5 py-3 text-[13.5px] font-bold text-white transition hover:border-white/70 hover:bg-white/18 active:scale-[.97] disabled:opacity-55";

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

  const [etape, setEtape] = useState<Etape>("choix");
  const [relation, setRelation] = useState<Relation>("proprietaire");
  const [fiche, setFiche] = useState<Fiche>(FICHE_VIDE);
  const [reseaux, setReseaux] = useState<Reseau[]>([]);

  const [adresse, setAdresse] = useState("");
  const [verdict, setVerdict] = useState<{ ok: boolean; texte: string } | null>(null);
  const [lu, setLu] = useState<Trouvaille | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const [analyse, lancerAnalyse] = useTransition();
  const [envoi, lancerEnvoi] = useTransition();

  const proprietaire = relation === "proprietaire";

  // On remonte en haut à chaque écran : sans ça, on change de page et
  // l'on reste au milieu, devant un contenu qui n'a plus de sens.
  const haut = useRef<HTMLDivElement>(null);
  useEffect(() => {
    haut.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [etape]);

  function modifier<K extends keyof Fiche>(champ: K, valeur: Fiche[K]) {
    setFiche((f) => ({ ...f, [champ]: valeur }));
  }

  /* ---------------- 2. la lecture du site ---------------- */

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
      setVerdict({
        ok: true,
        texte: `${t.nom ?? "La marque"} a bien répondu.${
          t.pieces > 0 ? ` ${t.pieces} pièce${t.pieces > 1 ? "s" : ""} repérée${t.pieces > 1 ? "s" : ""}.` : ""
        } Relis ce qu'on a trouvé.`,
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
    });
  }

  /* ---------------- 3. l'envoi ---------------- */

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
      setEtape("envoye");
    });
  }

  return (
    <div ref={haut} className="scroll-mt-28">
      {etape === "choix" && (
        <EcranChoix
          onChoisir={(r) => {
            setRelation(r);
            setEtape("source");
          }}
        />
      )}

      {etape === "source" && (
        <EcranSource
          proprietaire={proprietaire}
          adresse={adresse}
          setAdresse={setAdresse}
          analyse={analyse}
          verdict={verdict}
          onAnalyser={analyser}
          onContinuer={() => setEtape("relecture")}
          onManuel={() => {
            setLu(null);
            setVerdict(null);
            setEtape("relecture");
          }}
          onRetour={() => setEtape("choix")}
        />
      )}

      {etape === "relecture" && (
        <EcranRelecture
          proprietaire={proprietaire}
          fiche={fiche}
          modifier={modifier}
          reseaux={reseaux}
          setReseaux={setReseaux}
          venuDuSite={Boolean(lu)}
          erreur={erreur}
          envoi={envoi}
          onEnvoyer={envoyer}
          onRetour={() => setEtape("source")}
        />
      )}

      {etape === "envoye" && (
        <EcranEnvoye proprietaire={proprietaire} onFin={() => router.push("/")} />
      )}
    </div>
  );
}

/* ==================== 1. le choix ==================== */

function EcranChoix({ onChoisir }: { onChoisir: (r: Relation) => void }) {
  const choix = [
    {
      valeur: "proprietaire" as const,
      titre: "Je suis à la tête de cette marque",
      texte:
        "Tu la fondes ou tu la diriges. Une fois ta page validée, tu la gères toi-même : tes pièces, ta présentation, tes statistiques.",
    },
    {
      valeur: "decouvreur" as const,
      titre: "Je la recommande",
      texte:
        "Tu n'en fais pas partie, mais son travail te paraît juste. On la contactera nous-mêmes de ta part.",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {choix.map((c) => (
        <button
          key={c.valeur}
          type="button"
          onClick={() => onChoisir(c.valeur)}
          data-reveal
          className="card-light group flex flex-col items-start gap-3 p-6 text-left sm:p-7"
        >
          <span className="relative z-3 flex flex-col gap-2.5">
            <span className="text-[17px] font-extrabold leading-snug tracking-[-0.01em]">
              {c.titre}
            </span>
            <span className="text-[13.5px] leading-relaxed text-[#4a3a78]">{c.texte}</span>
            <span className="mt-1 inline-flex items-center gap-2 text-[13px] font-black text-[#3a2470]">
              Continuer <span className="transition group-hover:translate-x-1">→</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ==================== 2. la source ==================== */

function EcranSource({
  proprietaire,
  adresse,
  setAdresse,
  analyse,
  verdict,
  onAnalyser,
  onContinuer,
  onManuel,
  onRetour,
}: {
  proprietaire: boolean;
  adresse: string;
  setAdresse: (v: string) => void;
  analyse: boolean;
  verdict: { ok: boolean; texte: string } | null;
  onAnalyser: () => void;
  onContinuer: () => void;
  onManuel: () => void;
  onRetour: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onRetour} className="self-start text-[13px] font-bold text-white/65 underline underline-offset-2 transition hover:text-white">
        ← Changer de choix
      </button>

      <section className="glass p-4 sm:p-7">
        <h2 className="m-0 text-[17px] font-extrabold text-white">
          {proprietaire ? "Tu as un site ?" : "Cette marque a un site ?"}
        </h2>
        <p className="m-0 mt-2 max-w-2xl text-[14px] leading-relaxed text-white/78">
          Colle son adresse et on récupère la présentation, le logo, la photo, la ville et
          les réseaux. Ça évite de tout retaper, et tu pourras corriger chaque ligne
          juste après.
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
              {verdict.ok ? (
                <button type="button" onClick={onContinuer} className={`${PRINCIPAL} mt-3`}>
                  Vérifier les informations
                </button>
              ) : (
                <button type="button" onClick={onManuel} className={`${SECONDAIRE} mt-3`}>
                  Remplir à la main
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Le message qui compte le plus de cette page. */}
      <section className="glass p-4 sm:px-7 sm:py-6">
        <h2 className="m-0 text-[15.5px] font-extrabold text-white">
          Pas de site ? Ce n&apos;est pas un problème.
        </h2>
        <p className="m-0 mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/72">
          Beaucoup de créateurs vendent d&apos;abord en message privé, sur Instagram ou
          sur Vinted, et montent leur boutique plus tard. Tu peux proposer tes pièces dès
          maintenant, et renseigner ton site le jour où il existera.
        </p>
        <button type="button" onClick={onManuel} className={`${SECONDAIRE} mt-4`}>
          Remplir à la main
        </button>
      </section>
    </div>
  );
}

/* ==================== 3. la relecture ==================== */

function EcranRelecture({
  proprietaire,
  fiche,
  modifier,
  reseaux,
  setReseaux,
  venuDuSite,
  erreur,
  envoi,
  onEnvoyer,
  onRetour,
}: {
  proprietaire: boolean;
  fiche: Fiche;
  modifier: <K extends keyof Fiche>(champ: K, valeur: Fiche[K]) => void;
  reseaux: Reseau[];
  setReseaux: (r: Reseau[]) => void;
  venuDuSite: boolean;
  erreur: string | null;
  envoi: boolean;
  onEnvoyer: (e: React.FormEvent<HTMLFormElement>) => void;
  onRetour: () => void;
}) {
  const visuel = fiche.couverture || fiche.logo;

  function ajouterReseau() {
    const libres = RESEAUX_CONNUS.filter((r) => !reseaux.some((x) => x.reseau === r.cle));
    setReseaux([...reseaux, { reseau: (libres[0] ?? RESEAUX_CONNUS[0]).cle, identifiant: "" }]);
  }

  return (
    <form onSubmit={onEnvoyer} className="flex flex-col gap-5">
      <button type="button" onClick={onRetour} className="self-start text-[13px] font-bold text-white/65 underline underline-offset-2 transition hover:text-white">
        ← Revenir
      </button>

      {venuDuSite && (
        <p className="glass m-0 px-5 py-3.5 text-[13.5px] leading-relaxed text-white">
          Voici ce qu&apos;on a lu sur le site. <strong className="font-extrabold">Rien n&apos;est
          définitif</strong> : corrige ce qui est faux, complète ce qui manque.
        </p>
      )}

      {/* ---- la marque ---- */}
      <section className="glass flex flex-col gap-5 p-4 sm:p-7">
        <h2 className="m-0 text-[15.5px] font-extrabold text-white">La marque</h2>

        {visuel && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={visuel}
            alt=""
            className="h-36 w-full rounded-[var(--radius)] border border-white/25 object-cover"
          />
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
