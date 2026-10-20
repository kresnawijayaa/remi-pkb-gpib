import assert from "node:assert/strict";
import test from "node:test";
import { generateDraw, reviewDraw, upgradeEventData, validateDraw } from "./model";
import { generateDrawReference } from "./rotation-reference.test-helper";

export function rotationFixture(count: number, dominant = false) {
  return upgradeEventData({
    settings: { name: "Uji rotasi", target: count, capacity: 5, rounds: 20, advancing: 1 },
    participants: Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}`, number: index + 1, name: `Peserta ${index + 1}`, communityId: dominant && index < count / 2 ? "dominant" : `c${index % 10}` })),
  });
}

function randomSequence(seed: number) {
  let calls = 0;
  const random = () => { calls++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  return { random, calls: () => calls };
}

for (const [count, dominant] of [[2, false], [5, false], [6, false], [12, false], [23, true], [40, true], [200, false]] as const) {
  test(`optimized rotation exactly matches original: ${count} people, dominant=${dominant}`, () => {
    for (const seed of [7, 42]) {
      const data = rotationFixture(count, dominant);
      for (let round = 1; round <= 5; round++) {
        const before = structuredClone(data);
        const oldRandom = randomSequence(seed + round);
        const newRandom = randomSequence(seed + round);
        const expected = generateDrawReference(data, round, oldRandom.random);
        const actual = generateDraw(data, round, newRandom.random);
        assert.deepEqual(actual, expected);
        assert.equal(newRandom.calls(), oldRandom.calls());
        assert.deepEqual(data, before, "generation must not mutate input/history");
        validateDraw(data, actual);
        actual.locked = true;
        data.draws.push(actual);
      }
    }
  });
}

test("200 people still get 20 distinct opponents across five rounds", () => {
  const data = rotationFixture(200);
  for (let round = 1; round <= 5; round++) {
    const draw = generateDraw(data, round, randomSequence(round * 42).random);
    const review = reviewDraw(draw.tables, data.participants, data.draws);
    assert.equal(review.repeats, 0);
    assert.equal(review.sameCommunity, 0);
    draw.locked = true;
    data.draws.push(draw);
  }
});
