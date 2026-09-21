import type { Actor, RegionId, Side } from "./map";

export type Garrison = {
  id: RegionId;
  owner: Side;
  fleets: number;
};

export type Board = Record<RegionId, Garrison>;

export type Intent =
  | { type: "place"; regionId: RegionId; count: number; because: string }
  | { type: "attack"; from: RegionId; to: RegionId; fleets: number; because: string }
  | { type: "shift"; from: RegionId; to: RegionId; fleets: number; because: string }
  | { type: "hold"; because: string };

export type Plan = {
  side: Actor;
  summary: string;
  intents: Intent[];
};

export type Order = {
  type: "attack" | "shift";
  from: RegionId;
  to: RegionId;
  fleets: number;
};

export type Phase =
  | { type: "reinforce"; remaining: number }
  | { type: "orders"; remaining: number }
  | { type: "reveal"; plan: Plan }
  | { type: "over"; winner: Actor; reason: string };

export type Selection =
  | { type: "none" }
  | { type: "source"; regionId: RegionId }
  | { type: "target"; from: RegionId; to: RegionId };

export type GameState = {
  board: Board;
  phase: Phase;
  round: number;
  selection: Selection;
  commit: number;
  log: string[];
  hint: string;
};

export const MAX_ORDERS = 2;
export const CORE_FLEETS_TO_WIN = 3;
export const REGIONS_TO_WIN = 5;
export const MAX_ROUNDS = 8;
