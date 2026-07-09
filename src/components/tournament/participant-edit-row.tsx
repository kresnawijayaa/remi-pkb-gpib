"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteParticipantAction, updateParticipantAction } from "@/app/actions";
import type { Community, Participant } from "@/types/tournament";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const participantStatuses: Participant["status"][] = ["active", "withdrawn", "disqualified"];

export function ParticipantEditRow({
  tournamentId,
  participant,
  communities,
}: {
  tournamentId: string;
  participant: Participant;
  communities: Community[];
}) {
  const initialValues = useMemo(
    () => ({
      participantNumber: String(participant.participantNumber),
      name: participant.name,
      communityId: participant.communityId ?? "",
      phone: participant.phone ?? "",
      status: participant.status,
    }),
    [participant.communityId, participant.name, participant.participantNumber, participant.phone, participant.status]
  );
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    setValues(initialValues);
    setEditing(false);
  }, [initialValues]);

  const dirty =
    values.participantNumber !== initialValues.participantNumber ||
    values.name !== initialValues.name ||
    values.communityId !== initialValues.communityId ||
    values.phone !== initialValues.phone ||
    values.status !== initialValues.status;

  const resetEdit = () => {
    setValues(initialValues);
    setEditing(false);
  };

  return (
    <div className={cn("grid gap-2 p-3 lg:grid-cols-[72px_1.2fr_1fr_1fr_1fr_72px_72px] lg:items-center", editing && "bg-secondary/30")}>
      <form action={updateParticipantAction} className="contents">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="participantId" value={participant.id} />
        <Input
          name="participantNumber"
          type="number"
          value={values.participantNumber}
          onChange={(event) => setValues((current) => ({ ...current, participantNumber: event.target.value }))}
          disabled={!editing}
          required
          aria-label="Nomor peserta"
        />
        <Input
          name="name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          disabled={!editing}
          required
          aria-label="Nama peserta"
        />
        <select
          name="communityId"
          value={values.communityId}
          onChange={(event) => setValues((current) => ({ ...current, communityId: event.target.value }))}
          disabled={!editing}
          className="h-10 rounded-sm border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="Komunitas peserta"
        >
          <option value="">Tanpa komunitas</option>
          {communities.map((community) => (
            <option key={community.id} value={community.id}>
              {community.name}
            </option>
          ))}
        </select>
        <Input
          name="phone"
          value={values.phone}
          onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
          disabled={!editing}
          aria-label="No HP peserta"
        />
        <select
          name="status"
          value={values.status}
          onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as Participant["status"] }))}
          disabled={!editing}
          className="h-10 rounded-sm border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="Status peserta"
        >
          {participantStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {!editing ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : dirty ? (
          <SubmitButton size="sm" variant="outline" pendingText="...">
            Simpan
          </SubmitButton>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={resetEdit}>
            Batal
          </Button>
        )}
      </form>
      <form
        action={deleteParticipantAction}
        onSubmit={(event) => {
          if (!window.confirm(`Hapus peserta ${participant.name}?`)) event.preventDefault();
        }}
      >
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="participantId" value={participant.id} />
        <SubmitButton size="sm" variant="ghost" pendingText="...">
          Hapus
        </SubmitButton>
      </form>
    </div>
  );
}
