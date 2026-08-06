/** Champs de formulaire partagés par toute l'administration. */

export const FIELD =
  "w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55";

export function Label({ htmlFor, children, hint }: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="eyebrow block">
        {children}
      </label>
      {hint && <p className="m-0 mt-1 text-[12px] font-medium text-white/58">{hint}</p>}
    </div>
  );
}

export function Text({ name, label, hint, ...rest }: {
  name: string;
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={name} hint={hint}>{label}</Label>
      <input id={name} name={name} className={FIELD} {...rest} />
    </div>
  );
}

export function Area({ name, label, hint, rows = 5, ...rest }: {
  name: string;
  label: string;
  hint?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <Label htmlFor={name} hint={hint}>{label}</Label>
      <textarea id={name} name={name} rows={rows} className={`${FIELD} resize-y`} {...rest} />
    </div>
  );
}

export function Select({ name, label, hint, children, ...rest }: {
  name: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <Label htmlFor={name} hint={hint}>{label}</Label>
      <select id={name} name={name} className={FIELD} {...rest}>
        {children}
      </select>
    </div>
  );
}

export function Check({ name, label, defaultChecked }: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[14px] font-bold text-white">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 rounded-md accent-[#7b52e8]"
      />
      {label}
    </label>
  );
}
