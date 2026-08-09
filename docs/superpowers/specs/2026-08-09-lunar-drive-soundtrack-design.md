# Lunar Drive Soundtrack Design

## Goal

Add the user-approved **“Lunar Drive” by Mondo Loops** as optional background music for Our Tiny Universe without weakening the site’s privacy, dependency-free runtime, accessibility, or deterministic deployment boundary.

The user states that Mondo Loops explicitly permitted downloading the track and using it on this public GitHub site. Evidence of that permission remains private and is not committed to the repository. Copyright remains with Mondo Loops.

## Approved Experience

- Playback starts only after a visitor presses a visible Play button.
- A small initial hint says: **“Tap 🎵 to start Lunar Drive.”**
- The control remains available while scrolling so visitors can pause or resume at any time.
- Playback starts at 30% volume.
- The 3-minute-9-second track loops continuously.
- Each loop uses a five-second equal-power crossfade: the ending fades out while a second playback channel starts the beginning and fades in.
- The interface visibly credits **“Lunar Drive — Mondo Loops.”**
- No autoplay, cookies, persistent storage, analytics, external embed, or third-party runtime request is introduced.

## Audio Asset Preparation

The supplied file is an Ogg container with a stereo Opus audio stream at 48 kHz. It also contains embedded Lofi Girl artwork and a long YouTube-derived metadata description with several external URLs.

Create `assets/lunar-drive.opus` by remuxing only the original Opus audio stream without re-encoding. This preserves the audio exactly while removing the embedded image and excessive source metadata. Add only clean title and artist tags:

- Title: `Lunar Drive`
- Artist: `Mondo Loops`

The resulting public file must:

- remain below 4 MiB;
- contain exactly the approved audio content;
- have no embedded image or external URL metadata;
- be pinned by SHA-256 in the repository validator so an accidental replacement cannot silently pass review.

## Architecture

### Markup and control

`index.html` will contain two non-visual `<audio>` elements that reference the same local `assets/lunar-drive.opus` file with `preload="metadata"`. Two channels are required for a real overlap at the loop boundary. The browser may reuse its cache for their identical source.

A compact fixed music control will sit at the lower-right edge of the viewport and respect mobile safe-area insets. It contains:

- a keyboard-accessible toggle button;
- the initial hint;
- a concise live status/credit line.

The button states are:

- `🎵 Play soundtrack` before playback;
- `⏸ Pause soundtrack` while playing;
- `▶ Resume soundtrack` while paused;
- `🎵 Try soundtrack again` after a playback failure.

The button uses `aria-pressed` and the status text uses a polite live region. The hint remains visible until the first successful play, then the credit/status replaces it.

### Playback controller

Add a focused `src/audio.mjs` module that owns only soundtrack state. `script.js` locates the two media elements and control markup, creates the controller, and reflects controller state in the UI.

The controller receives its media elements and timing functions as dependencies so it can be tested without a real browser. It exposes play, pause, and destroy behavior plus state notifications.

Normal playback flow:

1. A direct button press calls `play()` on channel A at 30% volume.
2. The controller observes the active channel’s playback position.
3. When five seconds remain, channel B starts at time zero with volume zero.
4. During the overlap, the outgoing volume follows `cos(progress × π/2)` and the incoming volume follows `sin(progress × π/2)`, each multiplied by 0.30.
5. At completion, channel A pauses and resets to time zero, channel B becomes active, and the roles swap for the next loop.

If the visitor pauses during a crossfade, both channels pause and the crossfade progress is preserved. Resume continues both playback and the remaining transition. `destroy()` cancels timing work, removes media listeners, pauses both channels, and resets their positions.

### Timing resilience

The active media element’s playback events determine when the overlap begins; JavaScript timing updates the equal-power volume curve. An `ended` fallback starts the standby channel if browser throttling prevents the normal overlap from completing. This fallback prioritizes uninterrupted playback even though a backgrounded/throttled tab may lose the full crossfade.

## Error Handling

- A rejected `play()` promise leaves both channels paused and changes the control to a retry state.
- Missing or invalid markup continues to fail through the site’s existing incomplete-markup guard.
- If metadata is not ready when Play is pressed, the browser loads it through the normal media-element path; the UI remains responsive.
- A late or missed crossfade uses the `ended` fallback rather than leaving the soundtrack silent.
- No raw browser error or track metadata is rendered into the page.

## Accessibility and User Control

- Sound never starts without a direct visitor action.
- The control has visible text and is operable by touch and keyboard.
- Play/pause state is conveyed through text and `aria-pressed`, not color alone.
- Device volume remains the visitor’s master volume control; no additional volume slider is added.
- Motion preferences remain respected by the existing visual effects. Audio behavior is independent of `prefers-reduced-motion`.
- Additional lower-page spacing prevents the fixed control from obscuring content on narrow screens.

## Privacy, Build, and Repository Policy

The music remains a local first-party asset. There is no Spotify, YouTube, SoundCloud, analytics, tracking pixel, or other remote dependency.

Update the deterministic build and validator to:

- allow exactly `assets/lunar-drive.opus` and no arbitrary audio directory;
- enforce the 4 MiB soundtrack limit;
- verify the sanitized file’s pinned SHA-256;
- include the audio path in the deploy-reference allowlist;
- copy the track into `_site/assets/lunar-drive.opus`;
- reject unapproved `.opus` files elsewhere;
- continue rejecting private chats, photos, exports, and other media;
- update the expected production artifact from eight to ten files, including `.nojekyll`, the soundtrack, and its controller module.

The README will credit Mondo Loops and explain that the soundtrack is included with permission. It will not include private permission correspondence.

## Testing

Add automated coverage for:

- initial Play, playing, Pause, and Resume states;
- the five-second equal-power crossfade and channel-role swap;
- pausing and resuming during the overlap;
- the `ended` fallback;
- rejected playback and retry behavior;
- destroy-time listener/timer/media cleanup;
- accessible control text and state changes;
- exact soundtrack path approval and rejection of other audio paths;
- the 4 MiB limit and pinned content hash;
- sanitized audio metadata expectations where they can be checked deterministically without external tools;
- the ten-file production build and byte-identical copied audio;
- continued privacy, external-resource, reduced-motion, sharing, and existing feature behavior.

After implementation, run the full test suite, validator, build, artifact inventory, diff check, and local HTTP smoke checks before any pull request or deployment.

## Deployment Gate

Implementation will use a focused feature branch and pull request. Merge and GitHub Pages deployment occur only after all automated verification passes and a final review finds no new privacy or security issue. The live page must then be checked for successful asset delivery, manual playback, visible attribution, pause/resume behavior, and a smooth five-second loop transition.

## Out of Scope

- Autoplay or starting music on unrelated star/button interactions
- Multiple tracks, playlists, shuffle, seeking, or a volume slider
- Persisting playback preference between visits
- Third-party music embeds or external streaming links
- Committing screenshots or private messages that document permission
