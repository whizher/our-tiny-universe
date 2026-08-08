import {
  daysTogether,
  millisecondsUntilNextPontianakMidnight,
} from "./src/time.mjs";
import {
  createShootingStarSpecs,
  pickNextMessage,
} from "./src/content.mjs";

export function initSite({
  documentRef = document,
  now = () => new Date(),
  random = Math.random,
  schedule = setTimeout,
  cancelSchedule = clearTimeout,
} = {}) {
  const counter = documentRef.querySelector("[data-days]");
  const message = documentRef.querySelector("[data-message]");
  const antiButton = documentRef.querySelector("[data-anti-cringe]");
  const antiResult = documentRef.querySelector("[data-anti-result]");
  const shootingLayer = documentRef.querySelector("[data-shooting-stars]");
  const stars = [...documentRef.querySelectorAll("[data-message-source]")];

  const required = [counter, message, antiButton, antiResult, shootingLayer];
  if (required.some((element) => !element) || stars.length !== 2) {
    throw new Error("Our Tiny Universe markup is incomplete");
  }

  let lastMessageIndex = -1;
  let midnightTimer;
  let cleanupTimer;

  function renderCounter() {
    counter.textContent =
      "Sudah " + daysTogether(now()) + " hari di orbit yang sama.";
  }

  function scheduleCounterUpdate() {
    midnightTimer = schedule(() => {
      renderCounter();
      scheduleCounterUpdate();
    }, millisecondsUntilNextPontianakMidnight(now()) + 50);
  }

  function revealMessage() {
    const selection = pickNextMessage(lastMessageIndex, random);
    lastMessageIndex = selection.index;
    message.textContent = selection.message;
  }

  function launchAntiCringe() {
    antiResult.hidden = false;
    antiResult.textContent = "Okay, cukup romantisnya.";
    const particles = createShootingStarSpecs(12, random).map((spec) => {
      const particle = documentRef.createElement("span");
      particle.className = "shooting-star";
      particle.style.setProperty("--left", spec.left + "%");
      particle.style.setProperty("--delay", spec.delayMs + "ms");
      particle.style.setProperty("--duration", spec.durationMs + "ms");
      return particle;
    });
    shootingLayer.replaceChildren(...particles);
    cancelSchedule(cleanupTimer);
    cleanupTimer = schedule(() => shootingLayer.replaceChildren(), 2_000);
  }

  renderCounter();
  scheduleCounterUpdate();
  stars.forEach((star) => star.addEventListener("click", revealMessage));
  antiButton.addEventListener("click", launchAntiCringe);

  return {
    destroy() {
      stars.forEach((star) =>
        star.removeEventListener("click", revealMessage),
      );
      antiButton.removeEventListener("click", launchAntiCringe);
      cancelSchedule(midnightTimer);
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
