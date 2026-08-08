export const MESSAGE_POOLS = Object.freeze({
  naufal: Object.freeze([
    "Naufal entered the orbit. Normal behavior immediately left.",
    "Current status: dramatic, but still present.",
    "Acts chaotic. Still checks if Rity is okay.",
    "Naufal has a plan. The universe is concerned.",
    "Somehow both the problem and the tech support.",
    "Orbit stability: questionable. Commitment: still online.",
    "Naufal found a new way to be weird. Again.",
    "Romance detected. Naufal is pretending not to notice.",
  ]),
  rity: Object.freeze([
    "Rity entered the orbit. Naufal's peace immediately left.",
    "Roasting Naufal remains a renewable energy source.",
    "Acts unimpressed. Keeps showing up anyway.",
    "Patience level: somehow still above zero.",
    "Rity detected unnecessary Naufal behavior.",
    "Romance detected. Sarcasm deployed immediately.",
    "Orbit supervisor: tired, but operational.",
    "Caring, but please do not make it weird.",
  ]),
});

export const ANTI_CRINGE_MESSAGES = Object.freeze([
  "Okay, cukup romantisnya.",
  "Romance levels exceeded safe limits.",
  "Emergency sarcasm deployed.",
  "Cringe contained. Orbit stabilized.",
]);

function boundedRandom(random) {
  return Math.min(0.999_999, Math.max(0, Number(random())));
}

function pickFromPool(pool, lastIndex, random) {
  let index = Math.floor(boundedRandom(random) * pool.length);
  if (index === lastIndex) {
    index = (index + 1) % pool.length;
  }
  return { index, message: pool[index] };
}

export function pickNextMessage(
  source,
  lastIndex = -1,
  random = Math.random,
) {
  const pool = MESSAGE_POOLS[source];
  if (!pool) {
    throw new RangeError("Unknown message source: " + source);
  }
  return { source, ...pickFromPool(pool, lastIndex, random) };
}

export function pickNextAntiCringe(
  lastIndex = -1,
  random = Math.random,
) {
  return pickFromPool(ANTI_CRINGE_MESSAGES, lastIndex, random);
}

export function createShootingStarSpecs(count = 12, random = Math.random) {
  return Array.from({ length: count }, () => ({
    left: 5 + boundedRandom(random) * 90,
    delayMs: boundedRandom(random) * 500,
    durationMs: 900 + boundedRandom(random) * 500,
  }));
}
