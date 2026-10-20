import assert from "node:assert/strict";
import test from "node:test";
import { auditExample, exampleTotals, pointRules, rankingCriteria, rulesPublicUrl, rulesSections } from "./competition-rules";
import { createCompetitionRulesPdf } from "./competition-rules-pdf";
import { rankTable, calculateStandings } from "./scoring";
import { upgradeEventData } from "./model";

test("published points and audit example match the scoring engine", () => {
  const scores = rankTable(pointRules.map(row => ({ participantId: String(row.rank), score: 100 - row.rank })));
  assert.deepEqual(scores.map(row => row.tournamentPoint), pointRules.map(row => row.points));
  assert.deepEqual(exampleTotals, { points: 19, score: 3550, gold: 2, silver: 1, bronze: 1 });
  const data = upgradeEventData({ settings: { name: "Uji aturan", target: 2, capacity: 5, rounds: 5, advancing: 1 }, results: auditExample.map(row => ({ round: row.round, table: 1, submittedAt: "2026-10-19T00:00:00Z", scores: [{ participantId: "example", score: row.score, tableRank: row.rank, tournamentPoint: row.points }] })) });
  const result = calculateStandings(data)[0];
  assert.deepEqual([result.totalPoint, result.totalScore, result.firsts, result.seconds, result.thirds], [19, 3550, 2, 1, 1]);
});

test("rules distinguish score ties, standings ties, and external committee decisions", () => {
  assert.equal(rankingCriteria.length, 5);
  const tie = rulesSections.find(section => section.id === "kelolosan")!;
  assert(tie.paragraphs.some(text => text.includes("diputuskan panitia") && text.includes("diumumkan saat acara")));
  assert(rulesSections.find(section => section.id === "status")!.paragraphs.some(text => text.includes("belum dikunci")));
  assert.equal(new Set(rulesSections.map(section => section.id)).size, rulesSections.length);
});

test("rulebook PDF has four pages and working canonical/church links", async () => {
  const pdf = await createCompetitionRulesPdf();
  const source = pdf.toString("latin1");
  assert(source.startsWith("%PDF-"));
  assert.equal((source.match(/\/Type \/Page\b/g) ?? []).length, 4);
  assert(source.includes(`/URI (${rulesPublicUrl})`));
  assert(source.includes("/URI (https://gpibharapanindah.org)"));
  assert(!source.includes("0.0.0.0"));
});
