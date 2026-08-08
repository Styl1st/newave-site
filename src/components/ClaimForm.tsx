"use client";

import { useActionState } from "react";
import Link from "next/link";
import { claimBrand } from "@/app/admin/actions";
import SubmitBar from "./admin/SubmitBar";
import { Area, Text } from "./admin/fields";

type Result = { ok: boolean; error?: string; message?: string };

export default function ClaimForm({
  brandId,
  brandName,
  brandSlug,
  displayName,
}: {
  brandId: string;
  brandName: string;
  brandSlug: string;
  displayName: string;
}) {
  const [state, formAction] = useActionState(
    async (_prev: Result | null, formData: FormData) => claimBrand(formData),
    null
  );

  if (state?.ok) {
    return (
      <div className="glass p-8 text-center">
        <h2 className="m-0 text-[19px] font-extrabold text-white">Demande envoyée</h2>
        <p className="m-0 mt-3 text-[14.5px] leading-relaxed text-white/84">{state.message}</p>
        <Link href={`/marques/${brandSlug}`} className="card-light mt-6 inline-block px-6 py-3">
          <span className="relative z-3 text-[13.5px] font-extrabold">Retour à la fiche</span>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="glass flex flex-col gap-6 p-6 sm:p-8">
      <input type="hidden" name="brand_id" value={brandId} />
      <input type="hidden" name="brand_name" value={brandName} />

      <Text
        name="contact_name"
        label="Ton nom"
        required
        defaultValue={displayName}
        placeholder="Prénom Nom"
      />

      <Area
        name="pitch"
        label="Comment peut-on vérifier ?"
        hint="Une adresse email au nom de domaine de la marque, un message depuis son compte Instagram, une mention sur son site… Ce qui nous permet d'être sûrs."
        rows={7}
        placeholder="Je suis le fondateur de la marque. Tu peux me joindre sur contact@… ou vérifier depuis notre compte Instagram, je répondrai."
      />

      {state?.error && (
        <p className="m-0 rounded-[13px] bg-white/12 px-4 py-3 text-[13.5px] leading-relaxed text-white">
          {state.error}
        </p>
      )}

      <p className="m-0 text-[12.5px] leading-relaxed text-white/60">
        Cette demande ne te donne aucun accès immédiat. Elle arrive dans notre boîte,
        on vérifie, puis on t&apos;ouvre la page. C&apos;est ce qui protège les marques
        contre quelqu&apos;un qui prétendrait être toi.
      </p>

      <SubmitBar label="Envoyer ma demande" />
    </form>
  );
}
