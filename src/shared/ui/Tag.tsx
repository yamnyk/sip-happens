import type { ReactNode } from "react";
import { cn } from "./cn.js";

export type TagTone = "neutral" | "danger" | "accent";

const tones: Record<TagTone, string> = {
  neutral: "border border-neutral-700 text-neutral-300",
  danger: "border border-red-400/60 text-red-400",
  accent: "bg-amber-400/15 text-amber-400",
};

/** Small rounded label ("new", "draft", "disabled"). */
export function Tag({
  tone = "neutral",
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
