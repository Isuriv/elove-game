import {
  actorName,
  isNeighbor,
  opposite,
  REGION_IDS,
  regionSentence,
  regionTitle,
  type Actor,
  type RegionId,
  type Side,
} from "./map";
import {
  CORE_FLEETS_TO_WIN,
  REGIONS_TO_WIN,
  type Board,
  type Garrison,
  type Order,
} from "./types";

export function createBoard(): Board {
  return {
    "amber-gate": { id: "amber-gate", owner: "player", fleets: 3 },
    "south-ash": { id: "south-ash", owner: "player", fleets: 2 },
    "violet-gate": { id: "violet-gate", owner: "ai", fleets: 3 },
    "quiet-halo": { id: "quiet-halo", owner: "ai", fleets: 2 },
    "north-drift": { id: "north-drift", owner: "neutral", fleets: 1 },
    "the-lens": { id: "the-lens", owner: "neutral", fleets: 2 },
    "core-well": { id: "core-well", owner: "neutral", fleets: 3 },
  };
}

export function cloneBoard(board: Board): Board {
  const next = {} as Board;
  for (const id of REGION_IDS) {
    next[id] = { ...board[id] };
  }
  return next;
}

export function ownedCount(board: Board, side: Side): number {
  let count = 0;
  for (const id of REGION_IDS) {
    if (board[id].owner === side) count += 1;
  }
  return count;
}

export function fleetTotal(board: Board, side: Side): number {
  let total = 0;
  for (const id of REGION_IDS) {
    if (board[id].owner === side) total += board[id].fleets;
  }
  return total;
}

export function income(board: Board, side: Actor): number {
  return ownedCount(board, side);
}

export function warWeight(board: Board, side: Actor): number {
  let weight = 0;
  for (const id of REGION_IDS) {
    const region = board[id];
    if (region.owner !== side) continue;
    weight += id === "core-well" ? 5 : 2;
    weight += region.fleets;
  }
  return weight;
}

export type Victory = { winner: Actor; reason: string };

export function coreControl(board: Board, side: Actor): Victory | null {
  const core = board["core-well"];
  if (core.owner === side && core.fleets >= CORE_FLEETS_TO_WIN) {
    return {
      winner: side,
      reason:
        side === "player"
          ? "You kept the Core Well through their reply, with three fleets."
          : "The opposition kept the Core Well through your reply, with three fleets.",
    };
  }
  return null;
}

export function victoryOn(board: Board, side: Actor): Victory | null {
  if (ownedCount(board, side) >= REGIONS_TO_WIN) {
    return {
      winner: side,
      reason:
        side === "player"
          ? "Five regions answer to you."
          : "Five regions answer to the opposition.",
    };
  }
  const other = opposite(side);
  if (ownedCount(board, other) === 0 && ownedCount(board, side) > 0) {
    return {
      winner: side,
      reason:
        side === "player"
          ? "The violet fleet has nowhere left to stand."
          : "Your fleets have nowhere left to stand.",
    };
  }
  return null;
}

export function weighClaims(board: Board): Victory {
  const playerWeight = warWeight(board, "player");
  const aiWeight = warWeight(board, "ai");
  if (playerWeight > aiWeight) {
    return {
      winner: "player",
      reason: `Eight rounds close. Your claim weighs ${playerWeight}, theirs ${aiWeight}.`,
    };
  }
  if (aiWeight > playerWeight) {
    return {
      winner: "ai",
      reason: `Eight rounds close. Their claim weighs ${aiWeight}, yours ${playerWeight}.`,
    };
  }
  const core = board["core-well"];
  if (core.owner === "player" || core.owner === "ai") {
    return {
      winner: core.owner,
      reason: "The weights match. The Core Well breaks the tie.",
    };
  }
  return {
    winner: "player",
    reason: "The weights match, and the well leaves the map in your hands.",
  };
}

export type Applied = {
  board: Board;
  line: string;
  ok: boolean;
};

export function placeFleets(board: Board, side: Actor, regionId: RegionId, count: number): Applied {
  const region = board[regionId];
  if (region.owner !== side || count < 1) {
    return {
      board,
      ok: false,
      line: `${regionSentence(regionId)} cannot take those fleets.`,
    };
  }
  const next = cloneBoard(board);
  next[regionId] = { ...region, fleets: region.fleets + count };
  const noun = count === 1 ? "fleet" : "fleets";
  return {
    board: next,
    ok: true,
    line: `${actorName(side)} ${verb(side, "place", "places")} ${count} ${noun} on ${regionSentence(regionId)}.`,
  };
}

