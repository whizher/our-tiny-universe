# Compact Soundtrack Control Design

## Goal

Make the fixed soundtrack control substantially smaller on mobile while
keeping its current hint and accessible playback states, and raise the
soundtrack's default target volume from 30% to 50%.

This is a focused maintenance change that will be completed and deployed
before the separate visitor-analytics enhancement resumes.

## Approved Direction

Use the selected circular-control concept:

- replace the wide text pill with one 48 × 48 CSS-pixel circular button;
- keep the soundtrack status in a small independent bubble directly above the
  button;
- change the visible icon with playback state;
- keep a complete programmatic label on the icon-only button;
- retain the existing bottom-right safe-area positioning and visible focus
  treatment;
- set the controller's default target volume to `0.5`.

The 48 × 48 control is visually much smaller than the current full-width pill
while retaining a comfortable mobile touch target.

## Playback-State Presentation

The controller state remains the single source of truth. `script.js` maps each
state to the following exact view:

| Controller state | Visible icon | `aria-label` | `aria-pressed` | Status bubble |
| --- | --- | --- | --- | --- |
| `idle` | `🎵` | `Play soundtrack` | `false` | `Tap 🎵 to start Lunar Drive.` |
| `starting` | `⏸` | `Pause soundtrack` | `true` | `Tap 🎵 to start Lunar Drive.` |
| `playing` | `⏸` | `Pause soundtrack` | `true` | `Lunar Drive — Mondo Loops` |
| `resuming` | `⏸` | `Pause soundtrack` | `true` | `Lunar Drive — Mondo Loops` |
| `paused` | `▶` | `Resume soundtrack` | `false` | `Lunar Drive — Mondo Loops · Paused` |
| `error` | `↻` | `Retry soundtrack` | `false` | `Lunar Drive couldn’t start. Tap to try again.` |

The button keeps `aria-pressed` because it still represents the soundtrack's
on/off playback state. The visible icon is decorative shorthand; the dynamic
`aria-label` provides the full action name for assistive technology. Focus
remains on the same button through play, pause, resume, and retry transitions.

## Layout and Styling

The existing `.music-player` remains fixed at the lower-right safe-area inset,
but becomes a transparent, content-sized grid aligned to the end. The outer
panel's width, padding, background, border, shadow, and blur move to
`.music-player__status`, producing a compact hint bubble without changing its
text semantics.

The status bubble must:

- fit its content but stay within the viewport;
- use a maximum width of `16rem` and never exceed
  `calc(100vw - 1.5rem)`;
- use the existing dark translucent background, lavender border, muted text,
  rounded corners, and backdrop blur;
- remain immediately above the button with a small gap;
- wrap cleanly on narrow screens.

The button must use:

- `width`, `height`, `min-width`, and `min-height` of `3rem`;
- zero padding and a fully circular border radius;
- centered icon text with a compact line height;
- the existing violet background, hover treatment, border, and focus outline.

No new animation is needed. Existing reduced-motion behavior remains
unchanged.

## Volume Behavior

Change `DEFAULT_TARGET_VOLUME` in `src/audio.mjs` from `0.3` to `0.5`.
Every default playback assignment and equal-power crossfade then derives from
the same 50% target. Explicit test-only `targetVolume` overrides remain
supported and unchanged.

This change does not:

- enable autoplay;
- alter the 5-second crossfade duration;
- change pause, resume, retry, end-of-track, or teardown behavior;
- modify the Opus soundtrack asset;
- control the visitor's device or operating-system volume.

Playback still begins only after the visitor presses the button.

## Files and Responsibilities

- `index.html` — use the initial `🎵` icon and accessible `Play soundtrack`
  label without changing the two audio channels or visible status hint.
- `styles.css` — implement the transparent fixed container, compact status
  bubble, and 48 × 48 circular button.
- `script.js` — map controller states to visible icons, dynamic accessible
  labels, pressed state, and existing status copy.
- `src/audio.mjs` — raise only the default target volume to `0.5`.
- `tests/controller.test.mjs` — verify every icon, accessible label, pressed
  state, and status mapping.
- `tests/audio.test.mjs` — verify the 50% default through initial playback,
  completed crossfades, resumed playback, and existing lifecycle paths.
- `tests/build.test.mjs` — verify the initial icon-only accessible markup and
  compact-control CSS contract.

No new production file, dependency, remote resource, or build artifact is
introduced. The deployed artifact inventory remains exactly ten files.

## Error Handling and Compatibility

The existing audio controller continues to own all playback failures. The UI
shows `↻`, exposes `Retry soundtrack`, and retains the current concise error
status when playback fails. A retry uses the same button and controller method;
no additional state or listener is introduced.

The layout must work with safe-area insets and avoid horizontal overflow down
to a 320 CSS-pixel viewport. The button remains keyboard operable and keeps the
existing high-contrast `:focus-visible` outline.

## Testing and Verification

Implementation follows red-green TDD:

1. Add focused tests for the 50% default and icon-only state mapping and watch
   them fail against the current 30% pill implementation.
2. Make the smallest production changes that pass those tests.
3. Update existing assertions that intentionally encode the old 30% default,
   while preserving tests for explicit custom target volumes.
4. Run the focused audio, controller, and build tests.
5. Run the complete test suite, runtime validator, fresh production build,
   exact ten-file artifact inventory, source/build comparisons, and local HTTP
   smoke check.
6. Verify on a narrow mobile viewport that the hint remains readable, all four
   icons are understandable, focus is visible, playback begins near 50%, and
   the soundtrack still crossfades, pauses, resumes, retries, and loops.

No real private chat, photograph, invitation, analytics identifier, or
additional media may enter test fixtures, commits, reports, or deployment.

## Deployment

Develop this change on `feature/compact-soundtrack-control`, based on the
currently deployed `origin/main`. Open a focused pull request, merge only after
all checks pass, wait for the GitHub Pages deployment, and verify the circular
control and 50% default on the live site.

The visitor-analytics branch remains untouched during this maintenance change
and can be rebased onto the resulting `main` afterward.

## Success Criteria

- The wide soundtrack pill is replaced by a 48 × 48 circular control.
- The visible icon accurately reflects play, pause, resume, and retry actions.
- The button always has a complete accessible action label.
- The status hint remains visible in a compact bubble.
- Default playback and both crossfade channels target 50% volume.
- Playback remains opt-in and all existing music lifecycle behavior remains
  intact.
- The full test, validation, build, review, and live-deployment gates pass.
