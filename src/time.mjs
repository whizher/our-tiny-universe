const DAY_MS = 86_400_000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1_000;

export const TIME_ZONE = "Asia/Pontianak";
export const START_DATE = Object.freeze({ year: 2024, month: 7, day: 7 });

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function assertValidDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    throw new TypeError("Expected a valid Date");
  }
}

function pontianakParts(date) {
  assertValidDate(date);
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return { year: values.year, month: values.month, day: values.day };
}

function calendarOrdinal({ year, month, day }) {
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function daysTogether(date = new Date()) {
  const elapsed =
    calendarOrdinal(pontianakParts(date)) - calendarOrdinal(START_DATE);
  return Math.max(0, elapsed);
}

export function anniversaryState(date = new Date()) {
  const current = pontianakParts(date);
  const isAnniversary = current.month === 7 && current.day === 7;
  const nextYear =
    current.month < 7 || (current.month === 7 && current.day <= 7)
      ? current.year
      : current.year + 1;
  const daysUntilNext =
    calendarOrdinal({ year: nextYear, month: 7, day: 7 }) -
    calendarOrdinal(current);
  return { isAnniversary, daysUntilNext };
}

export function millisecondsUntilNextPontianakMidnight(date = new Date()) {
  const { year, month, day } = pontianakParts(date);
  const nextMidnightUtc =
    Date.UTC(year, month - 1, day + 1) - WIB_OFFSET_MS;
  return Math.max(0, nextMidnightUtc - date.getTime());
}
