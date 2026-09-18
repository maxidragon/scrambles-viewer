import type { ScrambleSet } from "@shared/types/wcif";
import type { RoundGroup } from "../store/sets";

interface Props {
  sets: ScrambleSet[];
  groups: RoundGroup[];
  currentIndex: number | null;
  onOpen(index: number): void;
}

export function SetList({ sets, groups, currentIndex, onOpen }: Props): React.JSX.Element {
  return (
    <div className="set-list">
      {groups.map((group) => (
        <section key={group.title} className="round-group">
          <header className="round-header">
            <span className="round-title">{group.title}</span>
            <span className="round-time">{group.time}</span>
          </header>
          {group.setIndexes.map((index) => {
            const set = sets[index];
            if (set === undefined) return null;
            const hasPdf = set.pdfPath != null;
            return (
              <button
                type="button"
                key={set.name}
                className={`set-row${index === currentIndex ? " set-row-current" : ""}`}
                onClick={() => onOpen(index)}
              >
                <span className={`dot ${hasPdf ? "dot-loaded" : "dot-empty"}`} aria-hidden />
                <span className="set-name">{set.name}</span>
                {!hasPdf && <span className="set-no-pdf">No PDF</span>}
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
