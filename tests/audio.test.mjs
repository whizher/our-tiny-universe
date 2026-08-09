import test from "node:test";
import assert from "node:assert/strict";
import {
  createCrossfadeController,
  equalPowerVolumes,
} from "../src/audio.mjs";

class FakeAudio {
  constructor({ duration = 20 } = {}) {
    this.currentTime = 0;
    this.duration = duration;
    this.ended = false;
    this.paused = true;
    this.volume = 1;
    this.listeners = new Map();
    this.playCalls = 0;
    this.playFailures = [];
    this.playWaits = [];
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((item) => item !== listener));
  }

  async play() {
    this.playCalls += 1;
    const failure = this.playFailures.shift();
    if (failure) throw failure;
    const wait = this.playWaits.shift();
    if (wait) await wait;
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  emit(type) {
    for (const listener of this.listeners.get(type) || []) listener();
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }
}

class QueuedPauseAudio extends FakeAudio {
  constructor(pauseEvents) {
    super();
    this.pauseEvents = pauseEvents;
  }

  pause() {
    if (this.paused) return;
    super.pause();
    this.pauseEvents.push(() => this.emit("pause"));
  }
}

function createFrames() {
  let nextId = 1;
  const callbacks = new Map();
  return {
    cancel: (id) => callbacks.delete(id),
    runNext(timestamp) {
      const [id, callback] = callbacks.entries().next().value;
      callbacks.delete(id);
      callback(timestamp);
    },
    schedule(callback) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    size: () => callbacks.size,
  };
}

const flushPlayback = () => new Promise((resolve) => setImmediate(resolve));

const EXPECTED_DEFAULT_TARGET_VOLUME = 0.5;

test("calculates a clamped equal-power crossfade", () => {
  assert.deepEqual(equalPowerVolumes(0, 0.3), {
    outgoing: 0.3,
    incoming: 0,
  });
  const halfway = equalPowerVolumes(0.5, 0.3);
  assert.ok(Math.abs(halfway.outgoing - Math.SQRT1_2 * 0.3) < 1e-12);
  assert.ok(Math.abs(halfway.incoming - Math.SQRT1_2 * 0.3) < 1e-12);
  assert.deepEqual(equalPowerVolumes(2, 0.3), {
    outgoing: 0,
    incoming: 0.3,
  });
});

test("uses 50% as the default equal-power target", () => {
  assert.deepEqual(equalPowerVolumes(0), {
    outgoing: EXPECTED_DEFAULT_TARGET_VOLUME,
    incoming: 0,
  });
  const halfway = equalPowerVolumes(0.5);
  assert.ok(
    Math.abs(
      halfway.outgoing -
        Math.SQRT1_2 * EXPECTED_DEFAULT_TARGET_VOLUME
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      halfway.incoming -
        Math.SQRT1_2 * EXPECTED_DEFAULT_TARGET_VOLUME
    ) < 1e-12,
  );
  assert.deepEqual(equalPowerVolumes(1), {
    outgoing: 0,
    incoming: EXPECTED_DEFAULT_TARGET_VOLUME,
  });
});

test("plays, pauses, and resumes only from explicit calls", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const states = [];
  const controller = createCrossfadeController({
    channels,
    onStateChange: (state) => states.push(state),
  });

  assert.equal(controller.getState(), "idle");
  assert.ok(channels.every((channel) => channel.paused));
  assert.equal(await controller.play(), true);
  assert.equal(channels[0].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(controller.getState(), "playing");

  controller.pause();
  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));

  assert.equal(await controller.play(), true);
  assert.equal(controller.getState(), "playing");
  assert.deepEqual(states, [
    "idle",
    "starting",
    "playing",
    "paused",
    "resuming",
    "playing",
  ]);
});

test("ignores a queued controller-owned pause event after explicit Resume", async () => {
  const pauseEvents = [];
  const channels = [
    new QueuedPauseAudio(pauseEvents),
    new QueuedPauseAudio(pauseEvents),
  ];
  const controller = createCrossfadeController({ channels });

  await controller.play();
  while (pauseEvents.length) pauseEvents.shift()();

  controller.pause();
  assert.equal(pauseEvents.length, 1);
  const resumed = controller.play();
  assert.equal(controller.getState(), "resuming");

  pauseEvents.shift()();

  assert.equal(await resumed, true);
  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].paused, false);

  channels[0].pause();
  pauseEvents.shift()();
  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));
});

