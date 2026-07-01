import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getParticipants, getRounds, getScoredQualificationPlayers, getTablePlayersByRound, getTables, getTournament } from "@/lib/data";
import { isAuthenticated } from "@/lib/auth";
import { calculateStandings } from "@/lib/tournament/standings";
import type { MatchTable, TablePlayer, Tournament } from "@/types/tournament";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournamentId");
  if (!tournamentId) return new NextResponse("tournamentId wajib diisi", { status: 400 });

  const [tournament, participants, rounds, scoredRows] = await Promise.all([
    getTournament(tournamentId),
    getParticipants(tournamentId),
    getRounds(tournamentId),
    getScoredQualificationPlayers(tournamentId),
  ]);
  if (!tournament) return new NextResponse("Turnamen tidak ditemukan", { status: 404 });

  const roundData = await Promise.all(
    rounds.map(async (round) => ({
      round,
      tables: await getTables(round.id),
      players: await getTablePlayersByRound(round.id),
    }))
  );
  const standings = calculateStandings(scoredRows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, createParticipantsWorksheet(participants), "Peserta");
  XLSX.utils.book_append_sheet(workbook, createStandingsWorksheet(standings), "Klasemen");

  for (let roundNumber = 1; roundNumber <= 4; roundNumber++) {
    const data = roundData.find((item) => item.round.roundType === "qualification" && item.round.roundNumber === roundNumber);
    XLSX.utils.book_append_sheet(
      workbook,
      createRoundWorksheet({
        tournament,
        sheetTitle: `TURNAMEN BABAK-${roundNumber} PENYISIHAN REMI 13`,
        groupPrefix: "GROUP",
        rankingPrefix: "RANKING GROUP",
        expectedTableCount: Math.ceil(participants.length / tournament.playersPerTable),
        tables: data?.tables ?? [],
        players: data?.players ?? [],
      }),
      `Babak ${roundNumber}`
    );
  }

  const finalData = roundData.find((item) => item.round.roundType === "final");
  XLSX.utils.book_append_sheet(
    workbook,
    createRoundWorksheet({
      tournament,
      sheetTitle: "TURNAMEN FINAL REMI 13",
      groupPrefix: "FINAL",
      rankingPrefix: "RANKING FINAL",
      expectedTableCount: Math.ceil(tournament.finalistCount / tournament.playersPerTable),
      tables: finalData?.tables ?? [],
      players: finalData?.players ?? [],
    }),
    "Final"
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="hasil-remi-pkb.xlsx"`,
    },
  });
}

type RoundWorksheetInput = {
  tournament: Tournament;
  sheetTitle: string;
  groupPrefix: string;
  rankingPrefix: string;
  expectedTableCount: number;
  tables: MatchTable[];
  players: TablePlayer[];
};

type ParticipantExportRow = Awaited<ReturnType<typeof getParticipants>>[number];
type StandingExportRow = ReturnType<typeof calculateStandings>[number];

function createParticipantsWorksheet(participants: ParticipantExportRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    participants.map((p) => ({
      "No Peserta": p.participantNumber,
      Nama: p.name,
      Komunitas: p.communityName ?? "",
      Status: p.status,
    }))
  );

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 26 },
    { wch: 24 },
    { wch: 12 },
  ];
  worksheet["!autofilter"] = { ref: worksheet["!ref"] ?? "A1:D1" };
  applyHeaderStyle(worksheet, 0, 0, 3);

  return worksheet;
}

function createStandingsWorksheet(standings: StandingExportRow[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    standings.map((row, index) => ({
      Rank: index + 1,
      Nama: row.name,
      Komunitas: row.communityName ?? "",
      "Total Poin": row.totalPoint,
      "Total Skor": row.totalScore,
      Gold: row.firstPlaceCount,
      Silver: row.secondPlaceCount,
      Bronze: row.thirdPlaceCount,
      B1: formatRoundResult(row.rounds[1]),
      B2: formatRoundResult(row.rounds[2]),
      B3: formatRoundResult(row.rounds[3]),
      B4: formatRoundResult(row.rounds[4]),
    }))
  );

  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 26 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];
  worksheet["!autofilter"] = { ref: worksheet["!ref"] ?? "A1:L1" };
  applyHeaderStyle(worksheet, 0, 0, 11);

  return worksheet;
}

function formatRoundResult(result: StandingExportRow["rounds"][number] | undefined) {
  if (!result) return "";
  return `${result.score} (${result.tableRank})`;
}

function createRoundWorksheet({
  tournament,
  sheetTitle,
  groupPrefix,
  rankingPrefix,
  expectedTableCount,
  tables,
  players,
}: RoundWorksheetInput) {
  const tableCount = Math.max(expectedTableCount, tables.length, 1);
  const rows: (string | number | null)[][] = [
    [sheetTitle],
    [tournament.location?.toUpperCase() ?? ""],
    [],
  ];
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
  ];
  const blockRanges: { startRow: number; endRow: number }[] = [];

  for (let tableNumber = 1; tableNumber <= tableCount; tableNumber++) {
    const table = tables.find((item) => item.tableNumber === tableNumber);
    const tablePlayers = table
      ? players.filter((player) => player.tableId === table.id).sort((a, b) => a.seatNumber - b.seatNumber)
      : [];
    const rankedPlayers = [...tablePlayers].sort((a, b) => {
      const rankA = a.tableRank ?? 999;
      const rankB = b.tableRank ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      if (a.score !== null && b.score !== null && a.score !== b.score) return b.score - a.score;
      return a.seatNumber - b.seatNumber;
    });
    const blockStart = rows.length;

    rows.push([
      "No",
      "Permainan",
      "Nomor Meja",
      "Rangking",
      "Nama Peserta",
      "Komunitas",
      "Skor",
      "",
      `${rankingPrefix}-${tableNumber}`,
      "",
      "",
      "",
      "Komunitas",
    ]);

    for (let seatIndex = 0; seatIndex < tournament.playersPerTable; seatIndex++) {
      const player = tablePlayers[seatIndex];
      const rankedPlayer = rankedPlayers[seatIndex];

      rows.push([
        seatIndex + 1,
        seatIndex === 0 ? `${groupPrefix}-${tableNumber}` : "",
        seatIndex === 0 ? tableNumber : "",
        player?.tableRank ?? "",
        player?.participantName ?? "",
        player?.communityName ?? "",
        player?.score ?? "",
        "",
        seatIndex + 1,
        getRankingMarker(rankedPlayer, tableNumber),
        rankedPlayer?.participantName ?? "",
        "",
        rankedPlayer?.communityName ?? "",
      ]);
    }

    if (tournament.playersPerTable > 1) {
      merges.push(
        { s: { r: blockStart + 1, c: 1 }, e: { r: blockStart + tournament.playersPerTable, c: 1 } },
        { s: { r: blockStart + 1, c: 2 }, e: { r: blockStart + tournament.playersPerTable, c: 2 } }
      );
    }
    blockRanges.push({
      startRow: blockStart,
      endRow: blockStart + tournament.playersPerTable,
    });

    rows.push([]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!merges"] = merges;
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 28 },
    { wch: 24 },
    { wch: 10 },
    { wch: 4 },
    { wch: 20 },
    { wch: 7 },
    { wch: 28 },
    { wch: 4 },
    { wch: 24 },
  ];
  worksheet["!rows"] = [{ hpt: 22 }, { hpt: 20 }];
  styleTitleRows(worksheet);
  for (const range of blockRanges) {
    applyGroupBorder(worksheet, range.startRow, range.endRow, 0, 12);
    applyHeaderStyle(worksheet, range.startRow, 0, 12);
  }

  return worksheet;
}

function getRankingMarker(player: TablePlayer | undefined, tableNumber: number) {
  if (!player?.tableRank) return "";
  if (player.tableRank === 1) return `J-${tableNumber}`;
  if (player.tableRank === 2) return `R-${tableNumber}`;
  return "";
}

function styleTitleRows(worksheet: XLSX.WorkSheet) {
  for (let row = 0; row <= 1; row++) {
    const cell = ensureCell(worksheet, row, 0);
    cell.s = {
      font: { bold: true, sz: row === 0 ? 14 : 12 },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
}

function applyHeaderStyle(worksheet: XLSX.WorkSheet, row: number, startCol: number, endCol: number) {
  for (let col = startCol; col <= endCol; col++) {
    const cell = ensureCell(worksheet, row, col);
    cell.s = {
      ...(cell.s ?? {}),
      font: { bold: true },
      fill: { fgColor: { rgb: "E9ECEF" } },
      alignment: { vertical: "center" },
      border: getThinBorder(),
    };
  }
}

function applyGroupBorder(worksheet: XLSX.WorkSheet, startRow: number, endRow: number, startCol: number, endCol: number) {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = ensureCell(worksheet, row, col);
      const existingStyle = cell.s ?? {};
      cell.s = {
        ...existingStyle,
        alignment: {
          vertical: "center",
          wrapText: true,
          ...(existingStyle.alignment ?? {}),
        },
        border: {
          ...(existingStyle.border ?? {}),
          ...(row === startRow ? { top: mediumBorder() } : {}),
          ...(row === endRow ? { bottom: mediumBorder() } : {}),
          ...(col === startCol ? { left: mediumBorder() } : {}),
          ...(col === endCol ? { right: mediumBorder() } : {}),
        },
      };
    }
  }
}

function ensureCell(worksheet: XLSX.WorkSheet, row: number, col: number) {
  const ref = XLSX.utils.encode_cell({ r: row, c: col });
  const sheet = worksheet as XLSX.WorkSheet & Record<string, XLSX.CellObject & { s?: Record<string, unknown> }>;
  sheet[ref] ??= { t: "s", v: "" };
  return sheet[ref];
}

function getThinBorder() {
  return {
    top: thinBorder(),
    right: thinBorder(),
    bottom: thinBorder(),
    left: thinBorder(),
  };
}

function thinBorder() {
  return { style: "thin", color: { rgb: "BFC7D1" } };
}

function mediumBorder() {
  return { style: "medium", color: { rgb: "1F2937" } };
}
