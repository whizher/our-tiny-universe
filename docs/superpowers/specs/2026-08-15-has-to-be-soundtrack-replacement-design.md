# Has to Be Soundtrack Replacement Design

## Goal

Replace the current local **“Lunar Drive — Mondo Loops”** soundtrack in Our Tiny Universe with the user-supplied **“Has to Be — Capzlock”** audio while preserving the existing privacy, accessibility, deterministic build boundary, manual playback model, pause/resume behavior, and five-second equal-power loop crossfade.

The user states that they have permission or a license to publicly publish this exact supplied version on the public GitHub Pages site. Evidence of permission remains private and is not committed to the repository.

## Approved Experience

- Visible credit is kept simple: **“Has to Be — Capzlock.”**
- Initial hint becomes: **“Tap 🎵 to start Has to Be.”**
- Playback still begins only after a direct visitor action.
- Default soundtrack volume is **50%**.
- The existing compact fixed control, pause/resume states, retry behavior, and accessible live status remain unchanged apart from title/artist text.
- Playback loops continuously through the existing two-channel, five-second equal-power crossfade.
- No autoplay, playlist, seeking, volume slider, storage, analytics, third-party embed, or external runtime request is introduced.

## Source Audio Inspection

The supplied file is an Ogg/Opus container with:

- one stereo Opus audio stream;
- 48 kHz sample rate;
- duration approximately 252.96 seconds (4:12.96);
- one embedded JPEG artwork stream;
- source metadata that must not be published as-is.

The original uploaded container is approximately 4.22 MiB, which is already above the repository's current 4 MiB soundtrack ceiling.

## Public Audio Asset Preparation

Create a new public asset at:

`assets/has-to-be.opus`

Prepare it by remuxing **only the original Opus audio stream without re-encoding**. Remove embedded artwork and source metadata. Add only clean tags:

- Title: `Has to Be`
- Artist: `Capzlock`

A local exploratory remux showed the sanitized audio-only container at about 4.15 MiB. Ogg container bytes can vary between remux operations, so the implementation must generate the final asset once, review that exact committed file, then pin the SHA-256 of those committed bytes in the validator. The spec does not predeclare a temporary exploratory hash.

The final public file must:

- contain exactly one Opus audio stream and no image/video stream;
- remain below **5 MiB**;
- contain no external URL, description blob, or embedded artwork metadata;
- preserve the supplied audio through stream-copy rather than lossy re-encoding;
- be pinned by SHA-256 in repository validation.

The old `assets/lunar-drive.opus` file is removed as part of the replacement rather than retained as an unused production asset.

## Runtime Architecture

### Markup and credit

Update both hidden soundtrack `<audio>` elements in `index.html` from `assets/lunar-drive.opus` to `assets/has-to-be.opus`.

Update the initial soundtrack hint and any runtime credit/status strings from Lunar Drive / Mondo Loops to Has to Be / Capzlock.

No layout, control placement, accessibility structure, or unrelated UI behavior changes are included.

### Playback controller

Keep the existing `src/audio.mjs` controller architecture unchanged unless a test exposes a replacement-specific defect.

The current controller already uses a default target volume of `0.5`, so the implementation should preserve that behavior and strengthen verification around the 50% default rather than introduce a redundant logic change.

Preserve:

- exactly two media channels;
- five-second equal-power overlap;
- pause/resume during normal playback and during a crossfade;
- standby authorization and failure handling;
- `ended` fallback behavior;
- destroy-time listener/timer/media cleanup.

## Build and Validation Policy

Update repository build and validation rules so production recognizes the new soundtrack and rejects stale or arbitrary audio assets.

Required policy changes:

- replace `assets/lunar-drive.opus` allowlist/reference entries with `assets/has-to-be.opus`;
- raise only the approved soundtrack size ceiling from **4 MiB to 5 MiB**;
- pin the final committed `assets/has-to-be.opus` SHA-256;
- preserve the rule that arbitrary additional `.opus` files are rejected;
- keep the production artifact inventory exact and deterministic;
- continue copying the soundtrack byte-for-byte into `_site/assets/has-to-be.opus`;
- continue rejecting private chats, photos, exports, unrelated media, analytics, external scripts, and other unapproved runtime resources.

The old soundtrack path must not remain referenced by production markup, build scripts, validation allowlists, or active tests after the replacement.

## Documentation

Update the active README soundtrack credit to **“Has to Be — Capzlock.”**

Do not rewrite historical Lunar Drive design or implementation-plan documents. They remain repository history. This replacement spec and its implementation plan become the current source of truth for the active soundtrack.

Do not commit permission correspondence or private evidence.

## Testing and Verification

Use focused tests before implementation changes, then run the full suite.

Add or update coverage for:

- both production `<audio>` elements referencing only `assets/has-to-be.opus`;
- the initial hint and visible/runtime credit using Has to Be / Capzlock;
- default target volume remaining exactly 50%;
- equal-power crossfade behavior still scaling to the 0.5 target;
- soundtrack play, pause, resume, retry, and cleanup behavior remaining intact;
- build/validator acceptance of only `assets/has-to-be.opus`;
- rejection of the old Lunar Drive path and arbitrary additional Opus files where appropriate;
- the new 5 MiB ceiling while preserving rejection above that bound;
- exact SHA-256 validation of the committed sanitized file;
- no embedded JPEG/video stream or unwanted source metadata in the committed asset;
- production build copying the soundtrack byte-for-byte;
- exact production artifact inventory;
- full regression coverage for privacy, sharing, transmissions, shooting stars, reduced-motion behavior, and existing site functionality.

Before opening a pull request, run the full automated suite, repository validator, deterministic build, artifact inventory, hash check, diff review, and local HTTP smoke checks.

## Deployment and Merge Gate

Implementation occurs on the focused branch `feature/replace-soundtrack-has-to-be` and should be proposed through a separate pull request.

After automated verification passes, review the final diff for accidental runtime, privacy, or scope expansion. Post-merge GitHub Pages verification should confirm:

- the new asset is served successfully;
- the player displays the new credit;
- playback starts at the expected 50% target volume;
- pause/resume works;
- the loop transition remains smooth;
- no stale Lunar Drive production reference remains.

Do **not** merge the implementation pull request without explicit user approval.

## Out of Scope

- changing the visual design of the soundtrack control;
- adding playlists, track selection, shuffle, seek controls, or a volume slider;
- autoplay;
- persisting playback state or volume;
- adding third-party streaming/embed dependencies;
- changing transmissions, shooting stars, sharing, timeline, relationship copy, or other unrelated site behavior;
- rewriting historical design/plan documents for the previous soundtrack.
