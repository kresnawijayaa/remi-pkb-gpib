import assert from "node:assert/strict";
import test from "node:test";
import { scoreEntryState, reconcileManualRanks } from "./score-entry";

const inputs = (...scores: string[]) => scores.map((score, index) => ({ id: String(index), score }));

test("wait for all scores; zero and negative integers are valid", () => {
  for (const bad of ["", " ", "1.5", "abc", "1000000", "-1000000"]) {
    const state = scoreEntryState(inputs("10", bad), {});
    assert.equal(state.complete, false);
    assert.equal(state.valid, false);
    assert(state.rows.every(row => row.rank === "" && row.options.length === 0));
  }
  const state = scoreEntryState(inputs("-5", "0", "10"), {});
  assert.equal(state.valid, true);
  assert.deepEqual(state.rows.map(row => row.rank), ["3", "2", "1"]);
});

test("only tied participants require manual ranks from their actual positions", () => {
  const data = inputs("500", "741", "500", "500", "624");
  const pending = scoreEntryState(data, {});
  assert.deepEqual(pending.rows.map(row => row.rank), ["", "1", "", "", "2"]);
  assert.deepEqual(pending.rows[0].options, [3, 4, 5]);
  assert.equal(pending.valid, false);
  assert.equal(scoreEntryState(data, { "0": "5", "2": "3", "3": "4" }).valid, true);
  assert.equal(scoreEntryState(data, { "0": "3", "2": "3", "3": "4" }).valid, false);
  assert.equal(scoreEntryState(data, { "0": "1", "2": "3", "3": "4" }).valid, false);
});

test("handle multiple tied groups and an entirely tied table", () => {
  const state = scoreEntryState(inputs("100", "50", "100", "50", "0"), { "0": "1", "2": "2", "1": "3", "3": "4" });
  assert.equal(state.valid, true);
  assert.deepEqual(state.rows[1].options, [3, 4]);
  assert.equal(scoreEntryState(inputs("10", "10", "10"), { "0": "2", "1": "3", "2": "1" }).valid, true);
});

test("score edits clear affected manual choices and preserve unchanged groups", () => {
  const before = inputs("100", "100", "50", "50", "0");
  const manual = { "0": "1", "1": "2", "2": "3", "3": "4" };
  const after = inputs("90", "100", "50", "50", "0");
  assert.deepEqual(reconcileManualRanks(before, after, manual), { "2": "3", "3": "4" });
  assert.deepEqual(reconcileManualRanks(before, inputs("100", "100", "50", "50", "200"), manual), {});
  assert.deepEqual(reconcileManualRanks(before, inputs("", "100", "50", "50", "0"), manual), {});
});

test("saved results restore manual tied ranks without re-entry", () => {
  assert.equal(scoreEntryState(inputs("500", "500", "700"), { "0": "3", "1": "2", "2": "1" }).valid, true);
});
