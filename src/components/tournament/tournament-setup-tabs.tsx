"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  createCommunityAction,
  createParticipantAction,
  deleteCommunityAction,
  deleteParticipantAction,
  generateFinalAction,
  generateRoundAction,
  importParticipantsAction,
  updateCommunityAction,
  updateParticipantAction,
} from "@/app/actions";
import type { Community, Participant, Round, StandingRow, Tournament } from "@/types/tournament";
import type { FinalResultRow } from "@/lib/tournament/final-results";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DevTestingMenu } from "@/components/tournament/dev-testing-menu";
import { MedalHeader, RoundScore } from "@/components/tournament/standings-format";

type MenuKey = "participants" | "communities" | "import" | "game" | "standings";

const menuItems: { key: MenuKey; label: string }[] = [
  { key: "participants", label: "Peserta" },
  { key: "communities", label: "Komunitas" },
  { key: "import", label: "Import CSV" },
  { key: "game", label: "Permainan" },
  { key: "standings", label: "Top klasemen" },
];

const rotationProgressMessages = [
  "Membaca data peserta aktif...",
  "Menyusun kombinasi meja terbaik...",
  "Mengurangi pertemuan peserta yang sama...",
  "Menyeimbangkan komunitas di tiap meja...",
  "Menghitung kualitas rotasi...",
  "Menyimpan susunan babak...",
];

