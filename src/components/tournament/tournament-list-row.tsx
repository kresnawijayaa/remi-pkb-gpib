"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { deleteTournamentAction, updateTournamentAction } from "@/app/actions";
import type { Tournament, TournamentStatus } from "@/types/tournament";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

const tournamentStatuses: TournamentStatus[] = ["draft", "active", "finished", "cancelled"];

export function TournamentListRow({ tournament }: { tournament: Tournament }) {
  const initialValues = useMemo(
    () => ({
      name: tournament.name,
      eventDate: tournament.eventDate ?? "",
      location: tournament.location ?? "",
      status: tournament.status,
    }),
    [tournament.eventDate, tournament.location, tournament.name, tournament.status]
  );
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    setValues(initialValues);
    setEditing(false);
  }, [initialValues]);

  const dirty =
    values.name !== initialValues.name ||
    values.eventDate !== initialValues.eventDate ||
    values.location !== initialValues.location ||
    values.status !== initialValues.status;

  const resetEdit = () => {
    setValues(initialValues);
    setEditing(false);
  };

  return (
    <article className={cn("border border-border bg-card p-4 transition", editing && "bg-secondary/30")}>
      <form action={updateTournamentAction} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <input type="hidden" name="tournamentId" value={tournament.id} />
        <div className="grid gap-3">
          <div className="grid gap-2 lg:grid-cols-[minmax(220px,1.4fr)_160px_1fr_150px]">
            <Input
              name="name"
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              disabled={!editing}
              required
              aria-label="Nama turnamen"
              className="font-semibold"
            />
            <Input
              name="eventDate"
              type="date"
              value={values.eventDate}
              onChange={(event) => setValues((current) => ({ ...current, eventDate: event.target.value }))}
              disabled={!editing}
              aria-label="Tanggal turnamen"
            />
            <Input
              name="location"
              value={values.location}
              onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))}
              disabled={!editing}
              placeholder="Lokasi belum diisi"
              aria-label="Lokasi turnamen"
            />
            <select
              name="status"
              value={values.status}
              onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as TournamentStatus }))}
              disabled={!editing}
              className="h-10 rounded-sm border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Status turnamen"
            >
              {tournamentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          {!editing && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{tournament.eventDate ?? "Tanggal belum diisi"} / {tournament.location ?? "Lokasi belum diisi"}</span>
              <Badge>{tournament.status}</Badge>
              {tournament.isExhibition && <Badge tone="warn">Exhibition</Badge>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <Link className={buttonClass({ variant: "outline" })} href={`/tournaments/${tournament.id}`}>
            Buka
          </Link>
          {!editing ? (
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : dirty ? (
            <SubmitButton variant="outline" pendingText="...">
              Simpan
            </SubmitButton>
          ) : (
            <Button type="button" variant="outline" onClick={resetEdit}>
              Batal
            </Button>
          )}
        </div>
      </form>

      <form
        action={deleteTournamentAction}
        className="mt-2 flex justify-end"
        onSubmit={(event) => {
          if (!window.confirm(`Hapus turnamen ${tournament.name}? Semua peserta, babak, meja, dan skor di turnamen ini ikut terhapus.`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tournamentId" value={tournament.id} />
        <SubmitButton variant="ghost" size="sm" pendingText="Menghapus...">
          Hapus
        </SubmitButton>
      </form>
    </article>
  );
}
