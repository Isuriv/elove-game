import { makePlan, applyPlan } from "./ai";
import { isNeighbor, type Actor, type RegionId } from "./map";
import { applyOrder, coreControl, createBoard, income, orderKind, victoryOn, weighClaims } from "./rules";
import { MAX_ORDERS, MAX_ROUNDS, type GameState, type Phase } from "./types";

export type Action =
  | { type: "place-or-select"; regionId: RegionId }
  | { type: "set-commit"; count: number }
  | { type: "confirm-order" }
  | { type: "clear-selection" }
  | { type: "end-turn" }
  | { type: "carry-out" }
  | { type: "restart" };

type State = GameState;

export function initialState(): State {
  const board = createBoard();
  return {
    board,
    phase: { type: "reinforce", remaining: income(board, "player") },
    round: 1,
    selection: { type: "none" },
    commit: 1,
    log: ["Amber Gate and South Ash are yours. The violet fleet holds the far side."],
    hint: "Place fleets on regions you hold.",
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "restart":
      return initialState();
    case "set-commit":
      return setCommit(state, action.count);
    case "clear-selection":
      return { ...state, selection: { type: "none" }, hint: hintFor(state.phase) };
    case "place-or-select":
      return onRegion(state, action.regionId);
    case "confirm-order":
      return confirmOrder(state);
    case "end-turn":
      return endTurn(state);
    case "carry-out":
      return carryOut(state);
    default: {
      const unreachable: never = action;
      throw new Error(`Unhandled action ${JSON.stringify(unreachable)}`);
    }
  }
}

function onRegion(state: State, regionId: RegionId): State {
  switch (state.phase.type) {
    case "reinforce":
      return placeOne(state, regionId);
    case "orders":
      return selectForOrder(state, regionId);
    case "reveal":
      return { ...state, hint: "The plan is on the table. Carry it out, or read it first." };
    case "over":
      return state;
    default: {
      const unreachable: never = state.phase;
      return unreachable;
    }
  }
}

function placeOne(state: State, regionId: RegionId): State {
  if (state.phase.type !== "reinforce") return state;
  if (state.board[regionId].owner !== "player") {
    return { ...state, hint: "New fleets land only on regions you already hold." };
  }
  if (state.phase.remaining <= 0) return state;
  const board = {
    ...state.board,
    [regionId]: { ...state.board[regionId], fleets: state.board[regionId].fleets + 1 },
  };
  const remaining = state.phase.remaining - 1;
  const next: State = {
    ...state,
    board,
    selection: { type: "none" },
    hint: remaining === 0 ? "Fleets are placed. Give up to two orders." : "Place the next fleet.",
    log: state.log,
  };
  if (remaining === 0) {
    return { ...next, phase: { type: "orders", remaining: MAX_ORDERS } };
  }
  return { ...next, phase: { type: "reinforce", remaining } };
}

function selectForOrder(state: State, regionId: RegionId): State {
  if (state.phase.type !== "orders") return state;
  if (state.phase.remaining <= 0) {
    return { ...state, hint: "No orders left. End the turn." };
  }
  const selection = state.selection;
  switch (selection.type) {
    case "none":
      return pickSource(state, regionId);
    case "source":
      if (selection.regionId === regionId) {
        return { ...state, selection: { type: "none" }, hint: "Selection cleared." };
      }
      if (state.board[regionId].owner === "player" && !isNeighbor(selection.regionId, regionId)) {
        return pickSource(state, regionId);
      }
      if (!isNeighbor(selection.regionId, regionId)) {
        return { ...state, hint: "Orders travel only between regions that touch." };
      }
      return pickTarget(state, selection.regionId, regionId);
    case "target":
      if (selection.from === regionId) {
        return { ...state, selection: { type: "source", regionId }, hint: "Choose an adjacent region." };
      }
      if (state.board[regionId].owner === "player") return pickSource(state, regionId);
      if (isNeighbor(selection.from, regionId)) return pickTarget(state, selection.from, regionId);
      return { ...state, hint: "Orders travel only between regions that touch." };
    default: {
      const unreachable: never = selection;
      return unreachable;
    }
  }
}

function pickSource(state: State, regionId: RegionId): State {
  const region = state.board[regionId];
  if (region.owner !== "player" || region.fleets < 1) {
    return { ...state, hint: "Choose a region you hold, with fleets on it." };
  }
  return {
    ...state,
    selection: { type: "source", regionId },
    hint: `Order from ${stateRegionName(regionId)}. Choose an adjacent region.`,
  };
}

function pickTarget(state: State, from: RegionId, to: RegionId): State {
  const fleets = state.board[from].fleets;
  const commit = Math.min(fleets, Math.max(1, fleets - 1));
  const kind = orderKind(state.board, "player", to);
  const verb = kind === "attack" ? "Send fleets against" : "Shift fleets into";
  return {
    ...state,
    selection: { type: "target", from, to },
    commit,
    hint: `${verb} ${stateRegionName(to)}. Leaving zero fleets abandons the source.`,
  };
}

function stateRegionName(id: RegionId): string {
  switch (id) {
    case "amber-gate":
      return "Amber Gate";
    case "north-drift":
      return "North Drift";
    case "south-ash":
      return "South Ash";
    case "violet-gate":
      return "Violet Gate";
    case "the-lens":
      return "the Lens";
    case "quiet-halo":
      return "Quiet Halo";
    case "core-well":
      return "the Core Well";
    default: {
      const unreachable: never = id;
      return unreachable;
    }
  }
}

function setCommit(state: State, count: number): State {
  if (state.selection.type !== "target") return state;
  const max = state.board[state.selection.from].fleets;
  const commit = Math.min(max, Math.max(1, count));
  return { ...state, commit };
}