test("preserves explicit Resume when an external pause is queued before a controller pause", async () => {
  const pauseEvents = [];
  const channels = [
    new QueuedPauseAudio(pauseEvents),
    new QueuedPauseAudio(pauseEvents),
  ];
  const controller = createCrossfadeController({ channels });

  await controller.play();
  while (pauseEvents.length) pauseEvents.shift()();

  channels[0].pause();
  controller.pause();
  const firstResume = controller.play();
  controller.pause();
  const finalResume = controller.play();

  assert.equal(pauseEvents.length, 2);
  assert.equal(await firstResume, false);
  assert.equal(await finalResume, true);
  assert.equal(controller.getState(), "playing");

  pauseEvents.shift()();
  assert.equal(controller.getState(), "playing");

  pauseEvents.shift()();
  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].paused, false);
});

test("authorizes both channels inaudibly during the initial play gesture", async () => {
  let gestureActive = true;
  class GestureAuthorizedAudio extends FakeAudio {
    constructor() {
      super();
      this.authorized = false;
      this.playVolumes = [];
    }

    async play() {
      this.playVolumes.push(this.volume);
      if (!this.authorized) {
        if (!gestureActive) {
          const error = new Error("media element was not gesture-authorized");
          error.name = "NotAllowedError";
          throw error;
        }
        this.authorized = true;
      }
      return super.play();
    }
  }

  const channels = [new GestureAuthorizedAudio(), new GestureAuthorizedAudio()];
  const frames = createFrames();
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  const playback = controller.play();
  gestureActive = false;

  assert.equal(await playback, true);
  assert.deepEqual(
    channels[0].playVolumes,
    [EXPECTED_DEFAULT_TARGET_VOLUME],
  );
  assert.deepEqual(channels[1].playVolumes, [0]);
  assert.equal(channels[1].paused, true);
  assert.equal(channels[1].currentTime, 0);

  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();

  assert.equal(controller.getState(), "playing");
  assert.equal(channels[1].paused, false);
  assert.equal(frames.size(), 1);
});

test("fails cleanly when standby authorization rejects", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  channels[1].playFailures.push(new Error("standby authorization denied"));
  const controller = createCrossfadeController({ channels });

  assert.equal(await controller.play(), false);
  assert.equal(controller.getState(), "error");
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));
  assert.ok(channels.every((channel) => channel.volume === 0));
});

test("coalesces rapid initial play requests", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  let releaseActive;
  channels[0].playWaits.push(new Promise((resolve) => {
    releaseActive = resolve;
  }));
  const controller = createCrossfadeController({ channels });

  const firstPlay = controller.play();
  const secondPlay = controller.play();

  assert.equal(channels[0].playCalls, 1);
  assert.equal(channels[1].playCalls, 1);
  releaseActive();
  assert.deepEqual(await Promise.all([firstPlay, secondPlay]), [true, true]);
  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].playCalls, 1);
  assert.equal(channels[1].playCalls, 1);
});

test("allows Pause after active playback starts while authorization is pending", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  let releaseStandby;
  channels[1].playWaits.push(new Promise((resolve) => {
    releaseStandby = resolve;
  }));
  const controller = createCrossfadeController({ channels });

  const playback = controller.play();
  await flushPlayback();

  assert.equal(channels[0].paused, false);
  assert.equal(channels[1].paused, true);
  assert.equal(controller.getState(), "playing");
  controller.pause();
  releaseStandby();

  assert.equal(await playback, false);
  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));
});

test("cancels an initial start before either authorization settles", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  let rejectActive;
  let rejectStandby;
  channels[0].playWaits.push(new Promise((_, reject) => {
    rejectActive = reject;
  }));
  channels[1].playWaits.push(new Promise((_, reject) => {
    rejectStandby = reject;
  }));
  const controller = createCrossfadeController({ channels });

  const playback = controller.play();
  assert.equal(controller.getState(), "starting");
  controller.pause();
  assert.equal(controller.getState(), "idle");

  const abortError = new Error("initial start interrupted by Pause");
  abortError.name = "AbortError";
  rejectActive(abortError);
  rejectStandby(abortError);

  assert.equal(await playback, false);
  assert.equal(controller.getState(), "idle");
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));
  assert.ok(channels.every((channel) => channel.volume === 0));
});

