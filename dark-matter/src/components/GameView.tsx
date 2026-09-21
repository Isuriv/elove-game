import { useEffect, useRef } from "react";
import { fleetTotal, ownedCount } from "../game/rules";
import { regionTitle } from "../game/map";
import { useGame } from "../game/useGame";
import { winnerName } from "../game/reducer";
import type { Phase } from "../game/types";
import { Board } from "./Board";
import { MindPanel } from "./MindPanel";

type GameViewProps = {
  emphasis: "board" | "mind";
};

export function GameView({ emphasis }: GameViewProps) {
  const { state, counsel, forecast, dispatch } = useGame();
  const carryRef = useRef<HTMLButtonElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const phaseType = state.phase.type;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dispatch({ type: "clear-selection" });
      if (state.selection.type !== "target") return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        dispatch({ type: "set-commit", count: state.commit + 1 });
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        dispatch({ type: "set-commit", count: state.commit - 1 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.commit, state.selection.type]);

  useEffect(() => {
    if (phaseType === "reveal") carryRef.current?.focus();
    if (phaseType === "over") restartRef.current?.focus();
  }, [phaseType]);

  const boardColumn = (
    <div className="board-column">
      <p className="status" role="status">
        {phaseStatus(state.phase, state.round)}
      </p>
      <p className="holdings">
        You hold {ownedCount(state.board, "player")} regions, {fleetTotal(state.board, "player")} fleets.
        The opposition holds {ownedCount(state.board, "ai")} regions, {fleetTotal(state.board, "ai")} fleets.
      </p>
      <Board
        board={state.board}
        phase={state.phase}
        selection={state.selection}
        counsel={counsel}
        onSelect={(regionId) => dispatch({ type: "place-or-select", regionId })}
      />
      <p className="hint">{state.hint}</p>
      {state.selection.type === "target" && (
        <div className="stepper">
          <p>
            Send fleets from {regionTitle(state.selection.from)} to {regionTitle(state.selection.to)}.
          </p>
          <div className="stepper-row">
            <button
              type="button"
              className="btn"
              onClick={() => dispatch({ type: "set-commit", count: state.commit - 1 })}
              aria-label="Send fewer fleets"
            >
              −
            </button>
            <span className="commit" aria-live="polite">
              {state.commit}
            </span>
            <button
              type="button"
              className="btn"
              onClick={() => dispatch({ type: "set-commit", count: state.commit + 1 })}
              aria-label="Send more fleets"
            >
              +
            </button>
            <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "confirm-order" })}>
              Confirm order
            </button>
            <button type="button" className="btn" onClick={() => dispatch({ type: "clear-selection" })}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="action-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => dispatch({ type: "end-turn" })}
          disabled={state.phase.type !== "orders"}
        >
          End turn
        </button>
        <button ref={restartRef} type="button" className="btn" onClick={() => dispatch({ type: "restart" })}>
          Restart
        </button>
      </div>
      {state.phase.type === "over" && (
        <div className={state.phase.winner === "player" ? "banner" : "banner loss"}>
          <h2>{winnerName(state.phase.winner)}</h2>
          <p>{state.phase.reason}</p>
        </div>
      )}
      <ol className="log" aria-label="Battle log">
        {state.log.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ol>
    </div>
  );

  const mind = (
    <MindPanel
      emphasis={emphasis}
      phase={state.phase}
      counsel={counsel}
      forecast={forecast}
      carryRef={carryRef}
      onCarryOut={() => dispatch({ type: "carry-out" })}
    />
  );

  return (
    <div className={emphasis === "mind" ? "play play-mind" : "play"}>
      {emphasis === "mind" ? (
        <>
          {mind}
          {boardColumn}
        </>
      ) : (
        <>
          {boardColumn}
          {mind}
        </>
      )}
    </div>
  );
}

function phaseStatus(phase: Phase, round: number): string {
  switch (phase.type) {
    case "reinforce":
      return `Round ${round}. Place ${phase.remaining} ${phase.remaining === 1 ? "fleet" : "fleets"}.`;
    case "orders":
      return `Round ${round}. ${phase.remaining} ${phase.remaining === 1 ? "order" : "orders"} remaining.`;
    case "reveal":
      return `Round ${round}. The opposition has shown its plan.`;
    case "over":
      return phase.winner === "player" ? "You win." : "You lose.";
    default: {
      const unreachable: never = phase;
      return String(unreachable);
    }
  }
}
