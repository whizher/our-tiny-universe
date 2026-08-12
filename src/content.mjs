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
    "Naufal pressed one button. Three constellations filed complaints.",
    "Confidence: maximum. Instructions: unread.",
    "A quiet orbit lasted seven seconds. Naufal was there.",
    "Naufal called it a shortcut. Mission control called it character development.",
    "Signal acquired: one questionable idea and excellent commitment.",
    "Naufal is improvising. Please update the emergency checklist.",
    "Plot twist: the chaos came with snacks.",
    "Naufal challenged gravity. Gravity requested a break.",
    "Teasing protocol active. Affection hidden in the source code.",
    "Pretends this is casual. Maintains a suspiciously stable orbit.",
    "Soft heart detected beneath several layers of nonsense.",
    "The universe asked for subtlety. Naufal sent fireworks.",
    "Naufal missed the cue, found another cue, and committed to it.",
    "One part stardust, two parts stubbornness, somehow still reliable.",
    "Naufal remains online, emotionally buffering, and impossible to ignore.",
    "Mission status: unconventional, sincere, and somehow still on course.",
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
    "Rity reviewed the chaos and returned it with corrections.",
    "One raised eyebrow restored order to the galaxy.",
    "Rity's patience has entered low-power mode.",
    "Unnecessary drama detected. Rity opened the incident report.",
    "Rity said one sentence. Mission control is still recovering.",
    "Sarcasm calibrated. Affection safely concealed.",
    "Rity keeps the orbit steady while pretending this is not a full-time job.",
    "The universe tried nonsense. Rity declined.",
    "Rity's silence has excellent comedic timing.",
    "Kindness detected beneath premium-grade side-eye.",
    "Rity arrived with facts. Naufal arrived with a theory.",
    "Emergency response: one sigh, one solution, zero applause requested.",
    "Rity acts unbothered with suspicious consistency.",
    "Orbit status: stable. Rity checked it twice.",
    "She could explain it, but watching Naufal figure it out is funnier.",
    "Rity remains sharp, steady, and quietly on the same wavelength.",
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

function shuffledIndexes(length, random) {
  const indexes = Array.from({ length }, (_, index) => index);
  for (let current = indexes.length - 1; current > 0; current -= 1) {
    const swapIndex = Math.floor(boundedRandom(random) * (current + 1));
    [indexes[current], indexes[swapIndex]] = [
      indexes[swapIndex],
      indexes[current],
    ];
  }
  return indexes;
}

export function createMessageDeck(source, random = Math.random) {
  if (!Object.hasOwn(MESSAGE_POOLS, source)) {
    throw new RangeError("Unknown message source: " + source);
  }
  const pool = MESSAGE_POOLS[source];

  let remainingIndexes = [];
  let lastIndex = -1;

  function refill() {
    remainingIndexes = shuffledIndexes(pool.length, random);
    if (remainingIndexes[0] === lastIndex) {
      [remainingIndexes[0], remainingIndexes[1]] = [
        remainingIndexes[1],
        remainingIndexes[0],
      ];
    }
  }

  return Object.freeze({
    next() {
      if (remainingIndexes.length === 0) refill();
      const index = remainingIndexes.shift();
      lastIndex = index;
      return { source, index, message: pool[index] };
    },
  });
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

const SHOOTING_STAR_PRESETS = Object.freeze({
  ambient: Object.freeze({
    count: 2,
    delayMs: [0, 120],
    durationMs: [1_200, 1_900],
    angleDeg: [-48, -30],
    trailPx: [56, 92],
    thicknessPx: [1, 1.7],
    scale: [0.7, 0.95],
    brightness: [0.5, 0.72],
    cometChance: 0.03,
  }),
  transmission: Object.freeze({
    count: 5,
    delayMs: [0, 320],
    durationMs: [850, 1_350],
    angleDeg: [-50, -28],
    trailPx: [68, 112],
    thicknessPx: [1.2, 2.1],
    scale: [0.8, 1.08],
    brightness: [0.62, 0.86],
    cometChance: 0.08,
  }),
  antiCringe: Object.freeze({
    count: 12,
    delayMs: [0, 500],
    durationMs: [900, 1_500],
    angleDeg: [-52, -26],
    trailPx: [72, 126],
    thicknessPx: [1.3, 2.4],
    scale: [0.82, 1.16],
    brightness: [0.66, 0.92],
    cometChance: 0.12,
  }),
  anniversary: Object.freeze({
    count: 18,
    delayMs: [0, 900],
    durationMs: [950, 1_700],
    angleDeg: [-52, -26],
    trailPx: [76, 150],
    thicknessPx: [1.4, 3.2],
    scale: [0.85, 1.35],
    brightness: [0.7, 1],
    cometChance: 0.2,
  }),
});

function between([minimum, maximum], random) {
  return minimum + boundedRandom(random) * (maximum - minimum);
}

function pickMeteorColor(random) {
  const value = boundedRandom(random);
  if (value < 0.72) return "white";
  if (value < 0.86) return "gold";
  return "lavender";
}

export function createShootingStarSpecs(
  preset = "ambient",
  random = Math.random,
) {
  if (!Object.hasOwn(SHOOTING_STAR_PRESETS, preset)) {
    throw new RangeError("Unknown shooting-star preset: " + preset);
  }
  const config = SHOOTING_STAR_PRESETS[preset];

  return Array.from({ length: config.count }, () => {
    const isComet = boundedRandom(random) < config.cometChance;
    return Object.freeze({
      left: 5 + boundedRandom(random) * 90,
      top: -8 + boundedRandom(random) * 18,
      delayMs: between(config.delayMs, random),
      durationMs: between(config.durationMs, random),
      angleDeg: between(config.angleDeg, random),
      trailPx: between(config.trailPx, random),
      thicknessPx: between(config.thicknessPx, random),
      scale: between(config.scale, random),
      brightness: between(config.brightness, random),
      travelXvw: -(32 + boundedRandom(random) * 30),
      travelYvh: 72 + boundedRandom(random) * 32,
      color: pickMeteorColor(random),
      isComet,
    });
  });
}
