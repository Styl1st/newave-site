import { after } from "next/server";
import gabaritBienvenue from "../../emails/b/bienvenue.html";
import gabaritCandidatureRecue from "../../emails/b/candidature-recue.html";
import gabaritCandidatureAcceptee from "../../emails/b/candidature-acceptee.html";

/**
 * Les emails que le SITE envoie lui-même.
 *
 * Il y en a deux familles, à ne pas confondre :
 *
 *   - ceux de l'authentification (confirmation, mot de passe,
 *     changement d'adresse) partent de Supabase. Leurs gabarits se
 *     collent dans son tableau de bord, ce fichier n'y touche pas.
 *     Voir docs/emails-supabase.md.
 *
 *   - ceux d'ici, qui racontent ce qui se passe sur le site : la
 *     bienvenue, la candidature reçue, la candidature acceptée.
 *     Supabase ignore leur existence, on les envoie donc nous-mêmes
 *     par l'API de Resend, le service qui porte déjà ses envois.
 *
 * Les gabarits sont les fichiers de emails/b/, importés tels quels.
 * On les retouche là-bas, pas ici. Leurs variables s'écrivent
 * {{marque}}, {{prenom}}... et l'objet du message est leur <title>.
 *
 * Deux règles :
 *
 *   1. Un email ne fait JAMAIS échouer l'action qui l'a déclenché. Une
 *      candidature déposée reste déposée même si Resend est en panne :
 *      l'erreur va dans les journaux Vercel, et c'est tout.
 *
 *   2. Il part APRÈS la réponse (`after`). Personne n'attend Resend
 *      devant un bouton qui mouline.
 */

const EXPEDITEUR = "NEWAVE SPHERE <contact@newavesphere.fr>";
const REPONDRE_A = "contact@newavesphere.fr";

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://newavesphere.fr").replace(/\/+$/, "");

type Valeurs = Record<string, string>;

/** Vrai si l'envoi est branché. Sans clé, on n'essaie même pas. */
export function emailsBranches(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/* ---------------- la mise en forme ---------------- */

/**
 * Tout ce qui vient d'un formulaire passe par ici avant d'entrer dans
 * le HTML. Sans quoi une marque baptisée `<a href=...>` glisserait son
 * propre lien dans un message signé de notre nom.
 */
const ENTITES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ENTITES[c]);
}

function decoder(texte: string): string {
  return texte
    .replace(/&nbsp;/g, " ")
    .replace(/&rarr;/g, "→")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      // Les caractères invisibles qui rallongent le texte d'aperçu.
      return code === 847 || code === 8199 ? "" : String.fromCodePoint(code);
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/**
 * Remplace les {{variables}}. Une variable inconnue (une faute de
 * frappe dans le gabarit) est effacée plutôt que d'arriver telle
 * quelle, accolades comprises, dans la boîte de quelqu'un.
 */
function remplir(modele: string, valeurs: Valeurs, transformer: (v: string) => string): string {
  return modele.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, cle: string) => {
    if (cle in valeurs) return transformer(valeurs[cle]);
    console.warn(`[emails] variable inconnue {{${cle}}} dans un gabarit, laissée vide.`);
    return "";
  });
}

/** L'objet du message : le <title> du gabarit, en texte brut. */
function objetDe(modele: string, valeurs: Valeurs): string {
  const titre = modele.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "NEWAVE SPHERE";
  return remplir(decoder(titre), valeurs, (v) => v).replace(/\s+/g, " ").trim().slice(0, 200);
}

/**
 * La version texte, jointe au HTML. Les filtres anti-spam se méfient
 * d'un message qui n'a que du HTML, et certaines messageries (montres,
 * lecteurs d'écran, clients en mode texte) n'affichent que celle-ci.
 */
function versTexte(html: string): string {
  return decoder(
    html
      .replace(/<head[\s\S]*?<\/head>/i, "")
      .replace(/<div style="display:none[\s\S]*?<\/div>/i, "")
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, lien: string, contenu: string) => {
        const libelle = decoder(contenu.replace(/<[^>]+>/g, "")).replace(/→/g, "").trim();
        const nu = (s: string) => s.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return !libelle || nu(libelle) === nu(decoder(lien)) ? lien : `${libelle} : ${lien}`;
      })
      .replace(/<\/(p|h1|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/td>/gi, " ")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((ligne) => ligne.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---------------- l'envoi ---------------- */

async function envoyer(
  a: string,
  modele: string,
  valeurs: Valeurs,
  nom: string,
  idempotence?: string
): Promise<void> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.warn(`[emails] « ${nom} » non envoyé : RESEND_API_KEY n'est pas renseignée.`);
    return;
  }

  const html = remplir(modele, valeurs, echapper);

  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "Content-Type": "application/json",
        // Le même événement rejoué (double clic, nouvelle tentative)
        // ne donne pas deux messages. Resend s'en souvient 24 heures.
        ...(idempotence ? { "Idempotency-Key": idempotence } : {}),
      },
      body: JSON.stringify({
        from: EXPEDITEUR,
        to: [a],
        reply_to: REPONDRE_A,
        subject: objetDe(modele, valeurs),
        html,
        text: versTexte(html),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => "");
      console.error(`[emails] Resend refuse « ${nom} » (${reponse.status}) : ${detail.slice(0, 300)}`);
    }
  } catch (erreur) {
    console.error(`[emails] « ${nom} » n'est pas parti :`, erreur);
  }
}

/** Confie l'envoi à `after` : il part une fois la page rendue. */
function planifier(tache: () => Promise<void>) {
  try {
    after(tache);
  } catch {
    // Hors d'une requête (un script, un test) : on envoie tout de suite.
    void tache();
  }
}

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

/* ---------------- les trois messages ---------------- */

/**
 * Après la toute première confirmation d'adresse.
 *
 * Sans prénom, « C'est fait, {{prenom}}. » devient « C'est fait. » :
 * on retire la virgule avec la variable, sans quoi le titre finirait
 * sur « C'est fait, . ».
 */
export function envoyerBienvenue(a: string, prenom: string | null) {
  const p = (prenom ?? "").trim().slice(0, 60);
  const modele = p ? gabaritBienvenue : gabaritBienvenue.replace(/,\s*\{\{\s*prenom\s*\}\}/g, "");
  planifier(() => envoyer(a, modele, { prenom: p }, "bienvenue"));
}

/** Juste après le dépôt d'un dossier, depuis /candidature. */
export function envoyerCandidatureRecue(a: string, marque: string) {
  planifier(() =>
    envoyer(
      a,
      gabaritCandidatureRecue,
      { marque: marque.slice(0, 120), email: a, date: DATE.format(new Date()) },
      "candidature reçue"
    )
  );
}

/** Quand l'administration accepte le dossier d'une marque. */
export function envoyerCandidatureAcceptee(
  a: string,
  marque: string,
  lienDossier: string,
  idCandidature: string
) {
  planifier(() =>
    envoyer(
      a,
      gabaritCandidatureAcceptee,
      { marque: marque.slice(0, 120), lien_dossier: lienDossier },
      "candidature acceptée",
      `candidature-acceptee-${idCandidature}`
    )
  );
}
