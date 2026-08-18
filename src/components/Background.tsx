const GLYPHS_L = "-+~-+~+-~+~-";
const GLYPHS_R = "+~-+~+~-+-~+";

function Track({ seq, side }: { seq: string; side: "left" | "right" }) {
  const doubled = (seq + seq).split("");
  return (
    <div className={`glyphs ${side}`} aria-hidden="true">
      <div className="glyph-track">
        {doubled.map((g, i) => (
          <span key={i}>{g}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Le decor de marque : degrade anime, glyphes, blobs chromes, voile.
 *
 * `phase` sert quand on en affiche un SECOND exemplaire, par exemple
 * dans le menu de telephone. Ses animations repartiraient de zero,
 * alors que celles de la page tournent depuis des minutes : les deux
 * n'afficheraient pas la meme couleur au meme instant, et la frontiere
 * entre les deux se verrait. On lui donne donc un retard negatif egal
 * au temps ecoule, ce qui le place exactement au meme point du cycle.
 *
 * Un seul retard suffit pour toutes les animations, quelle que soit
 * leur duree : la phase d'une animation est le temps ecoule modulo sa
 * duree, donc reculer toutes les horloges du meme temps les aligne.
 */
export default function Background({
  phase = 0,
  marque,
}: {
  phase?: number;
  /** Permet de distinguer deux exemplaires. Voir synchroniserDecors(). */
  marque?: string;
}) {
  return (
    /*
     * Tout le décor vit dans un seul cadre, et ce cadre découpe.
     *
     * Les blobs chromés dépassent volontairement de l'écran — c'est ce
     * qui les fait paraître posés dans les coins plutôt que collés
     * dedans. Mais un élément en position fixe n'est retenu par aucun
     * parent : il déborde de la fenêtre, et le navigateur ajoute une
     * barre de défilement horizontale. D'où le trait sombre le long du
     * bord droit.
     *
     * `contain: paint` fait de ce cadre un contenant pour les éléments
     * fixes qu'il abrite. Combiné à `overflow: clip`, plus rien ne peut
     * sortir de l'écran, quelle que soit la taille des blobs.
     */
    <div
      className="decor"
      data-decor={marque}
      aria-hidden="true"
      style={phase ? ({ "--phase": `-${Math.round(phase)}ms` } as React.CSSProperties) : undefined}
    >
      {/* Le dégradé vit sur son propre calque, à l'intérieur du cadre.
          Il dérivait en animant sa position de fond, ce qui oblige le
          navigateur à repeindre tout l'écran à chaque image ; une
          transformation se contente de déplacer un calque déjà peint.
          Voir `.bg-degrade` dans globals.css. */}
      <div className="bg" aria-hidden="true">
        <div className="bg-degrade" />
      </div>
      <div className="bg-nappe" aria-hidden="true" />
      <div className="bg-lueur" aria-hidden="true" />
      <Track seq={GLYPHS_L} side="left" />
      <Track seq={GLYPHS_R} side="right" />

      <div className="chrome c-tl" aria-hidden="true">
        <img src="/brand/chrome1.webp" alt="" />
      </div>
      <div className="chrome c-tr" aria-hidden="true">
        <img src="/brand/chrome2.webp" alt="" />
      </div>
      <div className="chrome c-bl" aria-hidden="true">
        <img src="/brand/chrome3.webp" alt="" />
      </div>
      <div className="chrome c-br" aria-hidden="true">
        <img src="/brand/chrome1.webp" alt="" />
      </div>

      <div className="scrim" aria-hidden="true" />
    </div>
  );
}
