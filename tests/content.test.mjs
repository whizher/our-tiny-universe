import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ANTI_CRINGE_MESSAGES,
  MESSAGE_POOLS,
  createMessageDeck,
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

test("deals every source transmission exactly once per cycle", () => {
  for (const source of ["naufal", "rity"]) {
    const deck = createMessageDeck(source, () => 1);
    const expectedIndexes = MESSAGE_POOLS[source].map((_, index) => index);

    for (let cycle = 0; cycle < 2; cycle += 1) {
      const selections = Array.from(
        { length: MESSAGE_POOLS[source].length },
        () => deck.next(),
      );
      assert.deepEqual(
        selections.map((selection) => selection.index),
        expectedIndexes,
        source + " cycle " + cycle,
      );
      assert.ok(
        selections.every(
          (selection) =>
            selection.source === source &&
            selection.message === MESSAGE_POOLS[source][selection.index],
        ),
      );
    }
  }
});

test("prevents an immediate repeat across a reshuffle boundary", () => {
  const randomValues = [
    ...Array(23).fill(1),
    0,
    ...Array(22).fill(1),
  ];
  const deck = createMessageDeck(
    "naufal",
    () => randomValues.shift() ?? 1,
  );
  const firstCycle = Array.from(
    { length: MESSAGE_POOLS.naufal.length },
    () => deck.next(),
  );
  const nextCycleFirst = deck.next();

  assert.equal(firstCycle.at(-1).index, 23);
  assert.equal(nextCycleFirst.index, 1);
  assert.notEqual(nextCycleFirst.index, firstCycle.at(-1).index);
});

test("keeps message deck state independent by source", () => {
  const naufalDeck = createMessageDeck("naufal", () => 1);
  const rityDeck = createMessageDeck("rity", () => 1);

  assert.equal(naufalDeck.next().index, 0);
  assert.equal(naufalDeck.next().index, 1);
  assert.equal(rityDeck.next().index, 0);
});

test("uses injected randomness deterministically", () => {
  const firstDeck = createMessageDeck("naufal", () => 0.5);
  const secondDeck = createMessageDeck("naufal", () => 0.5);
  const draw = (deck) =>
    Array.from({ length: 8 }, () => deck.next().index);

  assert.deepEqual(draw(firstDeck), draw(secondDeck));
});

test("rejects an unknown message deck source", () => {
  assert.throws(
    () => createMessageDeck("unknown", () => 0),
    /Unknown message source/,
  );
});

test("rejects inherited message deck sources", () => {
  for (const source of ["toString", "__proto__"]) {
    assert.throws(
      () => createMessageDeck(source, () => 0),
      /Unknown message source/,
      source,
    );
  }
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

test("creates bounded shooting-star specifications for every preset", () => {
  const expectedCounts = {
    ambient: 2,
    transmission: 5,
    antiCringe: 12,
    anniversary: 18,
  };

  for (const [preset, expectedCount] of Object.entries(expectedCounts)) {
    const specs = createShootingStarSpecs(preset, () => 0.5);
    assert.equal(specs.length, expectedCount, preset);
    for (const spec of specs) {
      assert.ok(spec.left >= 5 && spec.left <= 95);
      assert.ok(spec.top >= -8 && spec.top <= 10);
      assert.ok(spec.delayMs >= 0 && spec.delayMs <= 900);
      assert.ok(spec.durationMs >= 850 && spec.durationMs <= 1_900);
      assert.ok(spec.angleDeg >= -52 && spec.angleDeg <= -26);
      assert.ok(spec.trailPx >= 56 && spec.trailPx <= 150);
      assert.ok(spec.thicknessPx >= 1 && spec.thicknessPx <= 3.2);
      assert.ok(spec.scale >= 0.7 && spec.scale <= 1.35);
      assert.ok(spec.brightness >= 0.5 && spec.brightness <= 1);
      assert.ok(spec.travelXvw >= -62 && spec.travelXvw <= -32);
      assert.ok(spec.travelYvh >= 72 && spec.travelYvh <= 104);
      assert.ok(["white", "gold", "lavender"].includes(spec.color));
      assert.equal(typeof spec.isComet, "boolean");
      assert.equal(Object.isFrozen(spec), true);
    }
  }
});

test("creates deterministic shooting-star specifications", () => {
  assert.deepEqual(
    createShootingStarSpecs("transmission", () => 0.25),
    createShootingStarSpecs("transmission", () => 0.25),
  );
});

test("rejects an unknown shooting-star preset", () => {
  assert.throws(
    () => createShootingStarSpecs("meteorApocalypse", () => 0),
    /Unknown shooting-star preset/,
  );
});

test("Pages workflow pins every external action to an approved immutable commit", async () => {
  const workflow = await readFile(".github/workflows/pages.yml", "utf8");
  const approved = new Map([
    ["actions/checkout", "d23441a48e516b6c34aea4fa41551a30e30af803"],
    ["actions/setup-node", "49933ea5288caeca8642d1e84afbd3f7d6820020"],
    ["actions/configure-pages", "983d7736d9b0ae728b81ab479565c72886d7745b"],
    ["actions/upload-pages-artifact", "7b1f4a764d45c48632c6b24a0339c27f5614fb0b"],
    ["actions/deploy-pages", "d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e"],
  ]);
  const uses = [
    ...workflow.matchAll(/^\s*uses:\s+([^@\s]+)@([^\s#]+)(?:\s+#.*)?$/gm),
  ];

  assert.equal(uses.length, approved.size);
  assert.deepEqual(
    new Set(uses.map(([, action]) => action)),
    new Set(approved.keys()),
  );
  for (const [, action, ref] of uses) {
    assert.match(ref, /^[0-9a-f]{40}$/);
    assert.equal(ref, approved.get(action));
  }
});