test("re-authorizes standby on Resume after initial priming is aborted", async () => {
  let gestureActive = true;
  class InterruptibleGestureAudio extends FakeAudio {
    constructor() {
      super();
      this.authorized = false;
    }

    async play() {
      this.playCalls += 1;
      if (!this.authorized && !gestureActive) {
        const error = new Error("media element was not gesture-authorized");
        error.name = "NotAllowedError";
        throw error;
      }
      const failure = this.playFailures.shift();
      if (failure) throw failure;
      const wait = this.playWaits.shift();
      if (wait) await wait;
      this.authorized = true;
      this.paused = false;
    }
  }

  const channels = [
    new InterruptibleGestureAudio(),
    new InterruptibleGestureAudio(),
  ];
  const frames = createFrames();
  let rejectInitialStandby;
  channels[1].playWaits.push(new Promise((_, reject) => {
    rejectInitialStandby = reject;
  }));
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  const initialPlayback = controller.play();
  gestureActive = false;
  await flushPlayback();
  assert.equal(controller.getState(), "playing");
  controller.pause();
  const abortError = new Error("standby priming interrupted by Pause");
  abortError.name = "AbortError";
  rejectInitialStandby(abortError);
  assert.equal(await initialPlayback, false);
  assert.equal(channels[1].authorized, false);

  gestureActive = true;
  const resumed = controller.play();
  gestureActive = false;
  assert.equal(await resumed, true);
  assert.equal(channels[1].authorized, true);

  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();

  assert.equal(controller.getState(), "playing");
  assert.equal(channels[1].paused, false);
  assert.equal(frames.size(), 1);
});

test("crossfades at the loop boundary and swaps channel roles", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();

  assert.equal(channels[1].currentTime, 0);
  assert.equal(channels[1].paused, false);

  frames.runNext(2_500);
  assert.ok(
    Math.abs(
      channels[0].volume -
        Math.SQRT1_2 * EXPECTED_DEFAULT_TARGET_VOLUME
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      channels[1].volume -
        Math.SQRT1_2 * EXPECTED_DEFAULT_TARGET_VOLUME
    ) < 1e-12,
  );

  frames.runNext(5_000);
  assert.equal(channels[0].paused, true);
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].volume, 0);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);

  channels[1].currentTime = 15;
  channels[1].emit("timeupdate");
  await flushPlayback();

  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].paused, false);
  assert.equal(frames.size(), 1);
});

test("pauses and resumes the remaining portion of an active fade", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let clock = 0;
  const controller = createCrossfadeController({
    channels,
    now: () => clock,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  frames.runNext(2_000);

  controller.pause();
  assert.equal(controller.getState(), "paused");
  assert.equal(frames.size(), 0);
  assert.ok(channels.every((channel) => channel.paused));

  clock = 7_000;
  assert.equal(await controller.play(), true);
  assert.equal(frames.size(), 1);
  assert.ok(channels.every((channel) => !channel.paused));

  frames.runNext(10_000);
  assert.equal(channels[0].paused, true);
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].volume, 0);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(frames.size(), 0);
});

test("preserves fade time elapsed before Pause without a delivered frame", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let clock = 0;
  const controller = createCrossfadeController({
    channels,
    now: () => clock,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  assert.equal(frames.size(), 1);

  clock = 2_000;
  controller.pause();
  clock = 7_000;
  assert.equal(await controller.play(), true);
  frames.runNext(10_000);

  assert.equal(channels[0].paused, true);
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].volume, 0);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(frames.size(), 0);
});

test("promotes the standby channel when the active channel ends before a fade", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const controller = createCrossfadeController({ channels });

  await controller.play();
  channels[0].emit("ended");
  await flushPlayback();

  assert.equal(channels[0].paused, true);
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].volume, 0);
  assert.equal(channels[1].currentTime, 0);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(controller.getState(), "playing");
});

test("enters error when ended-fallback standby playback rejects", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const controller = createCrossfadeController({ channels });

  await controller.play();
  channels[1].playFailures.push(new Error("ended fallback denied"));
  channels[0].emit("ended");
  await flushPlayback();

  assert.equal(controller.getState(), "error");
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));
  assert.ok(channels.every((channel) => channel.volume === 0));
});

test("keeps Pause when pending ended-fallback playback aborts", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  let rejectStandby;
  const controller = createCrossfadeController({ channels });

  await controller.play();
  channels[1].playWaits.push(new Promise((_, reject) => {
    rejectStandby = reject;
  }));
  channels[0].emit("ended");
  controller.pause();
  const abortError = new Error("ended fallback interrupted by Pause");
  abortError.name = "AbortError";
  rejectStandby(abortError);
  await flushPlayback();

  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));
});

