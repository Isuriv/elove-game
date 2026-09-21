import { GameView } from "../components/GameView";
import { Rules } from "../components/Rules";
import { useTitle } from "../useTitle";

export function MindPage() {
  useTitle("Strategy Mind — Dark Matter");
  return (
    <div className="page">
      <header className="page-intro">
        <p className="eyebrow">Strategy AI</p>
        <h1>Strategy Mind</h1>
        <p className="lede">
          The same well, with the reasoning in front. Counsel tells you a move. End the turn and the opposition
          publishes its plan, then plays it.
        </p>
      </header>
      <Rules />
      <GameView emphasis="mind" />
    </div>
  );
}
