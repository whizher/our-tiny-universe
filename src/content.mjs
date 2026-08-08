export const MESSAGES = Object.freeze([
  "Achievement unlocked: masih betah.",
  "Compatibility: surprisingly functional.",
  "Rity entered the orbit. Naufal forgot how to act normal.",
  "Masih awkward? Bagus, berarti normal.",
  "Two stars, zero chill.",
  "Status hubungan: stable, dengan sedikit chaos.",
]);

function boundedRandom(random) {
  return Math.min(0.999_999, Math.max(0, Number(random())));
}

export function pickNextMessage(lastIndex = -1, random = Math.random) {
  let index = Math.floor(boundedRandom(random) * MESSAGES.length);
  if (index === lastIndex) {
    index = (index + 1) % MESSAGES.length;
  }
  return { index, message: MESSAGES[index] };
}

export function createShootingStarSpecs(count = 12, random = Math.random) {
  return Array.from({ length: count }, () => ({
    left: 5 + boundedRandom(random) * 90,
    delayMs: boundedRandom(random) * 500,
    durationMs: 900 + boundedRandom(random) * 500,
  }));
}
