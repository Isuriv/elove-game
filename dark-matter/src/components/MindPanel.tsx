import { type RefObject } from "react";
import { regionTitle } from "../game/map";
import type { Intent, Phase, Plan } from "../game/types";

type MindPanelProps = {
  emphasis: "board" | "mind";
  phase: Phase;
  counsel: Plan | null;
  forecast: Plan;
  carryRef: RefObject<HTMLButtonElement | null>;
  onCarryOut: () => void;
};

export function MindPanel({ emphasis, phase, counsel, forecast, carryRef, onCarryOut }: MindPanelProps) {
  const revealed = phase.type === "reveal" ? phase.plan : null;
  return (
    <aside className={emphasis === "mind" ? "mind mind-emphasis" : "mind"} aria-label="Strategy mind">
      <p className="eyebrow">Strategy mind</p>
      <h2>{revealed ? "The plan" : "Counsel"}</h2>
      {revealed ? (
        <PlanBlock plan={revealed} live />
      ) : counsel ? (
        <PlanBlock plan={counsel} live />
      ) : (
        <p className="mind-summary">The mind is quiet. The claim is settled.</p>
      )}
      {revealed && (
        <button ref={carryRef} type="button" className="btn btn-primary" onClick={onCarryOut}>
          Carry out the plan
        </button>
      )}
      {emphasis === "mind" && !revealed && phase.type !== "over" && (
        <div className="forecast">
          <h3>If the opposition moved on this board</h3>
          <PlanBlock plan={forecast} live={false} />
        </div>
      )}
      <p className="mind-note">
        Scored locally from the fleets in front of you. Nothing leaves this browser.
      </p>
    </aside>
  );
}

function PlanBlock({ plan, live }: { plan: Plan; live: boolean }) {
  return (
    <>
      <p className="mind-summary" aria-live={live ? "polite" : "off"}>
        {plan.summary}
      </p>
      <ol className="intent-list">
        {plan.intents.map((intent, index) => (
          <li key={`${intent.type}-${index}`}>{intentLabel(intent)}</li>
        ))}
      </ol>
    </>
  );
}

function intentLabel(intent: Intent): string {
  switch (intent.type) {
    case "place":
      return `Place ${intent.count} on ${regionTitle(intent.regionId)}`;
    case "attack":
      return `Attack ${regionTitle(intent.to)} with ${intent.fleets} from ${regionTitle(intent.from)}`;
    case "shift":
      return `Shift ${intent.fleets} from ${regionTitle(intent.from)} to ${regionTitle(intent.to)}`;
    case "hold":
      return "Hold the line";
    default: {
      const unreachable: never = intent;
      return String(unreachable);
    }
  }
}
