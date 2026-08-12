import {
  anniversaryState,
  daysTogether,
  millisecondsUntilNextPontianakMidnight,
} from "./src/time.mjs";
import {
  createMessageDeck,
  createShootingStarSpecs,
  pickNextAntiCringe,
} from "./src/content.mjs";
import { createCrossfadeController } from "./src/audio.mjs";

const CANONICAL_URL = "https://whizher.github.io/our-tiny-universe/";
const ACTIVE_AMBIENT_WINDOW_MS = 60_000;
const CALM_AMBIENT_RANGE = [45_000, 90_000];
const ACTIVE_AMBIENT_RANGE = [18_000, 36_000];

function randomDelay([minimum, maximum], random) {
  const value = Math.min(0.999_999, Math.max(0, Number(random())));
  return minimum + Math.floor(value * (maximum - minimum + 1));
}

function createSharePayload(transmission, url) {
  if (!transmission) {
    return {
      clipboardText: url,
      nativePayload: {
        title: "Our Tiny Universe 🌌",
        text: "Same chaos, more teamwork.",
        url,
      },
    };
  }

  const name =
    transmission.source.charAt(0).toUpperCase() +
    transmission.source.slice(1);
  const text =
    "“" +
    transmission.message +
    "” — " +
    name +
    "\n\nOur Tiny Universe";

  return {
    clipboardText: text + "\n" + url,
    nativePayload: {
      title: "Transmission from " + name + " ✨",
      text,
      url,
    },
  };
}

