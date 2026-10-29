import { cn } from "./cn.js";

/** Classes for a surface block. Padding and layout come from `className`. `highlight` adds the amber border. */
export function cardClass(
  { highlight = false }: { highlight?: boolean } = {},
  className?: string,
): string {
  return cn(
    "rounded-xl bg-neutral-900",
    highlight && "border border-amber-400/60",
    className,
  );
}
