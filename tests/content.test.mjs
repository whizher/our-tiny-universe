import test from "node:test";
import assert from "node:assert/strict";
import {
  ANTI_CRINGE_MESSAGES,
  MESSAGE_POOLS,
  createShootingStarSpecs,
  pickNextAntiCringe,
  pickNextMessage,
} from "../src/content.mjs";

test("provides 24 distinct fictional transmissions per source", () => {
  assert.deepEqual(Object.keys(MESSAGE_POOLS), ["naufal", "rity"]);

  const allMessages = [];
  for (const [source, pool] of Object.entries(MESSAGE_POOLS)) {
    assert.equal(pool.length, 24, source + " pool length");
    assert.equal(new Set(pool).size, 24, source + " pool uniqueness");
    assert.equal(Object.isFrozen(pool), true, source + " pool immutability");
    for (const message of pool) {
      assert.equal(typeof message, "string");
      assert.notEqual(message.trim(), "");
      allMessages.push(message);
    }
  }

  assert.equal(new Set(allMessages).size, allMessages.length);
});

test("contains the approved anti-cringe responses", () => {
  assert.deepEqual(ANTI_CRINGE_MESSAGES, [
    "Okay, cukup romantisnya.",
    "Romance levels exceeded safe limits.",
    "Emergency sarcasm deployed.",
    "Cringe contained. Orbit stabilized.",
  ]);
});

test("selects independently by source without an immediate repeat", () => {
  assert.deepEqual(pickNextMessage("naufal", -1, () => 0), {
    source: "naufal",
    index: 0,
    message: MESSAGE_POOLS.naufal[0],
  });
  assert.deepEqual(pickNextMessage("rity", 0, () => 0), {
    source: "rity",
    index: 1,
    message: MESSAGE_POOLS.rity[1],
  });
});

test("selects the expanded final index and wraps its immediate repeat", () => {
  assert.deepEqual(pickNextMessage("naufal", -1, () => 1), {
    source: "naufal",
    index: 23,
    message: MESSAGE_POOLS.naufal[23],
  });
  assert.deepEqual(pickNextMessage("naufal", 23, () => 1), {
    source: "naufal",
    index: 0,
    message: MESSAGE_POOLS.naufal[0],
  });
  assert.deepEqual(pickNextMessage("rity", -1, () => 1), {
    source: "rity",
    index: 23,
    message: MESSAGE_POOLS.rity[23],
  });
  assert.deepEqual(pickNextMessage("rity", 23, () => 1), {
    source: "rity",
    index: 0,
    message: MESSAGE_POOLS.rity[0],
  });
});

test("rejects an unknown message source", () => {
  assert.throws(
    () => pickNextMessage("unknown", -1, () => 0),
    /Unknown message source/,
  );
});

test("selects anti-cringe copy without an immediate repeat", () => {
  assert.deepEqual(pickNextAntiCringe(0, () => 0), {
    index: 1,
    message: ANTI_CRINGE_MESSAGES[1],
  });
});

test("creates bounded shooting-star specifications", () => {
  const specs = createShootingStarSpecs(3, () => 0.5);
  assert.equal(specs.length, 3);
  for (const spec of specs) {
    assert.ok(spec.left >= 5 && spec.left <= 95);
    assert.ok(spec.delayMs >= 0 && spec.delayMs <= 500);
    assert.ok(spec.durationMs >= 900 && spec.durationMs <= 1_400);
  }
});
