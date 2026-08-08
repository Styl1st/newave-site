import Link from "next/link";
import { IconBack } from "./Icons";

/**
 * Lien de retour.
 *
 * Auparavant c'était du texte souligné qu'on ne repérait pas. Une
 * pastille bordée avec une flèche se lit comme un bouton, et la zone
 * cliquable dépasse les 44 px recommandés au doigt.
 */
export default function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/8 py-2.5 pl-3.5 pr-4.5 text-[12.5px] font-bold text-white/85 transition hover:border-white/60 hover:bg-white/18 hover:text-white active:scale-[.97]"
    >
      <IconBack />
      <span className="truncate">{children}</span>
    </Link>
  );
}
