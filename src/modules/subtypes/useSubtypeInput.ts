import { useState } from "react";
import type { DrinkSubtype } from "#contract/domain.js";
import { checkNewSubtype } from "./subtypeInput.js";
import { subtypeStrings } from "./strings.js";

interface Options {
  existing: readonly DrinkSubtype[];
  /** The not-yet-saved new name currently chosen, if any. */
  pendingNewName: string | null;
  /** Called with the clean name once it passes validation. */
  onAdd: (name: string) => void;
}

/** State of the "add a new subtype" input: text, inline error and the clickable duplicate. */
export function useSubtypeInput({ existing, pendingNewName, onAdd }: Options) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DrinkSubtype | null>(null);

  /** Drops the error and the duplicate hint. */
  function clearMessages() {
    setError(null);
    setDuplicate(null);
  }

  function changeText(next: string) {
    setText(next);
    clearMessages();
  }

  function add() {
    const res = checkNewSubtype(text, existing, pendingNewName);
    if (res.kind === "invalid") {
      setDuplicate(null);
      setError(subtypeStrings.errors[res.code]);
      return;
    }
    if (res.kind === "duplicate") {
      setDuplicate(res.duplicate.id ? res.duplicate : null);
      setError(subtypeStrings.duplicate(res.duplicate.name));
      return;
    }
    clearMessages();
    setText("");
    onAdd(res.name);
  }

  return { text, error, duplicate, changeText, add, clearMessages };
}
