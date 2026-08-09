"use client";

import { useActionState } from "react";
import { addBrandManager, removeBrandManager } from "@/app/admin/actions";
import type { Profile } from "@/lib/types";
import DeleteButton from "./DeleteButton";
import SubmitBar from "./SubmitBar";
import { FIELD, Label } from "./fields";

type Result = { ok: boolean; error?: string };

/**
 * Qui peut gérer cette marque depuis /espace-marque.
 * Formulaire séparé de la fiche : rattacher quelqu'un n'a rien à voir
 * avec modifier la description, et mélanger les deux ferait perdre la
 * saisie en cours à chaque ajout.
 */
export default function BrandManagers({
  brandId,
  managers,
}: {
  brandId: string;
  managers: Profile[];
}) {
  const [state, formAction] = useActionState(
    async (_prev: Result | null, formData: FormData) => addBrandManager(formData),
    null
  );

  return (
    <section className="glass mt-8 p-4 sm:p-7">
      <h2 className="m-0 text-[17px] font-extrabold text-white">Gérants de la marque</h2>
      <p className="m-0 mt-2 text-[13.5px] leading-relaxed text-white/72">
        Ces comptes peuvent modifier la présentation et les pièces de cette marque,
        depuis leur espace. Ils ne peuvent ni la publier, ni la mettre à la une,
        ni toucher aux autres marques.
      </p>

      {managers.length > 0 && (
        <ul className="m-0 mt-5 flex list-none flex-col gap-2 p-0">
          {managers.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[13px] bg-white/10 px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-bold text-white">
                  {m.display_name ?? m.email}
                </span>
                {m.display_name && (
                  <span className="block truncate text-[12px] text-white/60">{m.email}</span>
                )}
              </span>
              <DeleteButton
                action={removeBrandManager}
                id={m.id}
                label="Retirer"
                confirmText="Retirer cet accès ? La personne ne pourra plus modifier la fiche."
                extra={{ brand_id: brandId }}
              />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="brand_id" value={brandId} />
        <div>
          <Label
            htmlFor="manager-email"
            hint="La personne doit déjà avoir créé son compte sur le site."
          >
            Rattacher un compte
          </Label>
          <input
            id="manager-email"
            name="email"
            type="email"
            required
            className={FIELD}
            placeholder="contact@tamarque.fr"
          />
        </div>

        {state?.error && (
          <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] leading-relaxed text-white">
            {state.error}
          </p>
        )}

        <SubmitBar label="Rattacher" />
      </form>
    </section>
  );
}