export function TournamentSetupTabs({
  tournamentId,
  tournament,
  summary,
  participants,
  communities,
  rounds,
  standings,
  finalResults,
  initialMenu,
}: {
  tournamentId: string;
  tournament: Tournament;
  summary: {
    participantCount: number;
    communityCount: number;
    roundCount: number;
    tableCount: number;
    submittedTableCount: number;
  };
  participants: Participant[];
  communities: Community[];
  rounds: Round[];
  standings: StandingRow[];
  finalResults: FinalResultRow[];
  initialMenu: MenuKey;
}) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(initialMenu);
  const [standingsTab, setStandingsTab] = useState<"qualification" | "final">("qualification");
  const qualificationRounds = rounds.filter((round) => round.roundType === "qualification");
  const lockedQualificationCount = rounds.filter((round) => round.roundType === "qualification" && round.status === "locked").length;
  const activeRound = rounds.find((round) => round.status === "active") ?? rounds.find((round) => round.status === "draft") ?? rounds.at(-1);
  const qualificationLimitReached = qualificationRounds.length >= tournament.qualificationRoundCount;
  const hasUnlockedQualificationRound = qualificationRounds.some((round) => round.status !== "locked");
  const hasFinalRound = rounds.some((round) => round.roundType === "final");
  const nextRoundButtonLabel = qualificationRounds.length > 0 ? "Buat Babak Berikutnya" : "Buat Babak Pertama";
  const cannotGenerateRoundReason = hasUnlockedQualificationRound
    ? "Kunci babak berjalan dulu."
    : qualificationLimitReached
      ? "Penyisihan sudah lengkap."
      : null;
  const participantCountByCommunity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const participant of participants) {
      if (!participant.communityId) continue;
      counts.set(participant.communityId, (counts.get(participant.communityId) ?? 0) + 1);
    }
    return counts;
  }, [participants]);

  return (
    <>
    <section className="grid gap-4 lg:grid-cols-[180px_1fr] lg:items-start">
      <aside className="border border-border bg-card p-1 lg:sticky lg:top-6">
        <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveMenu(item.key)}
              className={cn(
                "px-3 py-2 text-left text-sm font-semibold transition hover:bg-muted active:translate-y-px",
                activeMenu === item.key && "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
      {activeMenu === "participants" && (
      <section className="border border-border bg-card">
        <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="mb-4">
              <h3 className="font-semibold">Tambah peserta</h3>
            </div>
            <form action={createParticipantAction} className="grid gap-3">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <div className="grid grid-cols-[96px_1fr] gap-3">
                <div className="grid gap-2">
                  <Label>No</Label>
                  <Input name="participantNumber" type="number" defaultValue={participants.length + 1} required />
                </div>
                <div className="grid gap-2">
                  <Label>Nama</Label>
                  <Input name="name" placeholder="Pak Andri" required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Komunitas</Label>
                <select name="communityId" className="h-10 rounded-sm border border-input bg-background px-3">
                  <option value="">Tanpa komunitas</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>No HP</Label>
                <Input name="phone" />
              </div>
              <SubmitButton pendingText="Menyimpan...">Simpan peserta</SubmitButton>
            </form>
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Daftar peserta</h3>
              <span className="text-sm text-muted-foreground">{participants.length} data</span>
            </div>
            <div className="max-h-[380px] overflow-auto border border-border">
              <div className="hidden grid-cols-[72px_1.2fr_1fr_1fr_1fr_72px_72px] gap-2 bg-muted px-3 py-2 text-xs font-semibold uppercase text-muted-foreground lg:grid">
                <div>No</div>
                <div>Nama</div>
                <div>Komunitas</div>
                <div>No HP</div>
                <div>Status</div>
                <div></div>
                <div></div>
              </div>
              <div className="divide-y divide-border">
                {participants.map((participant) => (
                  <ParticipantEditRow
                    key={participant.id}
                    tournamentId={tournamentId}
                    participant={participant}
                    communities={communities}
                  />
                ))}
                {participants.length === 0 && (
                  <div className="p-6 text-muted-foreground">
                    Belum ada peserta.
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
      </section>
      )}

      {activeMenu === "communities" && (
      <section className="border border-border bg-card">
        <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
          <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div className="mb-4">
              <h3 className="font-semibold">Tambah komunitas</h3>
            </div>
            <form action={createCommunityAction} className="grid gap-3">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <div className="grid gap-2">
                <Label>Nama komunitas</Label>
                <Input name="name" placeholder="Sektor 1" required />
              </div>
              <SubmitButton pendingText="Menyimpan...">Simpan komunitas</SubmitButton>
            </form>
          </div>

          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Daftar komunitas</h3>
              <span className="text-sm text-muted-foreground">{communities.length} data</span>
            </div>
            <div className="max-h-[380px] overflow-auto border border-border">
              <div className="hidden grid-cols-[minmax(0,1fr)_120px_72px_72px] gap-2 bg-muted px-3 py-2 text-xs font-semibold uppercase text-muted-foreground lg:grid">
                <div>Nama</div>
                <div>Peserta</div>
                <div></div>
                <div></div>
              </div>
              <div className="divide-y divide-border">
                {communities.map((community) => {
                  const count = participantCountByCommunity.get(community.id) ?? 0;
                  return (
                    <CommunityEditRow
                      key={community.id}
                      tournamentId={tournamentId}
                      community={community}
                      participantCount={count}
                    />
                  );
                })}
                {communities.length === 0 && (
                  <div className="p-6 text-muted-foreground">
                    Belum ada komunitas.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {activeMenu === "import" && (
      <section className="border border-border bg-card">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_300px]">
          <form action={importParticipantsAction} className="grid gap-3">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <div className="grid gap-2">
              <Label>CSV peserta</Label>
              <Textarea
                name="csv"
                className="min-h-44"
                placeholder={"No,Nama,Komunitas,No HP\n1,Pak Andri,Sektor 1,\n2,Pak Budi,Sektor 2,"}
              />
            </div>
            <SubmitButton variant="secondary" pendingText="Mengimpor...">
              Import peserta
            </SubmitButton>
          </form>
          <div className="border border-border bg-background p-4 text-sm text-muted-foreground">
            <div className="mb-2 font-semibold text-foreground">Format</div>
            <div>No,Nama,Komunitas,No HP</div>
            <div className="mt-3">Baris header boleh dipakai. Komunitas otomatis dibuat bila belum ada.</div>
          </div>
        </div>
      </section>
      )}

      {activeMenu === "game" && (
      <section className="grid gap-4">
        <div className="flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Monitoring permainan</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              Fokus babak, status meja, dan klasemen berjalan.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={generateRoundAction} className="flex flex-wrap items-center justify-end gap-3">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <RotationProgressText />
              <SubmitButton
                disabled={Boolean(cannotGenerateRoundReason)}
                pendingText="Membuat babak..."
                title={cannotGenerateRoundReason ?? undefined}
              >
                {nextRoundButtonLabel}
              </SubmitButton>
            </form>
            <form action={generateFinalAction}>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <SubmitButton variant="outline" disabled={lockedQualificationCount < tournament.qualificationRoundCount || hasFinalRound} pendingText="Membuat final...">Generate Final</SubmitButton>
            </form>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
          <div>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>Babak</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeRound ? `Fokus: ${activeRound.roundType === "final" ? "Final" : `Babak ${activeRound.roundNumber}`}` : "Belum ada babak."}
                  </p>
                </div>
                {activeRound && <Badge tone={activeRound.status === "locked" ? "good" : activeRound.status === "active" ? "warn" : "neutral"}>{activeRound.status}</Badge>}
              </CardHeader>
              <CardContent>
                {rounds.length === 0 ? (
                  <div className="border border-dashed border-border bg-background p-6 text-muted-foreground">
                    Belum ada babak.
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {rounds.map((round) => (
                      <Link
                        key={round.id}
                        href={round.roundType === "final" ? `/tournaments/${tournamentId}/final` : `/tournaments/${tournamentId}/rounds/${round.id}`}
                        className="grid gap-2 border border-border bg-background p-4 transition hover:border-primary hover:bg-secondary/40 active:translate-y-px"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{round.roundType === "final" ? "Final" : `Babak ${round.roundNumber}`}</span>
                          <Badge tone={round.status === "locked" ? "good" : round.status === "active" ? "warn" : "neutral"}>{round.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {round.roundType === "final" ? "Penentuan juara" : `Penyisihan ${Math.min(round.roundNumber, tournament.qualificationRoundCount)}/${tournament.qualificationRoundCount}`}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="grid content-start gap-4">
            <Card>
              <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                <ProgressRow label="Babak terkunci" value={`${lockedQualificationCount}/${tournament.qualificationRoundCount}`} />
                <ProgressRow label="Meja submit" value={`${summary.submittedTableCount}/${summary.tableCount}`} />
                <ProgressRow label="Finalis" value={`${Math.min(standings.length, tournament.finalistCount)}/${tournament.finalistCount}`} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
      )}

      {activeMenu === "standings" && (
      <section className="grid gap-4">
        <div className="flex flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Top klasemen</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {standingsTab === "qualification"
                ? "Data klasemen penyisihan dari babak yang sudah dikunci."
                : "Data hasil final setelah skor final diinput."}
            </div>
          </div>
          <div className="flex w-full border border-border bg-card p-1 md:w-auto">
            <button
              type="button"
              onClick={() => setStandingsTab("qualification")}
              className={cn(
                "flex-1 px-3 py-2 text-sm font-semibold transition hover:bg-muted md:flex-none",
                standingsTab === "qualification" && "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              Penyisihan
            </button>
            <button
              type="button"
              onClick={() => setStandingsTab("final")}
              className={cn(
                "flex-1 px-3 py-2 text-sm font-semibold transition hover:bg-muted md:flex-none",
                standingsTab === "final" && "bg-primary text-primary-foreground hover:bg-primary"
              )}
            >
              Final
            </button>
          </div>
        </div>

        {standingsTab === "qualification" ? (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-3">Rank</th>
                <th>Peserta</th>
                <th>Komunitas</th>
                <th>Total Poin</th>
                <th>Total Skor</th>
                <th><MedalHeader rank={1} /></th>
                <th><MedalHeader rank={2} /></th>
                <th><MedalHeader rank={3} /></th>
                <th className="border-l border-border pl-4">B1</th>
                <th>B2</th>
                <th>B3</th>
                <th>B4</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => (
                <tr key={row.participantId} className="border-t">
                  <td className="p-3 font-semibold">{index + 1}</td>
                  <td className="font-medium">
                    {row.name}
                    {index < tournament.finalistCount && <Badge tone="good" className="ml-2">Zona Final</Badge>}
                  </td>
                  <td>{row.communityName ?? "-"}</td>
                  <td className="font-semibold">{row.totalPoint}</td>
                  <td>{row.totalScore}</td>
                  <td>{row.firstPlaceCount}</td>
                  <td>{row.secondPlaceCount}</td>
                  <td>{row.thirdPlaceCount}</td>
                  {[1, 2, 3, 4].map((roundNumber) => (
                    <td key={roundNumber} className={roundNumber === 1 ? "border-l border-border pl-4" : ""}>
                      <RoundScore result={row.rounds[roundNumber]} />
                    </td>
                  ))}
                </tr>
              ))}
              {standings.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-6 text-muted-foreground">
                    Klasemen muncul setelah babak dikunci.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="p-3">Juara</th>
                <th>Peserta</th>
                <th>Komunitas</th>
                <th>Final</th>
                <th>Rank meja</th>
                <th>Rank penyisihan</th>
                <th>Skor</th>
              </tr>
            </thead>
            <tbody>
              {finalResults.map((row) => (
                <tr key={row.participantId} className="border-t">
                  <td className="p-3 font-semibold">{row.position}</td>
                  <td className="font-medium">{row.name}</td>
                  <td>{row.communityName ?? "-"}</td>
                  <td>{row.tableName}</td>
                  <td>{row.tableRank}</td>
                  <td>{row.qualificationRank === 999 ? "-" : row.qualificationRank}</td>
                  <td className="font-semibold">{row.score}</td>
                </tr>
              ))}
              {finalResults.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-muted-foreground">
                    Klasemen final muncul setelah skor final diinput.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </section>
      )}
      </div>
    </section>
    <DevTestingMenu
      tournamentId={tournamentId}
      actions={[
        {
          kind: "communities",
          label: "Isi komunitas",
          description: "Data komunitas contoh.",
        },
        {
          kind: "participants",
          label: "Isi peserta",
          description: "50 peserta contoh untuk simulasi.",
        },
      ]}
    />
    </>
  );
}

const participantStatuses: Participant["status"][] = ["active", "withdrawn", "disqualified"];

function ParticipantEditRow({
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

function CommunityEditRow({
  tournamentId,
  community,
  participantCount,
}: {
  tournamentId: string;
  community: Community;
  participantCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(community.name);

  useEffect(() => {
    setName(community.name);
    setEditing(false);
  }, [community.name]);

  const dirty = name !== community.name;

  const resetEdit = () => {
    setName(community.name);
    setEditing(false);
  };

  return (
    <div className={cn("grid gap-2 p-3 lg:grid-cols-[minmax(0,1fr)_120px_72px_72px] lg:items-center", editing && "bg-secondary/30")}>
      <form action={updateCommunityAction} className="contents">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="communityId" value={community.id} />
        <Input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={!editing}
          required
          aria-label="Nama komunitas"
        />
        <div className="text-sm text-muted-foreground">
          {participantCount} peserta
        </div>
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
        action={deleteCommunityAction}
        onSubmit={(event) => {
          if (!window.confirm(`Hapus komunitas ${community.name}? Peserta di komunitas ini akan menjadi tanpa komunitas.`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <input type="hidden" name="communityId" value={community.id} />
        <SubmitButton size="sm" variant="ghost" pendingText="...">
          Hapus
        </SubmitButton>
      </form>
    </div>
  );
}

function RotationProgressText() {
  const { pending } = useFormStatus();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!pending) {
      setMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % rotationProgressMessages.length);
    }, 1400);

    return () => window.clearInterval(interval);
  }, [pending]);

  if (!pending) return null;

  return (
    <span className="max-w-[260px] text-right text-xs italic text-muted-foreground" aria-live="polite">
      {rotationProgressMessages[messageIndex]}
    </span>
  );
}

function ProgressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
