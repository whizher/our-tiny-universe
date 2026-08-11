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
