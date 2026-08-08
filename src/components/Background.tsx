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

/** Le decor de marque : degrade anime, glyphes, blobs chromes, voile. */
export default function Background() {
  return (
    <>
      <div className="bg" aria-hidden="true" />
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
    </>
  );
}
