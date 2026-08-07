"use client";

export default function DeleteButton({
  action,
  id,
  label = "Supprimer",
  confirmText = "Supprimer définitivement ? C'est irréversible.",
  extra,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label?: string;
  confirmText?: string;
  /** Champs cachés supplémentaires, par exemple le slug de la marque. */
  extra?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {Object.entries(extra ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        className="rounded-full border border-white/35 px-5 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/12 hover:text-white"
      >
        {label}
      </button>
    </form>
  );
}
