import { planMarks } from "../game/ai";
import { EDGES, isNeighbor, ownerName, REGIONS, type RegionId } from "../game/map";
import type { Board as BoardState, Phase, Plan, Selection } from "../game/types";

type BoardProps = {
  board: BoardState;
  phase: Phase;
  selection: Selection;
  counsel: Plan | null;
  onSelect: (id: RegionId) => void;
};

export function Board({ board, phase, selection, counsel, onSelect }: BoardProps) {
  const counselMark = counselMarks(phase, counsel);
  const reveal = phase.type === "reveal" ? planMarks(phase.plan) : null;

  return (
    <div className="map-wrap">
      <div className="map" role="group" aria-label="Sector map">
        <svg className="map-svg" viewBox="0 0 100 100" aria-hidden="true">
          <ellipse className="map-lens-outer" cx="50" cy="48" rx="28" ry="20" />
          <ellipse className="map-lens" cx="50" cy="48" rx="16" ry="11" />
          {EDGES.map(([from, to]) => {
            const start = REGIONS[from];
            const end = REGIONS[to];
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const controlX = midX * 0.72 + 50 * 0.28;
            const controlY = midY * 0.72 + 48 * 0.28;
            return (
              <path
                key={`${from}-${to}`}
                d={`M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`}
              />
            );
          })}
        </svg>
        {REGIONS_IN_ORDER.map((id) => {
          const info = REGIONS[id];
          const region = board[id];
          const selected = isSelected(selection, id);
          const legal = isLegalTarget(phase, selection, id);
          const counselHere = counselMark === id;
          const intentHere = reveal?.from === id || reveal?.to === id || reveal?.place === id;
          return (
            <button
              key={id}
              type="button"
              className={regionClass(region.owner, {
                selected,
                legal,
                counsel: counselHere,
                intent: Boolean(intentHere),
                core: id === "core-well",
              })}
              style={{ left: `${info.x}%`, top: `${info.y}%` }}
              aria-pressed={selected}
              aria-label={`${info.title}, ${ownerName(region.owner)}, ${region.fleets} ${region.fleets === 1 ? "fleet" : "fleets"}. ${info.blurb}`}
              onClick={() => onSelect(id)}
            >
              <span className="region-fleets">{region.fleets}</span>
              <span className="region-name">{info.title}</span>
            </button>
          );
        })}
      </div>
      <ul className="legend">
        <li><i className="swatch swatch-player" /> You</li>
        <li><i className="swatch swatch-ai" /> Opposition</li>
        <li><i className="swatch swatch-neutral" /> Unaligned</li>
        <li><i className="swatch swatch-counsel" /> Counsel</li>
      </ul>
    </div>
  );
}

const REGIONS_IN_ORDER = [
  "amber-gate",
  "north-drift",
  "south-ash",
  "core-well",
  "quiet-halo",
  "violet-gate",
  "the-lens",
] as const satisfies readonly RegionId[];

function counselMarks(phase: Phase, counsel: Plan | null): RegionId | null {
  if (!counsel) return null;
  const marks = planMarks(counsel);
  switch (phase.type) {
    case "reinforce":
      return marks.place;
    case "orders":
      return marks.to;
    case "reveal":
    case "over":
      return null;
    default: {
      const unreachable: never = phase;
      return unreachable;
    }
  }
}

function isSelected(selection: Selection, id: RegionId): boolean {
  switch (selection.type) {
    case "none":
      return false;
    case "source":
      return selection.regionId === id;
    case "target":
      return selection.from === id || selection.to === id;
    default: {
      const unreachable: never = selection;
      return unreachable;
    }
  }
}

function isLegalTarget(phase: Phase, selection: Selection, id: RegionId): boolean {
  if (phase.type !== "orders" || selection.type !== "source") return false;
  return isNeighbor(selection.regionId, id);
}

function regionClass(
  owner: BoardState[RegionId]["owner"],
  flags: { selected: boolean; legal: boolean; counsel: boolean; intent: boolean; core: boolean },
): string {
  const classes = ["region", ownerClass(owner)];
  if (flags.selected) classes.push("is-selected");
  if (flags.legal) classes.push("is-legal");
  if (flags.counsel) classes.push("is-counsel");
  if (flags.intent) classes.push("is-intent");
  if (flags.core) classes.push("is-core");
  return classes.join(" ");
}

function ownerClass(owner: BoardState[RegionId]["owner"]): string {
  switch (owner) {
    case "player":
      return "region-player";
    case "ai":
      return "region-ai";
    case "neutral":
      return "region-neutral";
    default: {
      const unreachable: never = owner;
      return unreachable;
    }
  }
}
