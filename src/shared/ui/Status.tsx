import type { ReactNode } from "react";
import { cn } from "./cn.js";

/** Whole-page loading or error line. */
export function PageStatus({
  tone = "loading",
  children,
}: {
  tone?: "loading" | "error";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "py-4",
        tone === "error" ? "text-red-400" : "text-neutral-400",
      )}
    >
      {children}
    </p>
  );
}

/** Inline error under a field or action. */
export function ErrorText({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={cn("text-sm text-red-400", className)}>{children}</p>;
}

/** Error box spanning a section. */
export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">
      {children}
    </p>
  );
}

/** Page heading. */
export function PageTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <h1 className={cn("text-xl font-semibold", className)}>{children}</h1>;
}
