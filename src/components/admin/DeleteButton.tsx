"use client";

export default function DeleteButton({
  action,
  id,
  label = "Supprimer",
  confirmText = "Supprimer définitivement ? C'est irréversible.",
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-white/35 px-5 py-2.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/12 hover:text-white"
      >
        {label}
      </button>
    </form>
  );
}