test("retires stale ended-fallback completion after failure and retry", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  let releaseStaleStandby;
  const controller = createCrossfadeController({ channels });

  await controller.play();
  channels[1].playWaits.push(new Promise((resolve) => {
    releaseStaleStandby = resolve;
  }));
  channels[0].emit("ended");
  controller.pause();

  channels[0].playFailures.push(new Error("resume failed"));
  assert.equal(await controller.play(), false);
  assert.equal(controller.getState(), "error");
  assert.equal(await controller.play(), true);
  assert.equal(controller.getState(), "playing");

  releaseStaleStandby();
  await flushPlayback();

  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].paused, false);
  assert.equal(channels[0].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(channels[1].paused, true);
  assert.equal(channels[1].volume, 0);
});

test("keeps the ended fallback active when natural end also emits pause", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const controller = createCrossfadeController({ channels });

  await controller.play();
  channels[0].currentTime = channels[0].duration;
  channels[0].ended = true;
  channels[0].paused = true;
  channels[0].emit("pause");
  channels[0].emit("ended");
  await flushPlayback();

  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].paused, true);
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
});

test("promotes the incoming channel when the outgoing channel ends during a fade", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  assert.equal(frames.size(), 1);

  channels[0].emit("ended");

  assert.equal(frames.size(), 0);
  assert.equal(channels[0].paused, true);
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].volume, 0);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
});

test("promotes incoming when outgoing ends during pending fade startup", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseStandby;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[1].playWaits.push(new Promise((resolve) => {
    releaseStandby = resolve;
  }));
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  channels[0].emit("ended");
  releaseStandby();
  await flushPlayback();

  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].paused, true);
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].volume, 0);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(frames.size(), 0);
});

test("recovers from a rejected initial play on a later explicit retry", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const states = [];
  channels[0].playFailures.push(new Error("play denied"));
  const controller = createCrossfadeController({
    channels,
    onStateChange: (state) => states.push(state),
  });

  assert.equal(await controller.play(), false);
  assert.equal(controller.getState(), "error");
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));

  channels[0].currentTime = 9;
  assert.equal(await controller.play(), true);
  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.deepEqual(states, [
    "idle",
    "starting",
    "error",
    "starting",
    "playing",
  ]);
});

test("destroy removes media work and remains inert when called again", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  const states = [];
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
    onStateChange: (state) => states.push(state),
  });

  assert.equal(channels[0].listenerCount("timeupdate"), 1);
  assert.equal(channels[0].listenerCount("ended"), 1);
  assert.equal(channels[0].listenerCount("pause"), 1);
  assert.equal(channels[0].listenerCount("error"), 1);
  assert.equal(channels[1].listenerCount("timeupdate"), 1);
  assert.equal(channels[1].listenerCount("ended"), 1);
  assert.equal(channels[1].listenerCount("pause"), 1);
  assert.equal(channels[1].listenerCount("error"), 1);
  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  assert.equal(frames.size(), 1);

  controller.destroy();
  controller.destroy();

  assert.equal(channels[0].listenerCount("timeupdate"), 0);
  assert.equal(channels[0].listenerCount("ended"), 0);
  assert.equal(channels[0].listenerCount("pause"), 0);
  assert.equal(channels[0].listenerCount("error"), 0);
  assert.equal(channels[1].listenerCount("timeupdate"), 0);
  assert.equal(channels[1].listenerCount("ended"), 0);
  assert.equal(channels[1].listenerCount("pause"), 0);
  assert.equal(channels[1].listenerCount("error"), 0);
  assert.equal(frames.size(), 0);
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));
  assert.equal(controller.getState(), "destroyed");

  channels[0].emit("timeupdate");
  channels[0].emit("ended");
  assert.equal(await controller.play(), false);
  controller.pause();
  assert.equal(controller.getState(), "destroyed");
  assert.equal(frames.size(), 0);
  assert.deepEqual(states, ["idle", "starting", "playing", "destroyed"]);
});

test("coalesces concurrent loop-boundary events into one fade", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  channels[0].emit("timeupdate");
  await flushPlayback();

  assert.equal(channels[1].paused, false);
  assert.equal(frames.size(), 1);
});

