import type { StageName } from "./drafts.js";
import { stageLabel } from "./StageTabs.js";
import { reviewStrings as s } from "./strings.js";

interface Props {
  otherStage: StageName;
  onSelect: (st: StageName) => void;
}

/** Link to the other stage when that stage has invalid input. */
export function StageOtherHint({ otherStage, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(otherStage)}
      className="min-h-11 text-left text-sm text-red-400 underline"
    >
      {s.otherStageInvalid(stageLabel[otherStage])}
    </button>
  );
}
