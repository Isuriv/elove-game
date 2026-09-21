import { useEffect, useRef, useState } from "react";
import {
  endingEpitaph,
  endingNote,
  STORY,
  type Flag,
  type StoryId,
} from "../story/content";
import { useTitle } from "../useTitle";

export function StoryPage() {
  useTitle("The Early Voice — Dark Matter");
  const [nodeId, setNodeId] = useState<StoryId>("approach");
  const [flags, setFlags] = useState<readonly Flag[]>([]);
  const [path, setPath] = useState<readonly string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const node = STORY[nodeId];

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [nodeId]);

  function choose(label: string, to: StoryId, flag?: Flag) {
    setPath((current) => [...current, label]);
    if (flag) {
      setFlags((current) => (current.includes(flag) ? current : [...current, flag]));
    }
    setNodeId(to);
  }

  function restart() {
    setNodeId("approach");
    setFlags([]);
    setPath([]);
  }

  return (
    <article className="story-column">
      <p className="eyebrow">{node.kicker}</p>
      <h1 ref={headingRef} tabIndex={-1}>
        {node.title}
      </h1>
      {node.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {node.ending ? (
        <Ending
          ending={node.ending}
          flags={flags}
          path={path}
          onRestart={restart}
        />
      ) : (
        <div className="choices" role="group" aria-label="Choices">
          {(node.choices ?? []).map((choice, index) => (
            <button
              key={choice.label}
              type="button"
              className="choice"
              onClick={() => choose(choice.label, choice.to, choice.flag)}
            >
              <span className="choice-index">{String(index + 1).padStart(2, "0")}</span>
              <span>{choice.label}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function Ending({
  ending,
  flags,
  path,
  onRestart,
}: {
  ending: NonNullable<(typeof STORY)[StoryId]["ending"]>;
  flags: readonly Flag[];
  path: readonly string[];
  onRestart: () => void;
}) {
  return (
    <div className="ending">
      <p className="epitaph">{endingEpitaph(ending)}</p>
      <p className="note">{endingNote(ending, flags)}</p>
      {path.length > 0 && (
        <ol className="path" aria-label="Choices you made">
          {path.map((step, index) => (
            <li key={`${index}-${step}`}>{step}</li>
          ))}
        </ol>
      )}
      <button type="button" className="btn btn-primary" onClick={onRestart}>
        Begin the log again
      </button>
    </div>
  );
}
