/**
 * Affiché pendant qu'une page se prépare.
 * Un squelette qui reprend la silhouette du contenu rassure davantage
 * qu'une roue qui tourne : on voit que quelque chose arrive.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-[var(--pad)] py-12">
      <div className="skeleton mb-4 h-4 w-32" />
      <div className="skeleton mb-8 h-10 w-2/3 max-w-md" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 260, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </div>
  );
}
