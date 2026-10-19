import assert from "node:assert/strict";
import test from "node:test";
import { upgradeEventData } from "./model";
import { tournamentNextStep } from "./workflow";

function fixture() {
  return upgradeEventData({
    settings: { name: "Uji alur", target: 2, capacity: 5, rounds: 2, advancing: 1 },
    participants: [{ id: "a", number: 1, name: "A", communityId: null }, { id: "b", number: 2, name: "B", communityId: null }],
    draws: [1, 2].map(number => ({ number, locked: true, tables: [["a", "b"]], revision: 1 })),
  });
}

function scores(round: number) {
  return { round, table: 1, submittedAt: "2026-10-19T00:00:00Z", scores: ["a", "b"].map((participantId, index) => ({ participantId, score: 10 - index, tableRank: index + 1, tournamentPoint: 5 - index })) };
}

test("workflow starts at participants, then the first missing or draft draw", () => {
  const data = fixture();
  data.participants.pop();
  assert.equal(tournamentNextStep(data).path, "#participants");
  data.settings.target = 1;
  data.draws = [];
  assert.equal(tournamentNextStep(data).path, "/draws?round=1");
  data.draws = [{ number: 1, locked: false, tables: [["a"]], revision: 1 }];
  assert.match(tournamentNextStep(data).title, /Periksa pembagian/);
});

test("locked first draw directs to scoring even when every draw was prepared ahead", () => {
  const data = fixture();
  assert.equal(tournamentNextStep(data).path, "/game?round=1");
  data.draws.pop();
  assert.equal(tournamentNextStep(data).path, "/game?round=1");
});

test("complete scores require a result lock before moving to the next round", () => {
  const data = fixture();
  data.results = [scores(1), scores(2)];
  assert.equal(tournamentNextStep(data).path, "/game?round=1#round-results");
  data.resultStates = [{ round: 1, revision: 1, lockedAt: "2026-10-19T00:00:00Z" }];
  assert.equal(tournamentNextStep(data).path, "/game?round=2#round-results");
});

test("after locking results recommend the next missing draw or its score entry", () => {
  const data = fixture();
  data.results = [scores(1)];
  data.resultStates = [{ round: 1, revision: 1, lockedAt: "2026-10-19T00:00:00Z" }];
  assert.equal(tournamentNextStep(data).path, "/game?round=2");
  data.draws.pop();
  assert.equal(tournamentNextStep(data).path, "/draws?round=2");
});

test("only all locked round results lead to qualification, then the final archive", () => {
  const data = fixture();
  data.results = [scores(1), scores(2)];
  data.resultStates = [1, 2].map(round => ({ round, revision: 1, lockedAt: "2026-10-19T00:00:00Z" }));
  assert.equal(tournamentNextStep(data).title, "Periksa peserta lolos");
  data.qualificationLockedAt = "2026-10-19T00:00:00Z";
  data.qualifiedIds = ["a"];
  assert.equal(tournamentNextStep(data).title, "Lihat hasil akhir");
});
