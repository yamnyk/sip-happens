import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn.js";

/** Classes for a toggle pill. Use on a non-interactive element for a locked choice. */
export function chipClass(selected: boolean, className?: string): string {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium",
    selected
      ? "border-amber-400 bg-amber-400 text-neutral-950"
      : "border-neutral-700 bg-neutral-900 text-neutral-200",
    className,
  );
}

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
}

/** Toggle pill (type and filter pickers). Sets `aria-pressed`. */
export function Chip({
  selected,
  className,
  type = "button",
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={chipClass(selected, className)}
      {...rest}
    />
  );
}
