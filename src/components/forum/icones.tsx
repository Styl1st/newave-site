/** Les deux pictogrammes propres au forum : le vote et la bulle de réponse. */

type Props = { className?: string; plein?: boolean };

export function IconVote({ className = "h-3.5 w-3.5", plein = false }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 5 20 18H4Z"
        fill={plein ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBulle({ className = "h-3.5 w-3.5" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinejoin="round"
    >
      <path d="M4 5.5h16v10H10l-4.5 3.5v-3.5H4z" />
    </svg>
  );
}
