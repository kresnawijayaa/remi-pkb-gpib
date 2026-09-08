"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { mutateEvent, type ActionState } from "@/app/tournaments/actions";

export function ActionForm({ children, eventId, version, operation, round, className = "", resetOnSuccess = false }: { children: React.ReactNode; eventId: string; version?: number; operation: string; round?: number; className?: string; resetOnSuccess?: boolean }) {
  const [state, action, pending] = useActionState(mutateEvent, {} as ActionState);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const submitted = useRef<FormData | null>(null);
  useEffect(() => {
    if (state.error && submitted.current && ref.current) {
      for (const element of Array.from(ref.current.elements)) {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          const value = submitted.current.get(element.name);
          if (element instanceof HTMLInputElement && element.type === "checkbox") element.checked = value !== null;
          else if (value !== null && element.type !== "hidden") element.value = String(value);
        }
      }
    }
    if (state.redirectTo) router.push(state.redirectTo);
    else if (state.nonce) { if (resetOnSuccess) ref.current?.reset(); router.refresh(); }
  }, [state, router, resetOnSuccess]);
  return <form ref={ref} action={action} onSubmit={event => { submitted.current = new FormData(event.currentTarget); }} className={`neo-form ${className}`} aria-busy={pending}>
    <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="version" value={version ?? 0} /><input type="hidden" name="operation" value={operation} />
    {round !== undefined && <input type="hidden" name="round" value={round} />}
    <fieldset disabled={pending}>{children}</fieldset>
    {state.error && <p className="neo-notice neo-error" role="alert">{state.error}</p>}
    {state.message && <p className="neo-notice neo-success" role="status">{state.message}</p>}
  </form>;
}

export function SendButton({ children, secondary = false, disabled = false }: { children: React.ReactNode; secondary?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={`neo-button ${secondary ? "neo-secondary" : ""}`} disabled={pending || disabled}>{pending ? "Menyimpan…" : children}</button>;
}

export function Confirm({ children }: { children: React.ReactNode }) {
  return <label className="neo-check"><input type="checkbox" name="confirm" value="yes" required /><span>{children}</span></label>;
}
