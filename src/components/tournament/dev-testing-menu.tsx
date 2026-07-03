"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import {
  seedFinalSimulationScoresAction,
  seedRoundSimulationScoresAction,
  seedSimulationCommunitiesAction,
  seedSimulationParticipantsAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

type DevActionKind = "communities" | "participants" | "roundScores" | "finalScores";

type DevTestingAction = {
  kind: DevActionKind;
  label: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
};

const actionMap = {
  communities: seedSimulationCommunitiesAction,
  participants: seedSimulationParticipantsAction,
  roundScores: seedRoundSimulationScoresAction,
  finalScores: seedFinalSimulationScoresAction,
};

const developerPin = "0999";

export function DevTestingMenu({
  tournamentId,
  roundId,
  actions,
}: {
  tournamentId: string;
  roundId?: string;
  actions: DevTestingAction[];
}) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<DevActionKind | null>(actions[0]?.kind ?? null);
  const selectedAction = actions.find((action) => action.kind === selectedKind) ?? actions[0];
  const selectedNeedsRound = selectedAction?.kind === "roundScores" || selectedAction?.kind === "finalScores";
  const isDisabled = Boolean(selectedAction?.disabled || (selectedNeedsRound && !roundId));

  if (actions.length === 0) return null;

  function unlockDevTools(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pin !== developerPin) {
      setPinError("PIN developer tidak sesuai.");
      setPin("");
      return;
    }

    setPinError(null);
    setUnlocked(true);
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 grid justify-items-end gap-2">
      {open && (
        <div className="w-[min(340px,calc(100vw-40px))] border border-border bg-card shadow-lg">
          {!unlocked ? (
            <>
              <div className="border-b border-border p-3">
                <div className="text-sm font-semibold">Dev tools</div>
              </div>
              <form onSubmit={unlockDevTools} className="grid gap-3 p-3">
                <Input
                  value={pin}
                  onChange={(event) => {
                    setPin(event.target.value);
                    setPinError(null);
                  }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="PIN developer"
                  autoComplete="off"
                  required
                />
                {pinError && (
                  <div className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                    {pinError}
                  </div>
                )}
                <Button type="submit">Masuk</Button>
              </form>
            </>
          ) : (
            <>
              <div className="border-b border-border p-3">
                <div className="text-sm font-semibold">Dev testing</div>
                <div className="mt-1 text-xs text-muted-foreground">Aksi simulasi hanya untuk development/debug.</div>
              </div>
              <div className="grid gap-3 p-3">
                <div className="grid gap-1">
                  {actions.map((action) => (
                    <button
                      key={action.kind}
                      type="button"
                      onClick={() => setSelectedKind(action.kind)}
                      className={cn(
                        "border border-border px-3 py-2 text-left text-sm transition hover:bg-muted active:translate-y-px",
                        selectedAction?.kind === action.kind && "border-primary bg-primary text-primary-foreground hover:bg-primary"
                      )}
                    >
                      <span className="font-semibold">{action.label}</span>
                      <span className={cn("block text-xs", selectedAction?.kind === action.kind ? "text-primary-foreground/75" : "text-muted-foreground")}>
                        {action.description}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedAction && (
                  <form action={actionMap[selectedAction.kind]} className="grid gap-2">
                    <input type="hidden" name="tournamentId" value={tournamentId} />
                    <input type="hidden" name="devPin" value={developerPin} />
                    {selectedNeedsRound && <input type="hidden" name="roundId" value={roundId ?? ""} />}
                    <SubmitButton disabled={isDisabled} pendingText="Menjalankan...">
                      Jalankan
                    </SubmitButton>
                    {isDisabled && (
                      <div className="text-xs text-muted-foreground">
                        {selectedAction.disabledReason ?? "Aksi ini belum tersedia di kondisi sekarang."}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <Button type="button" variant={open ? "default" : "secondary"} onClick={() => setOpen((value) => !value)}>
        Dev tools
      </Button>
    </div>
  );
}
