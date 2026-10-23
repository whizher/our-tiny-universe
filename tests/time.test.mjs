import test from "node:test";
import assert from "node:assert/strict";
import * as time from "../src/time.mjs";
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

test("capsule celebrates positive calendar anniversaries without changing legacy state", () => {
  for (const [year, number] of [[2023, -1], [2024, 0], [2025, 1], [2026, 2], [2027, 3], [2028, 4]]) {
    const date = new Date(`${year}-07-07T05:00:00Z`);
    assert.deepEqual(time.capsuleCelebrationState(date), {
      isAnniversary: number > 0, anniversaryNumber: number,
    });
    assert.deepEqual(Object.keys(anniversaryState(date)), ["isAnniversary", "daysUntilNext"]);
  }
});

test("capsule celebration and note eligibility use exact Pontianak entry and exit boundaries", () => {
  for (const [instant, celebrating, eligible] of [
    ["2027-07-06T16:59:59.999Z", false, false],
    ["2027-07-06T17:00:00.000Z", true, true],
    ["2027-07-07T16:59:59.999Z", true, true],
    ["2027-07-07T17:00:00.000Z", false, true],
  ]) {
    const date = new Date(instant);
    assert.deepEqual(time.capsuleCelebrationState(date), { isAnniversary: celebrating, anniversaryNumber: 3 });
    assert.equal(time.isAnniversaryNoteEligible(2027, date), eligible);
  }
});

test("published-note eligibility survives late publication, leap years and clock calendar changes", () => {
  for (const instant of ["2027-07-10T00:00:00Z", "2028-02-29T12:00:00Z", "2030-01-01T00:00:00Z"]) {
    assert.equal(time.isAnniversaryNoteEligible(2027, new Date(instant)), true);
  }
  assert.equal(time.isAnniversaryNoteEligible(2028, new Date("2028-07-06T16:59:59Z")), false);
  assert.equal(time.isAnniversaryNoteEligible(2028, new Date("2028-07-06T17:00:00Z")), true);
  assert.deepEqual(time.capsuleCelebrationState(new Date("2027-07-07T00:00:00+07:00")),
    time.capsuleCelebrationState(new Date("2027-07-06T13:00:00-04:00")));
});

test("note years reject retrospective and malformed values while invalid dates throw", () => {
  for (const year of [2025, 2026, "2027", 2027.5, NaN, Infinity, -Infinity, null]) {
    assert.equal(time.isAnniversaryNoteEligible(year, new Date("2030-01-01Z")), false);
  }
  assert.throws(() => time.capsuleCelebrationState(new Date("invalid")), TypeError);
  assert.throws(() => time.isAnniversaryNoteEligible(2027, new Date("invalid")), TypeError);
});
