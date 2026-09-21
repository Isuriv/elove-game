import { Link } from "react-router-dom";
import { useTitle } from "../useTitle";

const OFFERINGS = [
  {
    to: "/strategy",
    index: "01",
    kicker: "Strategy",
    title: "Wellfront",
    text: "A turn-based claim on seven regions around a dark well. Two orders a turn. Hold the core.",
  },
  {
    to: "/story",
    index: "02",
    kicker: "Story",
    title: "The Early Voice",
    text: "A survey log from the skiff Meridian. The lens speaks in your voice, three hours early.",
  },
  {
    to: "/mind",
    index: "03",
    kicker: "Strategy mind",
    title: "Plain speech",
    text: "A local mind that scores the board, says what it will do, and then does exactly that.",
  },
] as const;

export function HomePage() {
  useTitle("Dark Matter");
  return (
    <div className="home">
      <div className="home-copy">
        <p className="eyebrow">Elove Game Company</p>
        <h1 className="wordmark">
          <span>Dark</span>
          <span>Matter</span>
        </h1>
        <p className="lede">
          Three instruments for a sky that bends. Claim the well. Answer the voice that arrived
          early. Read the plan before the other fleet moves.
        </p>
      </div>
      <div className="home-side">
        <LensMark />
        <nav className="offerings" aria-label="Games">
          {OFFERINGS.map((offering) => (
            <Link key={offering.to} className="offering" to={offering.to}>
              <span className="offering-index">{offering.index}</span>
              <span>
                <span className="offering-kicker">{offering.kicker}</span>
                <span className="offering-title">{offering.title}</span>
                <span className="offering-text">{offering.text}</span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function LensMark() {
  return (
    <svg className="lens" viewBox="0 0 400 400" aria-hidden="true">
      <ellipse className="lens-ring lens-slow" cx="200" cy="200" rx="158" ry="102" />
      <ellipse className="lens-ring lens-violet" cx="200" cy="200" rx="112" ry="154" />
      <ellipse className="lens-ring lens-fast" cx="200" cy="208" rx="74" ry="48" />
      <circle className="lens-core" cx="200" cy="200" r="6" />
      <circle className="lens-mass" cx="232" cy="184" r="3.2" />
    </svg>
  );
}