export function applyOrder(board: Board, side: Actor, order: Order): Applied {
  const source = board[order.from];
  const target = board[order.to];
  if (source.owner !== side) {
    return { board, ok: false, line: `${regionSentence(order.from)} is not yours to order.` };
  }
  if (!isNeighbor(order.from, order.to)) {
    return { board, ok: false, line: "Those regions do not touch." };
  }
  if (order.fleets < 1 || order.fleets > source.fleets) {
    return { board, ok: false, line: "That fleet count cannot leave the region." };
  }

  if (order.type === "shift") {
    return applyShift(board, side, source, target, order.fleets);
  }
  if (order.type === "attack") {
    return applyAttack(board, side, source, target, order.fleets);
  }
  const unreachable: never = order.type;
  return { board, ok: false, line: `Unknown order ${String(unreachable)}.` };
}

function applyShift(
  board: Board,
  side: Actor,
  source: Garrison,
  target: Garrison,
  fleets: number,
): Applied {
  const empty = target.owner === "neutral" && target.fleets === 0;
  if (target.owner !== side && !empty) {
    return { board, ok: false, line: `${regionSentence(target.id)} is not open to a shift.` };
  }
  const next = cloneBoard(board);
  const left = source.fleets - fleets;
  next[source.id] = left === 0 ? { id: source.id, owner: "neutral", fleets: 0 } : { ...source, fleets: left };
  next[target.id] = {
    id: target.id,
    owner: side,
    fleets: target.owner === side ? target.fleets + fleets : fleets,
  };
  const noun = fleets === 1 ? "fleet" : "fleets";
  const abandon = left === 0 ? ` ${regionTitle(source.id)} goes dark.` : "";
  return {
    board: next,
    ok: true,
    line: `${actorName(side)} ${verb(side, "shift", "shifts")} ${fleets} ${noun} from ${regionSentence(source.id)} to ${regionSentence(target.id)}.${abandon}`,
  };
}

function applyAttack(
  board: Board,
  side: Actor,
  source: Garrison,
  target: Garrison,
  fleets: number,
): Applied {
  if (target.owner === side) {
    return { board, ok: false, line: `${regionSentence(target.id)} is already held.` };
  }
  if (target.owner === "neutral" && target.fleets === 0) {
    return applyShift(board, side, source, target, fleets);
  }

  const next = cloneBoard(board);
  const left = source.fleets - fleets;
  next[source.id] = left === 0 ? { id: source.id, owner: "neutral", fleets: 0 } : { ...source, fleets: left };
  const margin = fleets - target.fleets;
  const subject = regionTitle(source.id);
  const object = regionSentence(target.id);

  if (margin > 0) {
    next[target.id] = { id: target.id, owner: side, fleets: margin };
    return {
      board: next,
      ok: true,
      line: `${subject} sends ${fleets} against ${object} (${target.fleets}). ${actorName(side)} ${verb(side, "take", "takes")} it with ${margin}.`,
    };
  }
  if (margin === 0) {
    next[target.id] = { id: target.id, owner: "neutral", fleets: 0 };
    return {
      board: next,
      ok: true,
      line: `Equal strength at ${object}. The assault and the garrison both clear.`,
    };
  }
  const defenderLeft = target.fleets - fleets;
  next[target.id] = { ...target, fleets: defenderLeft };
  return {
    board: next,
    ok: true,
    line: `${subject} sends ${fleets} against ${object} (${target.fleets}). The assault fails. ${regionTitle(target.id)} keeps ${defenderLeft}.`,
  };
}

function verb(side: Actor, second: string, third: string): string {
  switch (side) {
    case "player":
      return second;
    case "ai":
      return third;
    default: {
      const unreachable: never = side;
      return unreachable;
    }
  }
}

export function orderKind(board: Board, side: Actor, to: RegionId): "shift" | "attack" {
  const target = board[to];
  if (target.owner === side || (target.owner === "neutral" && target.fleets === 0)) {
    return "shift";
  }
  return "attack";
}
