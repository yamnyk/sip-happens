import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn.js";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "accent"
  | "danger"
  | "dangerSoft"
  | "link";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-amber-400 font-semibold text-neutral-950",
  secondary: "bg-neutral-800 text-neutral-200",
  outline: "border border-neutral-700 text-neutral-200",
  accent: "border border-amber-400 text-amber-400",
  danger: "bg-red-500 font-medium text-white",
  dangerSoft: "bg-red-500/20 text-red-400",
  link: "text-sm text-amber-400 underline-offset-2 hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-4",
  lg: "min-h-12 px-4",
};

/** Classes for anything that looks like a button (also a router `Link`). The link variant ignores size padding. */
export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg disabled:opacity-50",
    variant === "link" ? "min-h-11" : sizes[size],
    variants[variant],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...rest}
    />
  );
}
