"use client";

import { useFormStatus } from "react-dom";

export default function SubmitBar({ label = "Enregistrer" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="card-light px-7 py-3.5 disabled:opacity-60">
      <span className="relative z-3 text-[14px] font-extrabold">
        {pending ? "Enregistrement…" : label}
      </span>
    </button>
  );
}
