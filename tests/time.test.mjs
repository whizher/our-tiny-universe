import test from "node:test";
import assert from "node:assert/strict";
import {
  START_DATE,
  TIME_ZONE,
  anniversaryState,
  daysTogether,
  millisecondsUntilNextPontianakMidnight,
} from "../src/time.mjs";

test("exports the approved start date and time zone", () => {
  assert.deepEqual(START_DATE, { year: 2024, month: 7, day: 7 });
  assert.equal(TIME_ZONE, "Asia/Pontianak");
});

test("counts the relationship start date as day zero", () => {
  const startOfDayWib = new Date("2024-07-06T17:00:00.000Z");
  const endOfDayWib = new Date("2024-07-07T16:59:59.999Z");
  assert.equal(daysTogether(startOfDayWib), 0);
  assert.equal(daysTogether(endOfDayWib), 0);
});

test("increments at midnight in Pontianak", () => {
  const nextMidnightWib = new Date("2024-07-07T17:00:00.000Z");
  assert.equal(daysTogether(nextMidnightWib), 1);
});

test("never returns a negative public counter", () => {
  assert.equal(daysTogether(new Date("2024-01-01T00:00:00.000Z")), 0);
});

test("calculates the exact delay to the next Pontianak midnight", () => {
  const noonWib = new Date("2026-08-08T05:00:00.000Z");
  assert.equal(millisecondsUntilNextPontianakMidnight(noonWib), 43_200_000);
});

test("rejects invalid dates", () => {
  assert.throws(() => daysTogether(new Date("invalid")), TypeError);
});

test("reports the day before, day of, and day after the anniversary", () => {
  assert.deepEqual(
    anniversaryState(new Date("2026-07-06T05:00:00.000Z")),
    { isAnniversary: false, daysUntilNext: 1 },
  );
  assert.deepEqual(
    anniversaryState(new Date("2026-07-07T05:00:00.000Z")),
    { isAnniversary: true, daysUntilNext: 0 },
  );
  assert.deepEqual(
    anniversaryState(new Date("2026-07-08T05:00:00.000Z")),
    { isAnniversary: false, daysUntilNext: 364 },
  );
});

test("counts across a leap day when targeting the next anniversary", () => {
  assert.deepEqual(
    anniversaryState(new Date("2027-07-08T05:00:00.000Z")),
    { isAnniversary: false, daysUntilNext: 365 },
  );
});

test("anniversary state rejects invalid dates", () => {
  assert.throws(
    () => anniversaryState(new Date("invalid")),
    TypeError,
  );
});