test("enters error without scheduled work when standby playback rejects", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[1].playFailures.push(new Error("standby denied"));
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();

  assert.equal(controller.getState(), "error");
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));
  assert.equal(frames.size(), 0);
});

test("keeps an intentional pause when pending standby playback aborts", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let rejectStandby;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[1].playWaits.push(new Promise((_, reject) => {
    rejectStandby = reject;
  }));
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  controller.pause();
  const abortError = new Error("play interrupted by pause");
  abortError.name = "AbortError";
  rejectStandby(abortError);
  await flushPlayback();

  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));
  assert.equal(frames.size(), 0);
});

test("retires stale standby completion after playback failure and retry", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseStaleStandby;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[1].playWaits.push(new Promise((resolve) => {
    releaseStaleStandby = resolve;
  }));
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  controller.pause();

  channels[0].playFailures.push(new Error("resume failed"));
  assert.equal(await controller.play(), false);
  assert.equal(controller.getState(), "error");
  assert.equal(await controller.play(), true);
  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].paused, false);
  assert.equal(channels[1].paused, true);
  assert.equal(frames.size(), 0);

  releaseStaleStandby();
  await flushPlayback();

  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].paused, false);
  assert.equal(channels[0].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(channels[1].paused, true);
  assert.equal(channels[1].volume, 0);
  assert.equal(frames.size(), 0);
});

test("retires the originally requested channel after a later role swap", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseStaleActive;
  channels[0].playWaits.push(new Promise((resolve) => {
    releaseStaleActive = resolve;
  }));
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  const stalePlayback = controller.play();
  await flushPlayback();
  channels[0].emit("error");
  assert.equal(controller.getState(), "error");

  assert.equal(await controller.play(), true);
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  channels[0].emit("ended");
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);

  releaseStaleActive();
  assert.equal(await stalePlayback, false);

  assert.equal(controller.getState(), "playing");
  assert.equal(channels[0].paused, true);
  assert.equal(channels[0].currentTime, 0);
  assert.equal(channels[0].volume, 0);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(frames.size(), 0);
});

test("restarts a retired pending fade after an explicit resume", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let clock = 0;
  let releaseStandby;
  const controller = createCrossfadeController({
    channels,
    now: () => clock,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[1].playWaits.push(new Promise((resolve) => {
    releaseStandby = resolve;
  }));
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  controller.pause();
  releaseStandby();
  await flushPlayback();

  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));
  assert.equal(frames.size(), 0);

  clock = 100;
  assert.equal(await controller.play(), true);
  assert.equal(channels[0].paused, false);
  assert.equal(channels[1].paused, true);
  assert.equal(frames.size(), 0);

  channels[0].emit("timeupdate");
  await flushPlayback();
  assert.ok(channels.every((channel) => !channel.paused));
  assert.equal(frames.size(), 1);
  frames.runNext(5_100);
  assert.equal(channels[0].paused, true);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
});

test("duplicate ended events do not complete the following fade early", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseStandby;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[1].playWaits.push(new Promise((resolve) => {
    releaseStandby = resolve;
  }));
  channels[0].emit("ended");
  channels[0].emit("ended");
  releaseStandby();
  await flushPlayback();
  assert.equal(channels[1].paused, false);

  channels[1].currentTime = 15;
  channels[1].emit("timeupdate");
  await flushPlayback();

  assert.equal(channels[1].paused, false);
  assert.equal(channels[0].paused, false);
  assert.equal(frames.size(), 1);
});

test("destroy wins over a pending initial play", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  let releasePlayback;
  channels[0].playWaits.push(new Promise((resolve) => {
    releasePlayback = resolve;
  }));
  const controller = createCrossfadeController({ channels });

  const playback = controller.play();
  controller.destroy();
  releasePlayback();

  assert.equal(await playback, false);
  assert.equal(controller.getState(), "destroyed");
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));
});

test("pause wins when the outgoing channel ends during pending fade startup", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseStandby;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[1].playWaits.push(new Promise((resolve) => {
    releaseStandby = resolve;
  }));
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  channels[0].emit("ended");
  controller.pause();
  releaseStandby();
  await flushPlayback();

  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));
  assert.equal(frames.size(), 0);
});

