import { strings } from "#shared/strings.js";
import { Button } from "#shared/ui/Button.js";
import { reviewStrings as s } from "./strings.js";

interface Props {
  saving: boolean;
  disabled: boolean;
  onSave: () => void;
}

/** Sticky save button above the tab bar. */
export function SaveBar({ saving, disabled, onSave }: Props) {
  return (
    <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur">
      <Button
        variant="primary"
        size="lg"
        onClick={onSave}
        disabled={disabled}
        className="w-full"
      >
        {saving ? s.saving : strings.common.save}
      </Button>
    </div>
  );
}
