const DEFAULT_CROSSFADE_MS = 5_000;
const DEFAULT_TARGET_VOLUME = 0.5;

export function equalPowerVolumes(progress, targetVolume = DEFAULT_TARGET_VOLUME) {
  const bounded = Math.min(1, Math.max(0, Number(progress)));
  if (bounded === 0) {
    return { outgoing: targetVolume, incoming: 0 };
  }
  if (bounded === 1) {
    return { outgoing: 0, incoming: targetVolume };
  }
  return {
    outgoing: Math.cos(bounded * Math.PI / 2) * targetVolume,
    incoming: Math.sin(bounded * Math.PI / 2) * targetVolume,
  };
}

export function createCrossfadeController({
  channels,
  crossfadeMs = DEFAULT_CROSSFADE_MS,
  targetVolume = DEFAULT_TARGET_VOLUME,
  now = () => performance.now(),
  scheduleFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
  onStateChange = () => {},
}) {
  if (!Array.isArray(channels) || channels.length !== 2) {
    throw new TypeError("Crossfade controller requires exactly two audio channels");
  }
  if (!(crossfadeMs > 0) || !(targetVolume > 0 && targetVolume <= 1)) {
    throw new RangeError("Invalid soundtrack timing or volume");
  }

  let state = "idle";
  let activeIndex = 0;
  let frameId = null;
  let fade = null;
  let startingFade = false;
  let destroyed = false;
  let endedWhileStartingFade = false;
  let fadeResumeOperation = null;
  let playRequestPromise = null;
  let sessionId = 0;
  let standbyAuthorized = false;
  let standbyOperationId = 0;

  function setState(nextState) {
    if (state === nextState) return;
    state = nextState;
    onStateChange(state);
  }

  function pauseChannel(index) {
    channels[index].pause();
  }

  function resetChannels() {
    for (const [index, channel] of channels.entries()) {
      pauseChannel(index);
      channel.currentTime = 0;
      channel.volume = 0;
    }
  }

  function cancelScheduledFrame() {
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
  }

  function failPlayback() {
    if (destroyed) return false;
    sessionId += 1;
    standbyOperationId += 1;
    fadeResumeOperation = null;
    playRequestPromise = null;
    standbyAuthorized = false;
    cancelScheduledFrame();
    fade = null;
    startingFade = false;
    endedWhileStartingFade = false;
    resetChannels();
    setState("error");
    return false;
  }

  function fadeIncludes(index) {
    return Boolean(
      fade && (index === fade.outgoingIndex || index === fade.incomingIndex),
    );
  }

  function channelShouldBePlaying(index) {
    if (state === "starting") return true;
    if (state === "resuming" && !standbyAuthorized) return true;
    if (state !== "playing" && state !== "resuming") return false;
    if (fadeIncludes(index)) return true;
    if (startingFade) return true;
    return index === activeIndex;
  }

  function retireStalePlayback(index, { resetWhenUnused = true } = {}) {
    if (channelShouldBePlaying(index)) return;
    const channel = channels[index];
    pauseChannel(index);
    if (resetWhenUnused && !fadeIncludes(index)) {
      channel.currentTime = 0;
      channel.volume = 0;
    }
  }

  function retireStandby(index) {
    retireStalePlayback(index);
  }

  function ownsStandbyOperation(operationId, operationSession, outgoingIndex) {
    return (
      !destroyed &&
      operationId === standbyOperationId &&
      operationSession === sessionId &&
      state === "playing" &&
      activeIndex === outgoingIndex
    );
  }

  function completeFade() {
    cancelScheduledFrame();

    const { outgoingIndex, incomingIndex } = fade;
    const outgoing = channels[outgoingIndex];
    const incoming = channels[incomingIndex];
    pauseChannel(outgoingIndex);
    outgoing.currentTime = 0;
    outgoing.volume = 0;
    incoming.volume = targetVolume;
    if (state !== "playing") pauseChannel(incomingIndex);
    activeIndex = incomingIndex;
    fade = null;
    startingFade = false;
    endedWhileStartingFade = false;
  }

  function advanceFade(timestamp) {
    if (!fade || state !== "playing") return;

    const previousTimestamp = fade.lastTimestamp ?? timestamp;
    fade.elapsedMs += Math.max(0, timestamp - previousTimestamp);
    fade.lastTimestamp = timestamp;
    const progress = Math.min(1, fade.elapsedMs / crossfadeMs);
    const volumes = equalPowerVolumes(progress, targetVolume);
    channels[fade.outgoingIndex].volume = volumes.outgoing;
    channels[fade.incomingIndex].volume = volumes.incoming;

    if (progress === 1) {
      completeFade();
      return;
    }
    frameId = scheduleFrame(advanceFade);
  }

  async function beginCrossfade() {
    if (destroyed || state !== "playing" || fade || startingFade) return;
    const operationId = standbyOperationId + 1;
    standbyOperationId = operationId;
    const operationSession = sessionId;
    startingFade = true;
    const outgoingIndex = activeIndex;
    const incomingIndex = 1 - outgoingIndex;
    const incoming = channels[incomingIndex];
    pauseChannel(incomingIndex);
    incoming.currentTime = 0;
    incoming.volume = 0;

    try {
      await incoming.play();
    } catch {
      if (!ownsStandbyOperation(
        operationId,
        operationSession,
        outgoingIndex,
      )) {
        retireStandby(incomingIndex);
        return;
      }
      startingFade = false;
      if (!destroyed) failPlayback();
      return;
    }

    if (!ownsStandbyOperation(
      operationId,
      operationSession,
      outgoingIndex,
    )) {
      retireStandby(incomingIndex);
      return;
    }

    fade = {
      outgoingIndex,
      incomingIndex,
      elapsedMs: 0,
      lastTimestamp: state === "playing" ? now() : null,
    };
    startingFade = false;

    if (endedWhileStartingFade) {
      completeFade();
      return;
    }

    if (state === "playing") {
      frameId = scheduleFrame(advanceFade);
      return;
    }

    for (const index of channels.keys()) pauseChannel(index);
  }

  function handleTimeUpdate(index) {
    const channel = channels[index];
    const secondsRemaining = channel.duration - channel.currentTime;
    if (
      index === activeIndex &&
      state === "playing" &&
      !fade &&
      !startingFade &&
      Number.isFinite(secondsRemaining) &&
      secondsRemaining <= crossfadeMs / 1_000
    ) {
      void beginCrossfade();
    }
  }

  async function promoteStandbyAfterEnd(outgoingIndex) {
    if (destroyed || state !== "playing" || startingFade || fade) return;
    const operationId = standbyOperationId + 1;
    standbyOperationId = operationId;
    const operationSession = sessionId;
    startingFade = true;
    endedWhileStartingFade = false;
    const incomingIndex = 1 - outgoingIndex;
    const incoming = channels[incomingIndex];
    pauseChannel(incomingIndex);
    incoming.currentTime = 0;
    incoming.volume = 0;

    try {
      await incoming.play();
    } catch {
      if (!ownsStandbyOperation(
        operationId,
        operationSession,
        outgoingIndex,
      )) {
        retireStandby(incomingIndex);
        return;
      }
      startingFade = false;
      if (!destroyed) failPlayback();
      return;
    }

    if (!ownsStandbyOperation(
      operationId,
      operationSession,
      outgoingIndex,
    )) {
      retireStandby(incomingIndex);
      return;
    }

    const outgoing = channels[outgoingIndex];
    pauseChannel(outgoingIndex);
    outgoing.currentTime = 0;
    outgoing.volume = 0;
    incoming.volume = targetVolume;
    activeIndex = incomingIndex;
    startingFade = false;
    endedWhileStartingFade = false;
    if (state !== "playing") pauseChannel(incomingIndex);
  }

  function handleEnded(index) {
    if (destroyed || state !== "playing" || index !== activeIndex) return;

    if (fade && index === fade.outgoingIndex) {
      completeFade();
      return;
    }

    if (startingFade) {
      endedWhileStartingFade = true;
      return;
    }

    void promoteStandbyAfterEnd(index);
  }

  function handleMediaPause(index) {
    if (
      destroyed ||
      !["playing", "resuming", "starting"].includes(state) ||
      !channels[index].paused ||
      channels[index].ended
    ) return;
    const isAudibleRole = fade
      ? index === fade.outgoingIndex || index === fade.incomingIndex
      : index === activeIndex;
    if (isAudibleRole) pause();
  }

  function handleMediaError() {
    if (destroyed || state === "error") return;
    if (state !== "idle" || playRequestPromise) failPlayback();
  }

  const timeUpdateListeners = channels.map((_, index) => () => {
    handleTimeUpdate(index);
  });
  const endedListeners = channels.map((_, index) => () => {
    handleEnded(index);
  });
  const pauseListeners = channels.map((_, index) => () => {
    handleMediaPause(index);
  });
  const errorListeners = channels.map(() => () => {
    handleMediaError();
  });

  for (const [index, channel] of channels.entries()) {
    channel.addEventListener("timeupdate", timeUpdateListeners[index]);
    channel.addEventListener("ended", endedListeners[index]);
    channel.addEventListener("pause", pauseListeners[index]);
    channel.addEventListener("error", errorListeners[index]);
  }

  function ownsFadeResume(operation) {
    return (
      !destroyed &&
      fadeResumeOperation === operation &&
      sessionId === operation.sessionId &&
      (state === "paused" || state === "playing" || state === "resuming")
    );
  }

  function resumeFade() {
    if (fadeResumeOperation) return fadeResumeOperation.promise;

    const operation = {
      fade,
      promise: null,
      sessionId,
    };
    fadeResumeOperation = operation;

    const observePlayback = (index) => {
      let playback;
      try {
        playback = channels[index].play();
      } catch (error) {
        return Promise.reject(error);
      }
      return Promise.resolve(playback).then(() => {
        if (ownsFadeResume(operation)) {
          if (channels[index].volume > 0) setState("playing");
        } else {
          retireStalePlayback(index, { resetWhenUnused: false });
        }
      });
    };

    operation.promise = (async () => {
      try {
        const playbacks = [
          observePlayback(operation.fade.outgoingIndex),
          observePlayback(operation.fade.incomingIndex),
        ];
        setState("resuming");
        const results = await Promise.allSettled(playbacks);
        if (destroyed) {
          resetChannels();
          return false;
        }
        if (!ownsFadeResume(operation)) return false;
        if (results.some((result) => result.status === "rejected")) {
          return failPlayback();
        }
        if (fade !== operation.fade) {
          return state === "playing" &&
            activeIndex === operation.fade.incomingIndex;
        }
        operation.fade.lastTimestamp = now();
        setState("playing");
        frameId = scheduleFrame(advanceFade);
        return true;
      } finally {
        if (fadeResumeOperation === operation) {
          fadeResumeOperation = null;
        }
      }
    })();

    return operation.promise;
  }

  async function performPlay() {
    if (destroyed) return false;

    if (state === "playing") return true;

    sessionId += 1;
    standbyOperationId += 1;
    const playSession = sessionId;

    const isFreshStart = state === "idle" || state === "error";
    const shouldAuthorizeStandby = isFreshStart || !standbyAuthorized;
    if (isFreshStart) {
      cancelScheduledFrame();
      fade = null;
      startingFade = false;
      endedWhileStartingFade = false;
      activeIndex = 0;
      resetChannels();
      channels[activeIndex].volume = targetVolume;
    }

    if (state === "paused" && fade) {
      return resumeFade();
    } else {
      try {
        if (shouldAuthorizeStandby) {
          const requestedActiveIndex = activeIndex;
          const standbyIndex = 1 - requestedActiveIndex;
          const activePlayback = channels[requestedActiveIndex].play();
          const standbyPlayback = channels[standbyIndex].play();
          setState(isFreshStart ? "starting" : "resuming");
          const results = await Promise.allSettled([
            Promise.resolve(activePlayback).then(() => {
              if (!destroyed && sessionId === playSession) {
                setState("playing");
              } else {
                retireStalePlayback(requestedActiveIndex);
              }
            }),
            Promise.resolve(standbyPlayback).then(() => {
              if (destroyed || sessionId !== playSession) {
                retireStalePlayback(standbyIndex);
              }
            }),
          ]);
          if (destroyed) {
            resetChannels();
            return false;
          }
          if (sessionId !== playSession) {
            retireStalePlayback(requestedActiveIndex);
            retireStalePlayback(standbyIndex);
            return false;
          }
          if (results.some((result) => result.status === "rejected")) {
            return failPlayback();
          }
          standbyAuthorized = true;
          retireStandby(standbyIndex);
        } else {
          const requestedActiveIndex = activeIndex;
          const activePlayback = channels[requestedActiveIndex].play();
          setState("resuming");
          await activePlayback;
          if (destroyed) {
            resetChannels();
            return false;
          }
          if (sessionId !== playSession) {
            retireStalePlayback(requestedActiveIndex, {
              resetWhenUnused: false,
            });
            return false;
          }
        }
      } catch {
        if (destroyed) {
          resetChannels();
          return false;
        }
        if (sessionId !== playSession) {
          for (const index of channels.keys()) {
            retireStalePlayback(index, { resetWhenUnused: false });
          }
          return false;
        }
        return failPlayback();
      }
    }

    if (destroyed) {
      resetChannels();
      return false;
    }
    if (state === "paused" && fade) return resumeFade();
    setState("playing");
    return true;
  }

  function play() {
    if (destroyed) return Promise.resolve(false);
    if (playRequestPromise) return playRequestPromise;

    const request = performPlay();
    playRequestPromise = request;
    const clearRequest = () => {
      if (playRequestPromise === request) playRequestPromise = null;
    };
    request.then(clearRequest, clearRequest);
    return request;
  }

  function pause() {
    if (
      destroyed ||
      !["playing", "resuming", "starting"].includes(state)
    ) return;
    const returnToIdle = state === "starting";
    sessionId += 1;
    standbyOperationId += 1;
    fadeResumeOperation = null;
    playRequestPromise = null;
    cancelScheduledFrame();
    startingFade = false;
    endedWhileStartingFade = false;
    if (fade && fade.lastTimestamp !== null) {
      const timestamp = now();
      fade.elapsedMs = Math.min(
        crossfadeMs,
        fade.elapsedMs + Math.max(0, timestamp - fade.lastTimestamp),
      );
      const volumes = equalPowerVolumes(
        fade.elapsedMs / crossfadeMs,
        targetVolume,
      );
      channels[fade.outgoingIndex].volume = volumes.outgoing;
      channels[fade.incomingIndex].volume = volumes.incoming;
      fade.lastTimestamp = null;
    }
    if (returnToIdle) {
      resetChannels();
    } else {
      for (const index of channels.keys()) pauseChannel(index);
    }
    setState(returnToIdle ? "idle" : "paused");
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    sessionId += 1;
    standbyOperationId += 1;
    fadeResumeOperation = null;
    playRequestPromise = null;
    cancelScheduledFrame();
    fade = null;
    startingFade = false;
    endedWhileStartingFade = false;
    for (const [index, channel] of channels.entries()) {
      channel.removeEventListener("timeupdate", timeUpdateListeners[index]);
      channel.removeEventListener("ended", endedListeners[index]);
      channel.removeEventListener("pause", pauseListeners[index]);
      channel.removeEventListener("error", errorListeners[index]);
    }
    resetChannels();
    setState("destroyed");
  }

  onStateChange(state);

  return {
    destroy,
    getState: () => state,
    pause,
    play,
  };
}
