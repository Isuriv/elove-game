import {
  neighbors,
  opposite,
  REGION_IDS,
  regionSentence,
  type Actor,
  type RegionId,
} from "./map";
import { applyOrder, cloneBoard, income, orderKind, placeFleets } from "./rules";
import type { Board, Intent, Order, Plan } from "./types";

const ORDER_FLOOR = 12;

export function makePlan(board: Board, side: Actor, mode: "full" | "orders-only"): Plan {
  let cursor = cloneBoard(board);
  const intents: Intent[] = [];

  if (mode === "full") {
    const gain = income(cursor, side);
    const spot = gain > 0 ? bestPlacement(cursor, side) : null;
    if (spot && gain > 0) {
      const placed = placeFleets(cursor, side, spot.id, gain);
      if (placed.ok) {
        cursor = placed.board;
        intents.push({
          type: "place",
          regionId: spot.id,
          count: gain,
          because: spot.because,
        });
      }
    }
  }

  for (let step = 0; step < 2; step += 1) {
    const choice = bestOrder(cursor, side);
    if (!choice || choice.score < ORDER_FLOOR) break;
    const applied = applyOrder(cursor, side, choice.order);
    if (!applied.ok) break;
    cursor = applied.board;
    intents.push(choice.intent);
  }

  const hasOrder = intents.some((intent) => intent.type === "attack" || intent.type === "shift");
  if (!hasOrder) {
    intents.push({
      type: "hold",
      because: "No attack or shift is worth the fleets. Hold the line.",
    });
  }

  return { side, summary: summarize(side, intents), intents };
}

export function applyPlan(board: Board, plan: Plan): { board: Board; lines: string[] } {
  let cursor = board;
  const lines: string[] = [];
  for (const intent of plan.intents) {
    const applied = applyIntent(cursor, plan.side, intent);
    cursor = applied.board;
    if (applied.line) lines.push(applied.line);
  }
  return { board: cursor, lines };
}

function applyIntent(board: Board, side: Actor, intent: Intent): { board: Board; line: string } {
  switch (intent.type) {
    case "place":
      return placeFleets(board, side, intent.regionId, intent.count);
    case "attack":
    case "shift":
      return applyOrder(board, side, {
        type: intent.type,
        from: intent.from,
        to: intent.to,
        fleets: intent.fleets,
      });
    case "hold":
      return { board, line: holdLine(side) };
    default: {
      const unreachable: never = intent;
      return { board, line: `Unhandled intent ${JSON.stringify(unreachable)}.` };
    }
  }
}

function holdLine(side: Actor): string {
  switch (side) {
    case "player":
      return "You hold the line.";
    case "ai":
      return "The opposition holds the line.";
    default: {
      const unreachable: never = side;
      return unreachable;
    }
  }
}

type Placement = { id: RegionId; score: number; because: string };

function bestPlacement(board: Board, side: Actor): Placement | null {
  let best: Placement | null = null;
  for (const id of REGION_IDS) {
    if (board[id].owner !== side) continue;
    const score = scorePlacement(board, side, id);
    const because = explainPlacement(board, side, id);
    if (!best || score > best.score) best = { id, score, because };
  }
  return best;
}

function scorePlacement(board: Board, side: Actor, id: RegionId): number {
  const enemy = opposite(side);
  let score = 0;
  if (id === "core-well") score += 14;
  for (const near of neighbors(id)) {
    const region = board[near];
    if (near === "core-well" && region.owner !== side) score += 8;
    if (region.owner === enemy) {
      score += 5;
      if (region.fleets >= board[id].fleets) score += 6;
    } else if (region.owner !== side && region.fleets > 0 && region.fleets <= 2) {
      score += 3;
    }
  }
  return score;
}

function explainPlacement(board: Board, side: Actor, id: RegionId): string {
  const enemy = opposite(side);
  const nearCore = neighbors(id).includes("core-well") && board["core-well"].owner !== side;
  const weak = neighbors(id).find((near) => {
    const region = board[near];
    return region.owner !== side && region.fleets > 0 && region.fleets <= 2;
  });
  const pressed = neighbors(id).some(
    (near) => board[near].owner === enemy && board[near].fleets >= board[id].fleets,
  );
  if (id === "core-well") return "the Core Well is already yours and should be made heavy";
  if (nearCore && weak) return `it borders the Core Well, and ${regionSentence(weak)} is lightly held`;
  if (nearCore && pressed) return "it borders the Core Well and is under pressure";
  if (nearCore) return "it borders the Core Well";
  if (pressed) return "an adjacent fleet already matches or beats it";
  if (weak) return `${regionSentence(weak)} can be taken from here`;
  return "it is the surest ground still held";
}

type OrderChoice = { score: number; order: Order; intent: Intent };

function bestOrder(board: Board, side: Actor): OrderChoice | null {
  let best: OrderChoice | null = null;
  for (const from of REGION_IDS) {
    if (board[from].owner !== side || board[from].fleets < 1) continue;
    for (const to of neighbors(from)) {
      const kind = orderKind(board, side, to);
      for (let fleets = 1; fleets <= board[from].fleets; fleets += 1) {
        const scored = scoreOrder(board, side, from, to, fleets, kind);
        if (!best || scored.score > best.score) {
          best = {
            score: scored.score,
            order: { type: kind, from, to, fleets },
            intent:
              kind === "attack"
                ? { type: "attack", from, to, fleets, because: scored.because }
                : { type: "shift", from, to, fleets, because: scored.because },
          };
        }
      }
    }
  }
  return best;
}

