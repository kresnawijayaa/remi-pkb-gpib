"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = ButtonProps & {
  pendingText?: string;
};

export function SubmitButton({
  children,
  pendingText = "Memproses...",
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      aria-disabled={pending || disabled}
      disabled={pending || disabled}
      className={cn(pending && "cursor-wait", className)}
      {...props}
    >
      {pending && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      <span>{pending ? pendingText : children}</span>
    </Button>
  );
}
