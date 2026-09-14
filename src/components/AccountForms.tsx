"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateDisplayName } from "@/app/compte/actions";
import { createClient } from "@/lib/supabase/client";
import { FIELD, Label } from "./admin/fields";

/**
 * Changement d'adresse email.
 *
 * Supabase écrit AUX DEUX ADRESSES, l'ancienne et la nouvelle, et le
 * changement n'est effectif qu'une fois les deux liens ouverts. C'est
 * le réglage « Secure email change », et il est le bon : sans lui,
 * quelqu'un qui aurait mis la main sur une session ouverte pourrait
 * déplacer le compte vers sa propre boîte, et le vrai propriétaire ne
 * serait jamais prévenu de rien.
 *
 * La contrainte, c'est qu'il FAUT le dire. Quelqu'un qui ouvre un seul
 * lien, voit que son adresse n'a pas bougé et en conclut que le site
 * est cassé va écrire — soit exactement le travail qu'on voulait
 * éviter. Le message de confirmation nomme donc les deux boîtes.
 *
 * C'est une fonction et non un composant parce que le formulaire ne
 * l'appelle plus seul : le bouton d'enregistrement de « Mon compte »
 * peut avoir deux choses à faire partir d'un même geste, vers deux
 * destinations qui n'échouent pas ensemble.
 */
