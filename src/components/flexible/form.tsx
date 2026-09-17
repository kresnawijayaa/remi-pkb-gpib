"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { mutateEvent, type ActionState } from "@/app/tournaments/actions";

export function ActionForm({ children, eventId, version, operation, round, className = "", resetOnSuccess = false }: { children: React.ReactNode; eventId: string; version?: number; operation: string; round?: number; className?: string; resetOnSuccess?: boolean }) {
  const [state, action, pending] = useActionState(mutateEvent, {} as ActionState);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const submitted = useRef<FormData | null>(null);
  const [noticeHidden, setNoticeHidden] = useState(false);
  useEffect(() => {
    const hideOtherNotices = () => setNoticeHidden(true);
    window.addEventListener("neo:notice-clear", hideOtherNotices);
    return () => window.removeEventListener("neo:notice-clear", hideOtherNotices);
  }, []);
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
  return <form ref={ref} action={action} onSubmit={event => { window.dispatchEvent(new Event("neo:notice-clear")); setNoticeHidden(false); submitted.current = new FormData(event.currentTarget); }} className={`neo-form ${className}`} aria-busy={pending}>
    <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="version" value={version ?? 0} /><input type="hidden" name="operation" value={operation} />
    {round !== undefined && <input type="hidden" name="round" value={round} />}
    <fieldset disabled={pending}>{children}</fieldset>
    {!noticeHidden && state.error && <div className="neo-notice neo-error neo-dismissible-notice" role="alert"><span>{state.error}</span><button type="button" className="neo-notice-close" aria-label="Tutup notifikasi" onClick={() => setNoticeHidden(true)}>×</button></div>}
    {!noticeHidden && state.message && <div className="neo-notice neo-success neo-dismissible-notice" role="status"><span>{state.message}</span><button type="button" className="neo-notice-close" aria-label="Tutup notifikasi" onClick={() => setNoticeHidden(true)}>×</button></div>}
  </form>;
}

export function SendButton({ children, secondary = false, disabled = false }: { children: React.ReactNode; secondary?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={`neo-button ${secondary ? "neo-secondary" : ""}`} disabled={pending || disabled}>{pending ? "Menyimpan…" : children}</button>;
}

export function Confirm({ children }: { children: React.ReactNode }) {
  return <label className="neo-check"><input type="checkbox" name="confirm" value="yes" required /><span>{children}</span></label>;
}
