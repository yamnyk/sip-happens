import { criteriaFor } from "#shared/config/criteria.js";
import { FINAL_NOTE_MIN, type StageDraft } from "#shared/lib/review.js";
import type { evaluateReview } from "#shared/lib/review.js";
import { reviewErrors } from "#shared/strings.js";
import { Textarea } from "#shared/ui/Input.js";
import type { DrinkType } from "#contract/domain.js";
import type { StageName } from "./drafts.js";
import { ScoreRow } from "./ScoreRow.js";
import { reviewStrings as s } from "./strings.js";

interface Props {
  stage: StageName;
  effectiveType: DrinkType;
  stageDraft: StageDraft;
  stageState: ReturnType<typeof evaluateReview>[StageName];
  total: number | null;
  onScore: (key: string, v: number | undefined) => void;
  onNote: (note: string) => void;
}

/** Score rows, total, note with counter and stage errors for the active stage. */
export function StagePanel({
  stage,
  effectiveType,
  stageDraft,
  stageState,
  total,
  onScore,
  onNote,
}: Props) {
  const noteLen = stageDraft.note.trim().length;
  return (
    <section className="flex flex-col gap-5" role="tabpanel">
      {criteriaFor(effectiveType).map((c) => (
        <ScoreRow
          key={c.key}
          criterion={c}
          value={stageDraft.scores[c.key]}
          onChange={(v) => onScore(c.key, v)}
        />
      ))}
      <p className="text-xs text-neutral-500">{s.clearHint}</p>

      {total !== null && (
        <p className="text-lg">
          <span className="text-neutral-400">{s.total}: </span>
          <span className="font-semibold text-amber-400">
            {total.toFixed(1)}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="stage-note" className="text-sm text-neutral-400">
          {stage === "first" ? s.noteFirst : s.noteFinal}
        </label>
        <Textarea
          id="stage-note"
          rows={4}
          placeholder={
            stage === "first" ? s.notePlaceholderFirst : s.notePlaceholderFinal
          }
          value={stageDraft.note}
          onChange={(e) => onNote(e.target.value)}
        />
        {stage === "final" && (
          <p
            className={`text-right text-xs ${noteLen >= FINAL_NOTE_MIN ? "text-emerald-400" : "text-neutral-500"}`}
          >
            {s.noteCount(noteLen, FINAL_NOTE_MIN)}
          </p>
        )}
      </div>

      {stageState.errors.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-red-400">
          {stageState.errors.map((code) => (
            <li key={code}>{reviewErrors[code]}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
