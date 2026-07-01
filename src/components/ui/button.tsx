import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg";

export function buttonClass({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-55",
    size === "default" && "h-10 px-4",
    size === "sm" && "h-8 px-3",
    size === "lg" && "h-11 px-5 text-base",
    variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
    variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/85 active:bg-secondary/75",
    variant === "outline" && "border border-input bg-background hover:border-foreground/30 hover:bg-muted active:bg-secondary",
    variant === "ghost" && "hover:bg-muted active:bg-secondary",
    variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    className
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={buttonClass({ variant, size, className })} ref={ref} {...props} />
  )
);
Button.displayName = "Button";
