"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmation } from "@/lib/confirmation";
import { deleteUserAccount } from "@/app/admin/actions";
import { IconTrash } from "@/components/Icons";

/** Suppression définitive d'un compte, isolée en bas de page. */
export default function DangerZone({
  userId,
  email,
  bloque,
}: {
  userId: string;
  email: string;
  /** Raison pour laquelle la suppression est impossible, s'il y en a une. */
  bloque?: string;
}) {
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { arme, demander, desarmer } = useConfirmation();

  function supprimer() {
    if (!demander()) {
      setNote(
        `Appuie encore pour supprimer définitivement le compte de ${email}. Ses favoris, coups de cœur et rattachements partiront avec ; les marques resteront.`
      );
      return;
    }
    desarmer();

    const formData = new FormData();
    formData.set("user_id", userId);

    startTransition(async () => {
      const res = await deleteUserAccount(formData);
      if (!res.ok) {
        setNote(res.error ?? "La suppression a échoué.");
        return;
      }
      router.push("/admin/utilisateurs");
      router.refresh();
    });
  }

  return (
    <section className="mt-10 border-t border-white/15 pt-8">
      <h2 className="m-0 text-[16px] font-extrabold text-white">Supprimer ce compte</h2>
      <p className="m-0 mt-2 max-w-xl text-[13.5px] leading-relaxed text-white/70">
        Le profil, les favoris, les coups de cœur et les rattachements de marque
        disparaissent. Les marques restent : elles appartiennent au site, pas au compte
        qui les gérait.
      </p>

      {bloque ? (
        <p className="m-0 mt-4 rounded-[13px] bg-white/10 px-4 py-3 text-[13px] text-white/80">
          {bloque}
        </p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={supprimer}
          onBlur={desarmer}
          className={`mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[12.5px] font-bold text-white transition disabled:opacity-50 active:scale-[.97] ${
            arme
              ? "border-[#ff9db0] bg-[rgba(194,39,63,0.4)]"
              : "border-[#c2273f]/60 bg-[rgba(194,39,63,0.14)] hover:bg-[#c2273f]"
          }`}
        >
          <IconTrash />{" "}
          {pending ? "Suppression…" : arme ? "Confirmer la suppression" : "Supprimer définitivement"}
        </button>
      )}

      {note && (
        <p className="m-0 mt-3 rounded-[13px] bg-white/12 px-4 py-3 text-[13px] text-white">{note}</p>
      )}
    </section>
  );
}