function strongestCounter(board: Board, side: Actor, to: RegionId, from: RegionId): number {
  const enemy = opposite(side);
  let best = 0;
  for (const near of neighbors(to)) {
    if (near === from) continue;
    if (board[near].owner === enemy) best = Math.max(best, board[near].fleets);
  }
  if (best > 0) best += income(board, enemy);
  return best;
}

function scoreOrder(
  board: Board,
  side: Actor,
  from: RegionId,
  to: RegionId,
  fleets: number,
  kind: "attack" | "shift",
): { score: number; because: string } {
  const source = board[from];
  const target = board[to];
  const leaving = source.fleets - fleets;
  let score = 0;
  if (leaving === 0) {
    score -= 10;
    if (neighbors(from).includes("core-well")) score -= 12;
  }

  if (from === "core-well") score -= board["core-well"].fleets - fleets < 3 ? 40 : 12;

  if (kind === "shift") {
    const towardCore =
      from !== "core-well" &&
      to !== "core-well" &&
      neighbors(to).includes("core-well") &&
      !neighbors(from).includes("core-well");
    score += to === "core-well" ? 22 : 6;
    if (towardCore) score += 10;
    const enemy = opposite(side);
    const pressed = neighbors(to).some(
      (near) => board[near].owner === enemy && board[near].fleets >= target.fleets + fleets,
    );
    if (pressed) score += 8;
    const because =
      to === "core-well"
        ? "the Core Well is the claim that matters"
        : towardCore
          ? "the fleets move closer to the Core Well"
          : `the border at ${regionSentence(to)} wants the weight`;
    return { score, because };
  }

  const margin = fleets - target.fleets;
  if (margin > 0) {
    score += 22 + Math.min(margin, 4);
    const desired = to === "core-well" ? 3 : 1;
    const ideal = target.fleets + desired;
    if (fleets > ideal) score -= (fleets - ideal) * 3;
    const counter = strongestCounter(board, side, to, from);
    const breakingWin = target.owner === opposite(side) && target.fleets >= 3;
    if (to === "core-well") {
      score += margin >= 3 ? 70 : 8;
      if (margin < 3) score -= (3 - margin) * 3;
      if (breakingWin) score += 85;
      if (counter >= margin && margin < 3 && !breakingWin) score -= 36;
    } else {
      score += 16;
      if (neighbors(to).includes("core-well")) score += 10;
      if (counter >= margin) score -= 48;
    }
    const because =
      to === "core-well"
        ? `the garrison is ${target.fleets}, and ${fleets} ${fleets === 1 ? "fleet leaves" : "fleets leave"} ${margin} on the Core Well`
        : `${regionSentence(to)} is held by ${target.fleets}, and ${fleets} ${fleets === 1 ? "is" : "are"} enough to take it`;
    return { score, because };
  }
  if (margin === 0) {
    score += to === "core-well" ? 2 : -12;
    if (to === "core-well" && target.owner === opposite(side) && target.fleets >= 3) score += 60;
    return {
      score,
      because: `equal strength at ${regionSentence(to)} would clear both sides`,
    };
  }
  score -= 25;
  const chipsCore =
    to === "core-well" &&
    target.owner === opposite(side) &&
    target.fleets >= 3 &&
    target.fleets - fleets < 3;
  if (chipsCore) score += 48;
  return {
    score,
    because: chipsCore
      ? "it knocks the Core Well under three fleets"
      : `a strike on ${regionSentence(to)} would fall short`,
  };
}

function summarize(side: Actor, intents: Intent[]): string {
  const lead = side === "ai" ? "The opposition" : "Counsel";
  const sentences = intents.map((intent) => sentenceFor(intent));
  return `${lead}. ${sentences.join(" ")}`;
}

function sentenceFor(intent: Intent): string {
  switch (intent.type) {
    case "place": {
      const noun = intent.count === 1 ? "fleet" : "fleets";
      return `Place ${intent.count} ${noun} on ${regionSentence(intent.regionId)}, because ${intent.because}.`;
    }
    case "attack":
      return `Attack ${regionSentence(intent.to)} from ${regionSentence(intent.from)} with ${intent.fleets}, because ${intent.because}.`;
    case "shift":
      return `Shift ${intent.fleets} from ${regionSentence(intent.from)} to ${regionSentence(intent.to)}, because ${intent.because}.`;
    case "hold":
      return intent.because;
    default: {
      const unreachable: never = intent;
      return `Unhandled intent ${JSON.stringify(unreachable)}.`;
    }
  }
}

export function planMarks(plan: Plan | null): { place: RegionId | null; from: RegionId | null; to: RegionId | null } {
  const marks = { place: null as RegionId | null, from: null as RegionId | null, to: null as RegionId | null };
  if (!plan) return marks;
  for (const intent of plan.intents) {
    switch (intent.type) {
      case "place":
        if (!marks.place) marks.place = intent.regionId;
        break;
      case "attack":
      case "shift":
        if (!marks.from) {
          marks.from = intent.from;
          marks.to = intent.to;
        }
        break;
      case "hold":
        break;
      default: {
        const unreachable: never = intent;
        void unreachable;
        break;
      }
    }
  }
  return marks;
}

