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

/**
 * Liste de cases a cocher. Toutes portent le meme "name", donc le
 * formulaire envoie plusieurs valeurs que l'action serveur relit avec
 * formData.getAll() : c'est exactement ce qu'attend une colonne tableau
 * en base. Aucun JavaScript n'est necessaire.
 */
export function CheckGroup({
  name,
  label,
  hint,
  options,
  selected = [],
}: {
  name: string;
  label: string;
  hint?: string;
  options: string[];
  selected?: string[];
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="eyebrow mb-2 p-0">{label}</legend>
      {hint && <p className="m-0 mb-3 text-[12px] font-medium text-white/58">{hint}</p>}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const id = `${name}-${option.replace(/[^a-zA-Z0-9]+/g, "-")}`;
          return (
            <label
              key={option}
              htmlFor={id}
              className="group cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id={id}
                name={name}
                value={option}
                defaultChecked={selected.includes(option)}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-[12px] font-bold text-white/80 transition hover:bg-white/20 hover:text-white peer-checked:border-white peer-checked:bg-white peer-checked:text-[var(--color-ink)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white">
                {option}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
