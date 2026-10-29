import { useRef, useState } from "react";

const RESET_MS = 2000;

/**
 * Clipboard copy with feedback. `copied` holds the last copied key for 2 s,
 * `copyError` is true after a failed write. A later copy is never cleared by
 * an earlier timer.
 */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function copy(key: string, text: string) {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => setCopied((c) => (c === key ? null : c)),
        RESET_MS,
      );
    } catch {
      setCopyError(true);
    }
  }

  return { copied, copyError, copy };
}