export async function changerAdresse(
  email: string,
  actuel: string
): Promise<{ ok: boolean; text: string }> {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, text: "Cette adresse n'a pas l'air valide." };
  }

  const supabase = createClient();
  if (!supabase) return { ok: false, text: "Supabase n'est pas configuré." };

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${window.location.origin}/auth/callback?suite=/compte` }
  );

  if (error) {
    // On traduit ce qu'on sait traduire. Le reste passe tel quel :
    // un message anglais reste plus utile qu'un « une erreur est
    // survenue » qui n'apprend rien à personne.
    const dejaPrise = /already (been )?registered|already exists/i.test(error.message);
    return {
      ok: false,
      text: dejaPrise
        ? "Un compte utilise déjà cette adresse."
        : `Supabase répond : ${error.message}`,
    };
  }

  return {
    ok: true,
    text:
      `Deux messages viennent de partir : un à ${actuel}, un à ${email}. ` +
      "Il faut ouvrir les DEUX liens pour que le changement soit pris en compte. " +
      "Tant que ce n'est pas fait, ton adresse actuelle reste la bonne.",
  };
}

/**
 * Le nom et l'adresse, sur une seule page et sous un seul bouton.
 *
 * ⚠️ UN BOUTON, MAIS DEUX DESTINATIONS ET DEUX MESSAGES. Le nom part en
 * base par une action serveur ; l'adresse part dans Supabase Auth et n'y
 * change rien avant que deux liens soient ouverts. Les deux peuvent
 * échouer séparément, et régulièrement l'un passe quand l'autre ne
 * passe pas. C'est pourquoi il y avait deux formulaires.
 *
 * On garde donc la seule chose qui comptait dans cette séparation : le
 * verdict s'affiche SOUS LE CHAMP CONCERNÉ, jamais en une ligne commune.
 * Une barre qui dirait « Enregistré » pendant qu'une des deux moitiés a
 * échoué mentirait une fois sur deux — et c'est un mensonge qu'on ne
 * découvre qu'en revenant sur la page, longtemps après.
 *
 * ON N'ENVOIE QUE CE QUI A CHANGÉ. Sans cette comparaison, enregistrer
 * son nom redemanderait une confirmation d'adresse par mail à chaque
 * fois, pour une adresse identique à celle du compte.
 */
export function MonCompteForm({
  nomActuel,
  emailActuel,
}: {
  nomActuel: string;
  /** `null` pour un compte sans adresse : le champ disparaît, le nom reste. */
  emailActuel: string | null;
}) {
  const [nom, setNom] = useState(nomActuel);
  const [email, setEmail] = useState(emailActuel ?? "");
  const [enCours, setEnCours] = useState(false);
  const [motNom, setMotNom] = useState<{ ok: boolean; text: string } | null>(null);
  const [motEmail, setMotEmail] = useState<{ ok: boolean; text: string } | null>(null);

  /* La casse et les espaces ne font pas un changement : quelqu'un qui
     efface un espace de fin ne demande pas une confirmation par mail. */
  const nomChange = nom.trim() !== nomActuel.trim() && nom.trim() !== "";
  const emailChange =
    Boolean(emailActuel) && email.trim().toLowerCase() !== emailActuel!.trim().toLowerCase();
  const aFaire = nomChange || emailChange;

  async function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!aFaire || enCours) return;

    setEnCours(true);
    setMotNom(null);
    setMotEmail(null);

    if (nomChange) {
      const data = new FormData();
      data.set("display_name", nom.trim());
      const res = await updateDisplayName(data);
      setMotNom({
        ok: res.ok,
        text: res.ok ? (res.message ?? "Nom mis à jour.") : (res.error ?? "Le nom n'a pas pu être enregistré."),
      });
    }

    if (emailChange) {
      setMotEmail(await changerAdresse(email.trim().toLowerCase(), emailActuel!));
    }

    setEnCours(false);
  }

  const note = "m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13px] leading-relaxed text-white";

  return (
    <form onSubmit={enregistrer} className="flex flex-col gap-4">
      <section className="glass rise rise-2 flex flex-col gap-5 p-4 sm:p-[26px]">
      <h2 className="m-0 text-[17px] font-extrabold text-white">Ton identité</h2>

      <div>
        <Label htmlFor="display_name" hint="C'est ce qui s'affiche dans ton espace.">
          Nom affiché
        </Label>
        <input
          id="display_name"
          name="display_name"
          value={nom}
          onChange={(ev) => setNom(ev.target.value)}
          required
          className={`${FIELD} min-h-[50px]`}
        />
        {motNom && <p className={`${note} mt-2.5`}>{motNom.text}</p>}
      </div>

      {emailActuel && (
        <div>
          <Label htmlFor="email" hint="C'est aussi l'adresse avec laquelle tu te connectes.">
            Adresse email
          </Label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            className={`${FIELD} min-h-[50px]`}
          />

          {/* La règle des deux boîtes se dit AVANT l'envoi, pas seulement
              après. Quelqu'un qui ne la découvre qu'une fois les messages
              partis a déjà eu le temps de croire que le changement était
              pris, et de refermer la page. Elle s'efface quand le message
              d'envoi la reprend : la répéter juste au-dessus donnerait
              l'impression que l'un des deux blocs parle d'autre chose. */}
          {!motEmail?.ok && (
            <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-white/58">
              Il faudra ouvrir un lien dans l&apos;ancienne boîte et un dans la nouvelle.
            </p>
          )}

          {motEmail && <p className={`${note} mt-2.5`}>{motEmail.text}</p>}
        </div>
      )}

      </section>

      {/*
       * LA BARRE COLLE AU BAS DE L'ÉCRAN AU DOIGT, ET PAS AU-DELÀ.
       *
       * Elle est `sticky` et non `fixed` : elle occupe sa place dans le
       * flux, donc rien ne passe dessous et il n'y a aucun rembourrage
       * à ajouter au bas de la page pour la rattraper — c'est le bogue
       * que le brief redoute, et il n'a pas lieu d'être ici.
       *
       * Elle est POSÉE HORS DE LA CARTE, et non dedans : un voile
       * dégradé collé à l'intérieur d'un panneau arrondi déborde ses
       * deux coins du bas, et ce petit carré sombre se voit.
       *
       * Au grand écran, où toute la page tient sous les yeux, elle
       * redevient un bouton ordinaire aligné à gauche.
       */}
      <div className="sticky bottom-0 z-10 rounded-[18px] bg-[linear-gradient(180deg,rgba(20,8,52,0),rgba(20,8,52,.72)_58%)] pb-2 pt-7 backdrop-blur-[6px] lg:static lg:bg-none lg:p-0 lg:backdrop-blur-none">
        <button
          type="submit"
          disabled={!aFaire || enCours}
          className="flex min-h-[52px] w-full items-center justify-center rounded-[16px] bg-white px-6 text-[14px] font-extrabold text-[var(--color-ink)] transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45 lg:w-auto lg:min-h-0 lg:self-start lg:rounded-full lg:py-3.5"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

/**
 * Le mot de passe se change PAR EMAIL, et jamais directement ici.
 *
 * Il y avait avant, à cet endroit, un simple « nouveau mot de passe »
 * suivi d'une confirmation. C'était trop facile, au sens propre : une
 * session laissée ouverte sur un téléphone posé sur une table, et
 * n'importe qui pouvait changer le mot de passe en deux champs, donc
 * s'emparer du compte sans jamais avoir eu à prouver quoi que ce soit.
 *
 * Le détour par la boîte mail rétablit cette preuve. Il faut accéder à
 * la messagerie de la personne, ce qu'une session ouverte ne donne
 * pas. C'est une gêne de trente secondes contre une prise de compte,
 * et le marché est bon.
 *
 * Cela règle au passage le cas de qui s'est inscrit avec Google : il
 * n'a jamais eu de mot de passe, et ce chemin est aussi celui qui lui
 * permet d'en avoir un.
 *
 * Le délai de soixante secondes n'est pas de la méfiance envers la
 * personne : sans lui, un clic répété par impatience envoie cinq
 * messages identiques, et c'est exactement ce qui fait basculer un
 * expéditeur dans les indésirables.
 */
export function LienReinitialisation({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [attente, setAttente] = useState(0);

  useEffect(() => {
    if (attente <= 0) return;
    const t = setTimeout(() => setAttente((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [attente]);

  async function envoyer() {
    setPending(true);
    setNote(null);

    const supabase = createClient();
    if (!supabase) {
      setPending(false);
      setNote({ ok: false, text: "Supabase n'est pas configuré." });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Le meme detour que sur la page de connexion : c'est
      // /auth/callback qui echange le jeton du lien contre une vraie
      // session, sans quoi la page de reinitialisation s'ouvre sans
      // droits.
      redirectTo: `${window.location.origin}/auth/callback?suite=/reinitialisation`,
    });
    setPending(false);

    if (error) {
      setNote({ ok: false, text: `Supabase répond : ${error.message}` });
      return;
    }
    setAttente(60);
    setNote({
      ok: true,
      text: `Email envoyé à ${email}. Le lien est valable une heure, et une seule fois.`,
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={envoyer}
        disabled={pending || attente > 0}
        className="card-light w-full px-7 py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative z-3 text-[14px] font-extrabold">
          {pending ? "Envoi…" : "Réinitialiser mon mot de passe"}
        </span>
      </button>

      {note && (
        <p
          className={
            note.ok
              ? "m-0 mt-4 text-[13px] font-bold leading-relaxed text-white/85"
              : "m-0 mt-4 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] text-white"
          }
        >
          {note.text}
        </p>
      )}

      {/* Le décompte sort du bouton. Dedans, il remplaçait le seul
          endroit qui disait ce que ce bouton fait : on voyait « Renvoyer
          dans 47 s » sans plus savoir renvoyer quoi, et l'attente
          paraissait être une panne. */}
      {attente > 0 && (
        <p className="m-0 mt-2 text-[12px] font-semibold text-white/50">
          Renvoyer dans {attente} s
        </p>
      )}
    </div>
  );
}

/** Déconnexion. Passe par une route serveur pour vider le cookie. */
export function LogoutButton({ classe }: { classe?: string }) {
  const router = useRouter();

  return (
    /* Le formulaire ne se met pas en travers de la mise en page : au
       hub, le bouton fait toute la largeur, et un bloc intermédiaire
       de largeur automatique l'en empêcherait. */
    <form
      action="/auth/deconnexion"
      method="post"
      onSubmit={() => setTimeout(() => router.refresh(), 100)}
      className={classe ? "contents" : undefined}
    >
      <button
        type="submit"
        className={
          classe ??
          "rounded-full border border-white/40 bg-white/8 px-6 py-3 text-[13px] font-extrabold text-white transition hover:border-white/70 hover:bg-white/20 active:scale-[.97]"
        }
      >
        Se déconnecter
      </button>
    </form>
  );
}
