import { GameView } from "../components/GameView";
import { Rules } from "../components/Rules";
import { useTitle } from "../useTitle";

export function StrategyPage() {
  useTitle("Wellfront — Dark Matter");
  return (
    <div className="page">
      <header className="page-intro">
        <p className="eyebrow">Strategy game</p>
        <h1>Wellfront</h1>
        <p className="lede">
          Keep three fleets on the Core Well through a reply, or take five regions. The violet fleet is trying to do it first.
        </p>
      </header>
      <Rules />
      <GameView emphasis="board" />
    </div>
  );
}
