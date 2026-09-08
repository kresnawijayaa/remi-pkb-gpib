import type { EventData, ScoreEntry, TableResult } from "./model";
import { RuleError } from "./model";

export type Standing = { participantId: string; totalPoint: number; totalScore: number; firsts: number; seconds: number; thirds: number; completedRounds: number; rounds: Record<number, ScoreEntry> };

export function rankTable(scores: { participantId: string; score: number; manualRank?: number | null }[]) {
  if (!scores.length) throw new RuleError("Meja tidak memiliki peserta.");
  const duplicates = new Set<number>();
  const counts = new Map<number, number>();
  scores.forEach(item => counts.set(item.score, (counts.get(item.score) ?? 0) + 1));
  counts.forEach((count, score) => { if (count > 1) duplicates.add(score); });
  for (const score of duplicates) {
    const tied = scores.filter(item => item.score === score);
    const ranks = tied.map(item => item.manualRank);
    if (ranks.some(rank => !rank) || new Set(ranks).size !== ranks.length) throw new RuleError("Skor seri membutuhkan urutan finis berbeda untuk peserta yang seri.");
  }
  return [...scores].sort((first, second) => second.score - first.score || (first.manualRank ?? 999) - (second.manualRank ?? 999) || first.participantId.localeCompare(second.participantId)).map((item, index): ScoreEntry => ({ participantId: item.participantId, score: item.score, tableRank: index + 1, tournamentPoint: Math.max(0, 5 - index) }));
}

export function calculateStandings(data: EventData): Standing[] {
  const standings = new Map<string, Standing>();
  for (const result of data.results) for (const score of result.scores) {
    const current = standings.get(score.participantId) ?? { participantId: score.participantId, totalPoint: 0, totalScore: 0, firsts: 0, seconds: 0, thirds: 0, completedRounds: 0, rounds: {} };
    current.totalPoint += score.tournamentPoint;
    current.totalScore += score.score;
    current.completedRounds++;
    current.rounds[result.round] = score;
    if (score.tableRank === 1) current.firsts++;
    if (score.tableRank === 2) current.seconds++;
    if (score.tableRank === 3) current.thirds++;
    standings.set(score.participantId, current);
  }
  return [...standings.values()].sort((first, second) => second.totalPoint - first.totalPoint || second.firsts - first.firsts || second.seconds - first.seconds || second.thirds - first.thirds || second.totalScore - first.totalScore || (data.participants.find(item => item.id === first.participantId)?.number ?? 0) - (data.participants.find(item => item.id === second.participantId)?.number ?? 0));
}

export function expectedTableCount(data: EventData) { return data.draws.filter(draw => draw.locked).reduce((count, draw) => count + draw.tables.length, 0); }
export function scoringComplete(data: EventData) { return data.draws.filter(draw => draw.locked).length === data.settings.rounds && data.results.length === expectedTableCount(data); }
export function resultFor(data: EventData, round: number, table: number): TableResult | undefined { return data.results.find(result => result.round === round && result.table === table); }
