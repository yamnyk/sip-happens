import type { ReactNode } from "react";

/** Centered single-column container shared by the auth pages. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-8">
      {children}
    </div>
  );
}
