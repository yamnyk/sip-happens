import type { ReactNode } from "react";
import { Button } from "#shared/ui/Button.js";

interface ConfirmRowProps {
  /** Question shown above the buttons. */
  message: string;
  yesLabel: string;
  noLabel: string;
  yesDisabled?: boolean;
  onYes: () => void;
  onNo: () => void;
  /** Extra content below the buttons (e.g. an error). */
  children?: ReactNode;
}

/** Yes/no confirmation block used by draft and review cards. */
export function ConfirmRow({
  message,
  yesLabel,
  noLabel,
  yesDisabled,
  onYes,
  onNo,
  children,
}: ConfirmRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-neutral-200">{message}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" disabled={yesDisabled} onClick={onYes}>
          {yesLabel}
        </Button>
        <Button variant="outline" onClick={onNo}>
          {noLabel}
        </Button>
      </div>
      {children}
    </div>
  );
}
