import { useMemo, useReducer } from "react";
import { makePlan } from "./ai";
import { counselFor, initialState, reducer, type Action } from "./reducer";
import type { GameState, Plan } from "./types";

export type GameApi = {
  state: GameState;
  counsel: Plan | null;
  forecast: Plan;
  dispatch: (action: Action) => void;
};

export function useGame(): GameApi {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const counsel = useMemo(() => counselFor(state), [state]);
  const forecast = useMemo(() => makePlan(state.board, "ai", "full"), [state.board]);
  return { state, counsel, forecast, dispatch };
}
