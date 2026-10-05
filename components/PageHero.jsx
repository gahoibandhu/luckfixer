// components/PageHero.jsx — the dark "night sky" band at the top of each public page: glyph, title and one line of context.
// Must be the first child inside <PublicShell> (it pulls itself edge-to-edge with negative margins).
export default function PageHero({ glyph = '✦', title, sub = null }) {
  return (
    <div className="pub-pagehero">
      <div className="pub-pagehero-in">
        <span className="gl" aria-hidden="true">{glyph}</span>
        <div>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
      </div>
    </div>
  );
}
