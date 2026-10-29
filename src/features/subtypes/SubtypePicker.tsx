import { useMemo, useState } from "react";
import { useSubtypes } from "../../data/queries";
import {
  cleanSubtypeName,
  findDuplicateSubtype,
  validateSubtypeName,
} from "../../lib/subtype";
import { strings, subtypeStrings } from "../../strings";
import type { DrinkSubtype } from "../../types/domain";
import type { SubtypeValue } from "./useEnsureSubtype";

interface Props {
  value: SubtypeValue;
  onChange: (next: SubtypeValue) => void;
  /** Parent says the choice is missing (e.g. after a save attempt): show the inline error. */
  showRequired?: boolean;
  /** Message from the parent (e.g. duplicate found while saving). */
  notice?: string | null;
}

const chipCls = (active: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
    active
      ? "border-amber-400 bg-amber-400 text-neutral-950"
      : "border-neutral-700 bg-neutral-900 text-neutral-200"
  }`;

export function SubtypePicker({
  value,
  onChange,
  showRequired = false,
  notice = null,
}: Props) {
  const subtypesQ = useSubtypes();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DrinkSubtype | null>(null);

  const existing = useMemo(
    () =>
      [...(subtypesQ.data ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "uk"),
      ),
    [subtypesQ.data],
  );
  const missing = showRequired && !value.subtypeId && !value.newName;

  function select(s: DrinkSubtype) {
    setError(null);
    setDuplicate(null);
    onChange({ subtypeId: s.id, newName: null });
  }

  function add() {
    const code = validateSubtypeName(text);
    if (code) {
      setDuplicate(null);
      setError(subtypeStrings.errors[code]);
      return;
    }
    const pending: DrinkSubtype[] = value.newName
      ? [{ id: "", name: value.newName, created_by: null, created_at: "" }]
      : [];
    const dup = findDuplicateSubtype(text, [...existing, ...pending]);
    if (dup) {
      setDuplicate(dup.id ? dup : null);
      setError(subtypeStrings.duplicate(dup.name));
      return;
    }
    setError(null);
    setDuplicate(null);
    setText("");
    onChange({ subtypeId: null, newName: cleanSubtypeName(text) });
  }

  const message = error ?? notice;

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
              <button
                type="button"
                aria-pressed
                onClick={() => onChange({ subtypeId: null, newName: null })}
                className={chipCls(true)}
              >
                {value.newName}
                <span className="rounded-full bg-neutral-950/20 px-2 py-0.5 text-xs">
                  {subtypeStrings.newBadge}
                </span>
              </button>
            )}
            {existing.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={value.subtypeId === s.id}
                onClick={() => select(s)}
                className={chipCls(value.subtypeId === s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {subtypesQ.isError && (
        <p className="text-sm text-red-400">{strings.common.error}</p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="subtype-new" className="text-xs text-neutral-500">
          {subtypeStrings.addLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="subtype-new"
            value={text}
            autoComplete="off"
            placeholder={subtypeStrings.placeholder}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
              setDuplicate(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={add}
            className="min-h-11 shrink-0 rounded-lg border border-neutral-700 px-4 text-sm font-medium text-neutral-100"
          >
            {subtypeStrings.addButton}
          </button>
        </div>
      </div>

      {message && <p className="text-sm text-amber-400">{message}</p>}
      {duplicate && (
        <div>
          <button
            type="button"
            onClick={() => select(duplicate)}
            className={chipCls(false)}
          >
            {duplicate.name}
          </button>
        </div>
      )}
      {missing && !message && (
        <p className="text-sm text-red-400">{subtypeStrings.required}</p>
      )}
    </div>
  );
}
