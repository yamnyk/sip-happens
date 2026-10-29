import { strings } from "#shared/strings.js";
import type { evaluateReview } from "#shared/lib/review.js";
import { STAGES, type StageName } from "./drafts.js";

/** Display label of a stage. */
export const stageLabel: Record<StageName, string> = {
  first: strings.stage.first,
  final: strings.stage.final,
};

interface Props {
  stage: StageName;
  state: ReturnType<typeof evaluateReview>;
  onSelect: (st: StageName) => void;
}

/** First / final tab switcher with a validity dot per stage. */
export function StageTabs({ stage, state, onSelect }: Props) {
  return (
    <div
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-900 p-1"
    >
      {STAGES.map((st) => {
        const active = st === stage;
        const status = state[st].status;
        return (
          <button
            key={st}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(st)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium ${
              active ? "bg-neutral-800 text-amber-400" : "text-neutral-400"
            }`}
          >
            {stageLabel[st]}
            {status === "valid" && (
              <span
                className="size-2 rounded-full bg-emerald-400"
                aria-hidden
              />
            )}
            {status === "invalid" && (
              <span className="size-2 rounded-full bg-red-400" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