function confirmOrder(state: State): State {
  if (state.phase.type !== "orders" || state.selection.type !== "target") {
    return { ...state, hint: "Choose a source and a destination first." };
  }
  if (state.phase.remaining <= 0) {
    return { ...state, hint: "No orders left. End the turn." };
  }
  const { from, to } = state.selection;
  const kind = orderKind(state.board, "player", to);
  const applied = applyOrder(state.board, "player", {
    type: kind,
    from,
    to,
    fleets: state.commit,
  });
  if (!applied.ok) return { ...state, hint: applied.line };
  const won = victoryOn(applied.board, "player");
  const log = pushLog(state.log, applied.line);
  if (won) {
    return {
      ...state,
      board: applied.board,
      phase: { type: "over", winner: won.winner, reason: won.reason },
      selection: { type: "none" },
      log,
      hint: won.reason,
    };
  }
  const remaining = state.phase.remaining - 1;
  return {
    ...state,
    board: applied.board,
    phase: { type: "orders", remaining },
    selection: { type: "none" },
    log,
    hint: remaining > 0 ? "One order left, or end the turn." : "No orders left. End the turn.",
  };
}

function endTurn(state: State): State {
  switch (state.phase.type) {
    case "reinforce":
      return { ...state, hint: "Place every new fleet before the turn can end." };
    case "orders": {
      const won = victoryOn(state.board, "player");
      if (won) {
        return {
          ...state,
          phase: { type: "over", winner: won.winner, reason: won.reason },
          selection: { type: "none" },
          hint: won.reason,
        };
      }
      if (state.round >= MAX_ROUNDS) {
        const weighed = weighClaims(state.board);
        return {
          ...state,
          phase: { type: "over", winner: weighed.winner, reason: weighed.reason },
          selection: { type: "none" },
          hint: weighed.reason,
        };
      }
      const aiHeld = coreControl(state.board, "ai");
      if (aiHeld) {
        return {
          ...state,
          phase: { type: "over", winner: aiHeld.winner, reason: aiHeld.reason },
          selection: { type: "none" },
          hint: aiHeld.reason,
        };
      }
      const plan = makePlan(state.board, "ai", "full");
      return {
        ...state,
        phase: { type: "reveal", plan },
        selection: { type: "none" },
        hint: "The opposition has published its plan.",
      };
    }
    case "reveal":
      return { ...state, hint: "Carry out the plan to finish their turn." };
    case "over":
      return state;
    default: {
      const unreachable: never = state.phase;
      return unreachable;
    }
  }
}

function carryOut(state: State): State {
  if (state.phase.type !== "reveal") return state;
  const resolved = applyPlan(state.board, state.phase.plan);
  const won = victoryOn(resolved.board, "ai");
  const log = resolved.lines.reduce(pushLog, state.log);
  if (won) {
    return {
      ...state,
      board: resolved.board,
      phase: { type: "over", winner: won.winner, reason: won.reason },
      selection: { type: "none" },
      log,
      hint: won.reason,
    };
  }
  const round = state.round + 1;
  if (round > MAX_ROUNDS) {
    const weighed = weighClaims(resolved.board);
    return {
      ...state,
      board: resolved.board,
      round,
      phase: { type: "over", winner: weighed.winner, reason: weighed.reason },
      selection: { type: "none" },
      log,
      hint: weighed.reason,
    };
  }
  const playerHeld = coreControl(resolved.board, "player");
  if (playerHeld) {
    return {
      ...state,
      board: resolved.board,
      round,
      phase: { type: "over", winner: playerHeld.winner, reason: playerHeld.reason },
      selection: { type: "none" },
      log,
      hint: playerHeld.reason,
    };
  }
  const playerWon = victoryOn(resolved.board, "player");
  if (playerWon) {
    return {
      ...state,
      board: resolved.board,
      round,
      phase: { type: "over", winner: playerWon.winner, reason: playerWon.reason },
      selection: { type: "none" },
      log,
      hint: playerWon.reason,
    };
  }
  if (income(resolved.board, "player") === 0) {
    return {
      ...state,
      board: resolved.board,
      round,
      phase: {
        type: "over",
        winner: "ai",
        reason: "Your fleets have nowhere left to stand.",
      },
      selection: { type: "none" },
      log,
      hint: "Your fleets have nowhere left to stand.",
    };
  }
  return {
    ...state,
    board: resolved.board,
    round,
    phase: { type: "reinforce", remaining: income(resolved.board, "player") },
    selection: { type: "none" },
    log,
    hint: "Your turn. Place fleets on regions you hold.",
  };
}

function pushLog(log: string[], line: string): string[] {
  if (!line) return log;
  return [...log, line].slice(-8);
}

function hintFor(phase: Phase): string {
  switch (phase.type) {
    case "reinforce":
      return "Place fleets on regions you hold.";
    case "orders":
      return "Choose a region you hold, then an adjacent destination.";
    case "reveal":
      return "Read the plan, then carry it out.";
    case "over":
      return phase.reason;
    default: {
      const unreachable: never = phase;
      return String(unreachable);
    }
  }
}

export function counselFor(state: State) {
  switch (state.phase.type) {
    case "reinforce":
      return makePlan(state.board, "player", "full");
    case "orders":
      return makePlan(state.board, "player", "orders-only");
    case "reveal":
    case "over":
      return null;
    default: {
      const unreachable: never = state.phase;
      return unreachable;
    }
  }
}

export function winnerName(winner: Actor): string {
  switch (winner) {
    case "player":
      return "You hold the well";
    case "ai":
      return "The well keeps the other fleet";
    default: {
      const unreachable: never = winner;
      return unreachable;
    }
  }
}
