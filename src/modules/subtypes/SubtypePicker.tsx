import { useMemo } from "react";
import { useSubtypes } from "#shared/api/queries.js";
import { strings } from "#shared/strings.js";
import { Button } from "#shared/ui/Button.js";
import { Chip } from "#shared/ui/Chip.js";
import { Input } from "#shared/ui/Input.js";
import { ErrorText } from "#shared/ui/Status.js";
import type { DrinkSubtype } from "#contract/domain.js";
import { subtypeStrings } from "./strings.js";
import type { SubtypeValue } from "./useEnsureSubtype.js";
import { useSubtypeInput } from "./useSubtypeInput.js";

interface Props {
  value: SubtypeValue;
  onChange: (next: SubtypeValue) => void;
  /** Parent says the choice is missing (e.g. after a save attempt): show the inline error. */
  showRequired?: boolean;
  /** Message from the parent (e.g. duplicate found while saving). */
  notice?: string | null;
}

export function SubtypePicker({
  value,
  onChange,
  showRequired = false,
  notice = null,
}: Props) {
  const subtypesQ = useSubtypes();
  const existing = useMemo(
    () =>
      [...(subtypesQ.data ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "uk"),
      ),
    [subtypesQ.data],
  );
  const missing = showRequired && !value.subtypeId && !value.newName;

  const input = useSubtypeInput({
    existing,
    pendingNewName: value.newName,
    onAdd: (name) => onChange({ subtypeId: null, newName: name }),
  });

  function select(s: DrinkSubtype) {
    input.clearMessages();
    onChange({ subtypeId: s.id, newName: null });
  }

  const dup = input.duplicate;
  const message = input.error ?? notice;

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-neutral-800 p-3"
      role="group"
      aria-label={subtypeStrings.heading}
    >
      <p className="text-sm font-medium text-neutral-200">
        {subtypeStrings.heading}
      </p>

      {(existing.length > 0 || value.newName) && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-500">
            {subtypeStrings.existingLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {value.newName && (
              <Chip
                selected={true}
                onClick={() => onChange({ subtypeId: null, newName: null })}
              >
                {value.newName}
                <span className="rounded-full bg-neutral-950/20 px-2 py-0.5 text-xs">
                  {subtypeStrings.newBadge}
                </span>
              </Chip>
            )}
            {existing.map((s) => (
              <Chip
                key={s.id}
                selected={value.subtypeId === s.id}
                onClick={() => select(s)}
              >
                {s.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {subtypesQ.isError && <ErrorText>{strings.common.error}</ErrorText>}

      <div className="flex flex-col gap-2">
        <label htmlFor="subtype-new" className="text-xs text-neutral-500">
          {subtypeStrings.addLabel}
        </label>
        <div className="flex gap-2">
          <Input
            id="subtype-new"
            className="min-w-0 flex-1"
            value={input.text}
            autoComplete="off"
            placeholder={subtypeStrings.placeholder}
            onChange={(e) => input.changeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                input.add();
              }
            }}
          />
          <Button variant="outline" className="shrink-0" onClick={input.add}>
            {subtypeStrings.addButton}
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-amber-400">{message}</p>}
      {dup && (
        <div>
          <Chip selected={false} onClick={() => select(dup)}>
            {dup.name}
          </Chip>
        </div>
      )}
      {missing && !message && <ErrorText>{subtypeStrings.required}</ErrorText>}
    </div>
  );
}
