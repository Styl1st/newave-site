"use client";

import { useConfirmation } from "@/lib/confirmation";

/**
 * Suppression protégée par une confirmation dans la page.
 *
 * On n'utilise plus window.confirm : sur téléphone, le navigateur peut
 * l'escamoter, et confirm() renvoie alors false sans rien montrer. Le
 * bouton paraissait cassé.
 */
export default function DeleteButton({
  action,
  id,
  label = "Supprimer",
  confirmText = "Appuie encore pour supprimer définitivement.",
  extra,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label?: string;
  confirmText?: string;
  /** Champs cachés supplémentaires, par exemple le slug de la marque. */
  extra?: Record<string, string>;
}) {
  const { arme, demander, desarmer } = useConfirmation();

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!demander()) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1.5"
    >
      <input type="hidden" name="id" value={id} />
      {Object.entries(extra ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        onBlur={desarmer}
        className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[12.5px] font-bold transition active:scale-[.97] ${
          arme
            ? "border border-[#ff9db0] bg-[rgba(194,39,63,0.35)] text-white"
            : "border border-white/30 bg-white/8 text-white/85 hover:border-white/60 hover:bg-white/18 hover:text-white"
        }`}
      >
        {arme ? "Confirmer" : label}
      </button>
      {arme && (
        <p className="m-0 max-w-[220px] text-right text-[11px] leading-snug text-white/70">
          {confirmText}
        </p>
      )}
    </form>
  );
}