export async function shareUniverse({
  nativeShare,
  writeClipboard,
  transmission = null,
  url = CANONICAL_URL,
}) {
  const payload = createSharePayload(transmission, url);

  if (nativeShare) {
    try {
      await nativeShare(payload.nativePayload);
      return "shared";
    } catch (error) {
      if (error && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  if (writeClipboard) {
    try {
      await writeClipboard(payload.clipboardText);
      return "copied";
    } catch {
      // Continue to the visible manual-link fallback.
    }
  }
  return "manual";
}

export function initSite({
  documentRef = document,
  now = () => new Date(),
  random = Math.random,
  schedule = setTimeout,
  cancelSchedule = clearTimeout,
  nativeShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
      ? navigator.share.bind(navigator)
      : null,
  writeClipboard =
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
      ? navigator.clipboard.writeText.bind(navigator.clipboard)
      : null,
  reducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  createSoundtrack = createCrossfadeController,
} = {}) {
  const counter = documentRef.querySelector("[data-days]");
  const universe = documentRef.querySelector("[data-universe]");
  const anniversaryStatus = documentRef.querySelector(
    "[data-anniversary-status]",
  );
  const messageTitle = documentRef.querySelector("[data-message-title]");
  const message = documentRef.querySelector("[data-message]");
  const antiButton = documentRef.querySelector("[data-anti-cringe]");
  const antiResult = documentRef.querySelector("[data-anti-result]");
  const shareButton = documentRef.querySelector("[data-share]");
  const shareStatus = documentRef.querySelector("[data-share-status]");
  const shareFallback = documentRef.querySelector("[data-share-fallback]");
  const shootingLayer = documentRef.querySelector("[data-shooting-stars]");
  const stars = [...documentRef.querySelectorAll("[data-message-source]")];
  const musicButton = documentRef.querySelector("[data-music-toggle]");
  const musicStatus = documentRef.querySelector("[data-music-status]");
  const audioChannels = [
    ...documentRef.querySelectorAll("[data-soundtrack-channel]"),
  ];

  const required = [
    counter,
    universe,
    anniversaryStatus,
    messageTitle,
    message,
    antiButton,
    antiResult,
    shareButton,
    shareStatus,
    shareFallback,
    shootingLayer,
  ];
  const sources = stars.map((star) => star.dataset.messageSource).sort();
  const validSources =
    sources.length === 2 &&
    sources[0] === "naufal" &&
    sources[1] === "rity";
  const validAudioChannels = audioChannels.length === 2;
  if (
    required.some((element) => !element) ||
    !validSources ||
    !musicButton ||
    !musicStatus ||
    !validAudioChannels
  ) {
    throw new Error("Our Tiny Universe markup is incomplete");
  }

  const messageDecks = new Map(
    ["naufal", "rity"].map((source) => [
      source,
      createMessageDeck(source, random),
    ]),
  );
  let midnightTimer;
  let cleanupTimer;
  let ambientTimer;
  let lastTransmissionActivityAt = -Infinity;
  let lastAntiCringeIndex = -1;
  let currentTransmission = null;
  let anniversaryActive = false;

  function renderShootingStars(preset) {
    if (reducedMotion()) return;

    const specs = createShootingStarSpecs(preset, random);
    const particles = specs.map((spec) => {
      const particle = documentRef.createElement("span");
      particle.className = spec.isComet
        ? "shooting-star shooting-star--comet"
        : "shooting-star";
      particle.dataset.tone = spec.color;
      particle.style.setProperty("--left", spec.left + "%");
      particle.style.setProperty("--top", spec.top + "%");
      particle.style.setProperty("--delay", spec.delayMs + "ms");
      particle.style.setProperty("--duration", spec.durationMs + "ms");
      particle.style.setProperty("--angle", spec.angleDeg + "deg");
      particle.style.setProperty("--trail", spec.trailPx + "px");
      particle.style.setProperty("--thickness", spec.thicknessPx + "px");
      particle.style.setProperty("--scale", String(spec.scale));
      particle.style.setProperty("--brightness", String(spec.brightness));
      particle.style.setProperty("--travel-x", spec.travelXvw + "vw");
      particle.style.setProperty("--travel-y", spec.travelYvh + "vh");
      return particle;
    });

    shootingLayer.replaceChildren(...particles);
    cancelSchedule(cleanupTimer);
    const maximumLifetime = Math.max(
      ...specs.map((spec) => spec.delayMs + spec.durationMs),
    );
    cleanupTimer = schedule(
      () => shootingLayer.replaceChildren(),
      maximumLifetime + 160,
    );
  }

  function renderTemporalState() {
    const current = now();
    counter.textContent =
      "Sudah " + daysTogether(current) + " hari di orbit yang sama.";
    const state = anniversaryState(current);
    universe.dataset.anniversary = String(state.isAnniversary);
    anniversaryStatus.textContent = state.isAnniversary
      ? "Orbit anniversary unlocked ✨"
      : state.daysUntilNext + " hari menuju orbit anniversary berikutnya.";

    if (state.isAnniversary && !anniversaryActive && !reducedMotion()) {
      renderShootingStars("anniversary");
    }
    anniversaryActive = state.isAnniversary;
  }

  function scheduleCounterUpdate() {
    midnightTimer = schedule(() => {
      renderTemporalState();
      scheduleCounterUpdate();
    }, millisecondsUntilNextPontianakMidnight(now()) + 50);
  }

  function scheduleAmbientMeteor() {
    cancelSchedule(ambientTimer);
    if (reducedMotion()) return;

    const elapsed = now().getTime() - lastTransmissionActivityAt;
    const range =
      elapsed < ACTIVE_AMBIENT_WINDOW_MS
        ? ACTIVE_AMBIENT_RANGE
        : CALM_AMBIENT_RANGE;

    ambientTimer = schedule(() => {
      renderShootingStars("ambient");
      scheduleAmbientMeteor();
    }, randomDelay(range, random));
  }

  function markTransmissionActivity() {
    lastTransmissionActivityAt = now().getTime();
    scheduleAmbientMeteor();
  }

  function revealMessage(event) {
    const source = event.currentTarget.dataset.messageSource;
    const selection = messageDecks.get(source).next();
    currentTransmission = selection;
    shareButton.textContent = "Share This Transmission";
    messageTitle.textContent =
      "Transmission from " +
      source.charAt(0).toUpperCase() +
      source.slice(1) +
      " ✨";
    message.textContent = selection.message;
    message.classList.remove("message--reveal");
    void message.offsetWidth;
    message.classList.add("message--reveal");
    renderShootingStars("transmission");
    markTransmissionActivity();
  }

  function launchAntiCringe() {
    const selection = pickNextAntiCringe(lastAntiCringeIndex, random);
    lastAntiCringeIndex = selection.index;
    antiResult.hidden = false;
    antiResult.textContent = selection.message;
    renderShootingStars("antiCringe");
  }

  async function launchShare() {
    shareStatus.hidden = true;
    shareStatus.textContent = "";
    shareFallback.hidden = true;
    const transmission = currentTransmission;
    const outcome = await shareUniverse({
      nativeShare,
      writeClipboard,
      transmission,
    });
    if (outcome === "copied") {
      shareStatus.textContent = transmission
        ? "Transmission copied ✨"
        : "Link copied ✨";
      shareStatus.hidden = false;
    } else if (outcome === "manual") {
      shareFallback.hidden = false;
    }
  }

  function renderMusicState(state) {
    const views = {
      idle: {
        accessibleLabel: "Play soundtrack",
        icon: "🎵",
        pressed: "false",
        status: "Tap 🎵 to start Lunar Drive.",
      },
      starting: {
        accessibleLabel: "Pause soundtrack",
        icon: "⏸",
        pressed: "true",
        status: "Tap 🎵 to start Lunar Drive.",
      },
      playing: {
        accessibleLabel: "Pause soundtrack",
        icon: "⏸",
        pressed: "true",
        status: "Lunar Drive — Mondo Loops",
      },
      resuming: {
        accessibleLabel: "Pause soundtrack",
        icon: "⏸",
        pressed: "true",
        status: "Lunar Drive — Mondo Loops",
      },
      paused: {
        accessibleLabel: "Resume soundtrack",
        icon: "▶",
        pressed: "false",
        status: "Lunar Drive — Mondo Loops · Paused",
      },
      error: {
        accessibleLabel: "Retry soundtrack",
        icon: "↻",
        pressed: "false",
        status: "Lunar Drive couldn’t start. Tap to try again.",
      },
    };
    const view = views[state];
    if (!view) return;
    musicButton.textContent = view.icon;
    musicButton.setAttribute("aria-label", view.accessibleLabel);
    musicButton.setAttribute("aria-pressed", view.pressed);
    musicStatus.textContent = view.status;
  }

  const soundtrack = createSoundtrack({
    channels: audioChannels,
    onStateChange: renderMusicState,
  });
  renderMusicState(soundtrack.getState());

  async function toggleSoundtrack() {
    if (["playing", "resuming", "starting"].includes(soundtrack.getState())) {
      soundtrack.pause();
    } else {
      await soundtrack.play();
    }
  }

  renderTemporalState();
  scheduleCounterUpdate();
  scheduleAmbientMeteor();
  stars.forEach((star) => star.addEventListener("click", revealMessage));
  antiButton.addEventListener("click", launchAntiCringe);
  shareButton.addEventListener("click", launchShare);
  musicButton.addEventListener("click", toggleSoundtrack);

  return {
    destroy() {
      stars.forEach((star) =>
        star.removeEventListener("click", revealMessage),
      );
      antiButton.removeEventListener("click", launchAntiCringe);
      shareButton.removeEventListener("click", launchShare);
      musicButton.removeEventListener("click", toggleSoundtrack);
      soundtrack.destroy();
      cancelSchedule(midnightTimer);
      cancelSchedule(ambientTimer);
      cancelSchedule(cleanupTimer);
      shootingLayer.replaceChildren();
    },
  };
}

function startSite() {
  const site = initSite();
  if (typeof window !== "undefined") {
    window.addEventListener(
      "pagehide",
      (event) => {
        if (!event.persisted) {
          site.destroy();
        }
      },
      { once: true },
    );
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startSite, { once: true });
  } else {
    startSite();
  }
}