test("resumes an established fade while active playback is pending", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseActive;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  controller.pause();

  channels[0].playWaits.push(new Promise((resolve) => {
    releaseActive = resolve;
  }));
  const resumed = controller.play();
  await flushPlayback();
  assert.equal(controller.getState(), "resuming");
  assert.equal(frames.size(), 0);

  releaseActive();
  assert.equal(await resumed, true);
  assert.equal(controller.getState(), "playing");
  assert.ok(channels.every((channel) => !channel.paused));
  assert.equal(frames.size(), 1);

  frames.runNext(5_000);
  assert.equal(channels[0].paused, true);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(frames.size(), 0);
});

test("allows Pause after one fade channel resumes while the other is pending", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseIncoming;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  controller.pause();

  channels[1].playWaits.push(new Promise((resolve) => {
    releaseIncoming = resolve;
  }));
  const resumed = controller.play();
  await flushPlayback();

  assert.equal(channels[0].paused, false);
  assert.equal(channels[1].paused, true);
  assert.equal(controller.getState(), "playing");
  controller.pause();
  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));

  releaseIncoming();
  assert.equal(await resumed, false);
  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));
  assert.equal(frames.size(), 0);
});

test("cancels fade resume before either channel settles", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let rejectOutgoing;
  let rejectIncoming;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  controller.pause();

  channels[0].playWaits.push(new Promise((_, reject) => {
    rejectOutgoing = reject;
  }));
  channels[1].playWaits.push(new Promise((_, reject) => {
    rejectIncoming = reject;
  }));
  const resumed = controller.play();
  assert.equal(controller.getState(), "resuming");
  controller.pause();
  assert.equal(controller.getState(), "paused");

  const abortError = new Error("fade resume interrupted by Pause");
  abortError.name = "AbortError";
  rejectOutgoing(abortError);
  rejectIncoming(abortError);

  assert.equal(await resumed, false);
  assert.equal(controller.getState(), "paused");
  assert.ok(channels.every((channel) => channel.paused));
  assert.equal(frames.size(), 0);
});

test("fails if incoming resume rejects after the outgoing channel ends", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let rejectIncoming;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  controller.pause();

  channels[1].playWaits.push(new Promise((_, reject) => {
    rejectIncoming = reject;
  }));
  const resumed = controller.play();
  await flushPlayback();
  assert.equal(controller.getState(), "playing");

  channels[0].ended = true;
  channels[0].paused = true;
  channels[0].emit("pause");
  channels[0].emit("ended");
  rejectIncoming(new Error("incoming resume failed after outgoing ended"));

  assert.equal(await resumed, false);
  assert.equal(controller.getState(), "error");
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));
  assert.ok(channels.every((channel) => channel.volume === 0));
  assert.equal(frames.size(), 0);
});

test("destroy wins over mixed pending fade resume results", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseOutgoing;
  let rejectIncoming;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  controller.pause();

  channels[0].playWaits.push(new Promise((resolve) => {
    releaseOutgoing = resolve;
  }));
  channels[1].playWaits.push(new Promise((_, reject) => {
    rejectIncoming = reject;
  }));
  const resumed = controller.play();
  controller.destroy();
  releaseOutgoing();
  rejectIncoming(new Error("incoming resume failed after destroy"));

  assert.equal(await resumed, false);
  assert.equal(controller.getState(), "destroyed");
  assert.ok(channels.every((channel) => channel.paused));
  assert.ok(channels.every((channel) => channel.currentTime === 0));
  assert.ok(channels.every((channel) => channel.volume === 0));
  assert.equal(frames.size(), 0);
});

test("coalesces concurrent resumes into one fade frame", async () => {
  const channels = [new FakeAudio(), new FakeAudio()];
  const frames = createFrames();
  let releaseActive;
  const controller = createCrossfadeController({
    channels,
    now: () => 0,
    scheduleFrame: frames.schedule,
    cancelFrame: frames.cancel,
  });

  await controller.play();
  channels[0].currentTime = 15;
  channels[0].emit("timeupdate");
  await flushPlayback();
  controller.pause();

  channels[0].playWaits.push(new Promise((resolve) => {
    releaseActive = resolve;
  }));
  const firstResume = controller.play();
  const secondResume = controller.play();
  await flushPlayback();
  releaseActive();

  assert.deepEqual(await Promise.all([firstResume, secondResume]), [true, true]);
  assert.equal(controller.getState(), "playing");
  assert.ok(channels.every((channel) => !channel.paused));
  assert.equal(frames.size(), 1);

  frames.runNext(5_000);
  assert.equal(channels[0].paused, true);
  assert.equal(channels[1].paused, false);
  assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
  assert.equal(frames.size(), 0);
});
