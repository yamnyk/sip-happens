import { useCallback, useState } from "react";
import { EMPTY_SUBTYPE, type SubtypeValue } from "./useEnsureSubtype.js";

/** State of a subtype picker inside a form: the value, the "required" flag and a notice (e.g. duplicate name). */
export function useSubtypeField(initial: SubtypeValue = EMPTY_SUBTYPE) {
  const [value, setValue] = useState<SubtypeValue>(initial);
  const [required, setRequired] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** User picked or typed a subtype: clears the required flag and the notice. */
  const change = useCallback((next: SubtypeValue) => {
    setValue(next);
    setRequired(false);
    setNotice(null);
  }, []);

  return { value, setValue, required, setRequired, notice, setNotice, change };
}
