export const REGION_IDS = [
  "amber-gate",
  "north-drift",
  "south-ash",
  "violet-gate",
  "the-lens",
  "quiet-halo",
  "core-well",
] as const;

export type RegionId = (typeof REGION_IDS)[number];

export type Side = "player" | "ai" | "neutral";

export type Actor = "player" | "ai";

export type RegionInfo = {
  id: RegionId;
  title: string;
  sentence: string;
  blurb: string;
  x: number;
  y: number;
};

export const REGIONS: Record<RegionId, RegionInfo> = {
  "amber-gate": {
    id: "amber-gate",
    title: "Amber Gate",
    sentence: "Amber Gate",
    blurb: "Your warm door on the near side of the well.",
    x: 18,
    y: 50,
  },
  "north-drift": {
    id: "north-drift",
    title: "North Drift",
    sentence: "North Drift",
    blurb: "A thin shelf of dust above the core.",
    x: 34,
    y: 18,
  },
  "south-ash": {
    id: "south-ash",
    title: "South Ash",
    sentence: "South Ash",
    blurb: "Cinder you already hold, under the gate.",
    x: 28,
    y: 82,
  },
  "violet-gate": {
    id: "violet-gate",
    title: "Violet Gate",
    sentence: "Violet Gate",
    blurb: "The opposition's cold harbor.",
    x: 82,
    y: 50,
  },
  "the-lens": {
    id: "the-lens",
    title: "The Lens",
    sentence: "the Lens",
    blurb: "Light arrives here already bent.",
    x: 72,
    y: 82,
  },
  "quiet-halo": {
    id: "quiet-halo",
    title: "Quiet Halo",
    sentence: "Quiet Halo",
    blurb: "A ring that prefers not to be named.",
    x: 66,
    y: 16,
  },
  "core-well": {
    id: "core-well",
    title: "Core Well",
    sentence: "the Core Well",
    blurb: "The weight. Keep three fleets here through a reply to win.",
    x: 50,
    y: 48,
  },
};

export const EDGES: readonly (readonly [RegionId, RegionId])[] = [
  ["amber-gate", "north-drift"],
  ["amber-gate", "south-ash"],
  ["amber-gate", "core-well"],
  ["north-drift", "quiet-halo"],
  ["north-drift", "violet-gate"],
  ["north-drift", "core-well"],
  ["south-ash", "the-lens"],
  ["south-ash", "core-well"],
  ["violet-gate", "quiet-halo"],
  ["violet-gate", "the-lens"],
  ["violet-gate", "core-well"],
  ["the-lens", "core-well"],
];

const adjacency = buildAdjacency();

function buildAdjacency(): Record<RegionId, RegionId[]> {
  const map: Record<RegionId, RegionId[]> = {
    "amber-gate": [],
    "north-drift": [],
    "south-ash": [],
    "violet-gate": [],
    "the-lens": [],
    "quiet-halo": [],
    "core-well": [],
  };
  for (const [a, b] of EDGES) {
    map[a].push(b);
    map[b].push(a);
  }
  return map;
}

export function neighbors(id: RegionId): readonly RegionId[] {
  return adjacency[id];
}

export function isNeighbor(a: RegionId, b: RegionId): boolean {
  return adjacency[a].includes(b);
}

export function regionTitle(id: RegionId): string {
  return REGIONS[id].title;
}

export function regionSentence(id: RegionId): string {
  return REGIONS[id].sentence;
}

export function opposite(side: Actor): Actor {
  switch (side) {
    case "player":
      return "ai";
    case "ai":
      return "player";
    default: {
      const unreachable: never = side;
      return unreachable;
    }
  }
}

export function ownerName(owner: Side): string {
  switch (owner) {
    case "player":
      return "You";
    case "ai":
      return "Opposition";
    case "neutral":
      return "Unaligned";
    default: {
      const unreachable: never = owner;
      return unreachable;
    }
  }
}

export function actorName(side: Actor): string {
  switch (side) {
    case "player":
      return "You";
    case "ai":
      return "The opposition";
    default: {
      const unreachable: never = side;
      return unreachable;
    }
  }
}
