# Our Tiny Universe v1.1 Design

Date: 2026-08-08

## Goal

Evolve the existing deployed page into a slightly richer, more personal experience
without changing its intentionally tiny architecture or weakening its privacy
boundary. The release theme is **more personality, same privacy**.

The site remains a dependency-free static GitHub Pages project built from plain
HTML, CSS, and JavaScript modules. It must not become a framework application or
introduce a backend.

## Public-content boundary

The only existing personal facts that remain public are the approved names Naufal
and Rity and the relationship start date, 7 July 2024.

The v1.1 content may express broad fictional personality cues: Naufal's star can
feel dramatic, chaotic, teasing, and caring underneath; Rity's star can feel
blunt, playful, roast-heavy, and caring underneath. Every displayed line must be
newly authored fictional copy. No private message, close paraphrase of a private
message, private photo, phone number, location, health detail, argument, deleted
message, intimate detail, or private plan may be added to the repository or site.

No year or date is assigned to the pre-relationship history. The public timeline
uses intentionally abstract wording:

1. **Long before the orbit** — *The lore had already started.*
2. **7 Juli 2024** — *Officially one orbit.*
3. **Today** — *Same chaos, more teamwork.*

## Architecture

Retain the current separation of concerns and extend existing modules rather than
rebuilding the project.

### `src/content.mjs`

Own all fictional interactive copy and random selection logic.

- Replace the single shared message collection with two immutable message pools,
  one for `naufal` and one for `rity`.
- Each pool contains at least eight short lines to avoid the current repetitive
  feel.
- Selection tracks the last index independently for each star so the same star
  cannot immediately repeat its previous line.
- Add an immutable collection of at least four fictional anti-cringe responses
  and selection logic that avoids immediate repetition.
- Random helpers remain injectable and deterministic for tests.
- No private source material is imported, embedded, referenced, or needed at
  runtime or test time.

### `src/time.mjs`

Continue to own calendar calculations in `Asia/Pontianak`.

- Preserve the existing day-together counter behavior.
- Add a pure anniversary-state calculation that returns whether the current
  Pontianak calendar date is 7 July and the calendar-day distance to the next
  7 July.
- On 7 July, the distance is `0` and anniversary mode is active.
- On 8 July, the next anniversary is 7 July of the following year.
- Calculations must remain calendar-based so leap years do not introduce
  off-by-one errors.
- No browser locale or the visitor's local time zone may change these results.

### `script.js`

Remain the DOM/controller layer.

- Each star is given an explicit stable source identifier (`naufal` or `rity`).
- Tapping a star selects from that star's own pool and changes the message-card
  heading to identify the source, for example `Transmission from Naufal ✨`.
- The message remains inside the existing polite live region.
- Anti-cringe interaction rotates responses and preserves the existing shooting
  star effect.
- Render anniversary state on load and when the Pontianak midnight timer fires.
- Add or remove an anniversary state hook on the page so CSS can alter only the
  visual treatment; the content remains usable without animation.
- Wire the share control through a small injectable sharing helper so behavior is
  testable without invoking real browser share dialogs.
- Preserve the existing `destroy()` cleanup contract for listeners and timers.

### `index.html`

Keep the existing page structure recognizable and add only small extensions.

- Replace the three current timeline entries with the approved timeline copy.
- Add a compact anniversary status near the existing day counter.
- Give each interactive star its stable source identifier.
- Add a `Share Our Universe` button near the bottom of the page.
- Add a hidden or normally unobtrusive fallback link that can be revealed if
  programmatic sharing and copying both fail.
- Add local favicon and social-preview metadata.
- Add canonical and Open Graph metadata using the production GitHub Pages URL.
- Social metadata stays deliberately generic and does not add new personal facts:
  - title: `Our Tiny Universe 🌌`
  - description: `Same chaos, more teamwork.`
  - type: `website`
  - URL: `https://whizher.github.io/our-tiny-universe/`
  - preview image:
    `https://whizher.github.io/our-tiny-universe/assets/social-preview.png`
- Set `twitter:card` to `summary_large_image` and reuse the same generic title,
  description, and preview image.
- Update the ordinary page description to `A tiny playful universe. Same chaos,
  more teamwork.` while leaving the visible approved names and date unchanged.

### `styles.css`

Preserve the current dark-space visual language and responsive structure.

- Naufal remains represented primarily by gold; Rity remains represented by
  lavender.
- Message changes receive a 180 ms opacity/scale reveal treatment that does not
  move surrounding layout.
- Anniversary mode increases the gold/pink center glow and runs the one approved
  initialization flourish; it must not restructure the page.
- The share control follows the existing pill-button treatment and keeps a
  minimum 44 px touch target.
- All new transitions and anniversary effects must respect
  `prefers-reduced-motion: reduce`.
- Existing visible focus styling and narrow-screen support remain intact.

## Social preview assets

Add exactly two intentionally public assets:

- `assets/social-preview.png`: 1200 × 630 px, optimized for link previews. It
  depicts two stylized gold/lavender stars orbiting a small heart/glow against the
  existing deep-space palette. It contains no photograph, human likeness, private
  information, or additional personal fact.
- `assets/favicon.svg`: a simple two-star/orbit mark using the same colors.

The social preview shows the generic title `Our Tiny Universe`. It contains no
names or dates because those already appear on the destination page.

## Share behavior

Sharing must require an explicit button press and never happen automatically.

1. If the Web Share API is available, request the native share sheet with the
   public title, generic description, and canonical page URL.
2. If Web Share is unavailable, try to copy the canonical URL through the
   Clipboard API and announce `Link copied ✨` in a polite status region.
3. If native sharing exists but fails for any reason other than user cancellation,
   continue to the Clipboard API fallback.
4. If copying is unavailable or rejected, reveal the normal canonical link and a
   short instruction to copy it manually.
5. A user-cancelled native share (`AbortError`) is silent and is not treated as a
   failure.
6. No share attempt writes storage, sends analytics, or records completion.

## Anniversary behavior

On ordinary days, the anniversary status displays the number of calendar days
until the next 7 July in concise Indonesian copy.

On 7 July in Pontianak:

- the status becomes `Orbit anniversary unlocked ✨`;
- the page exposes its anniversary visual state;
- the center glow becomes warmer and slightly stronger;
- one 18-particle shooting-star flourish runs after initialization for users who
  have not requested reduced motion; it is skipped when reduced motion is active.

The mode is derived entirely from the current date and therefore requires no
stored state.

## Privacy enforcement

Privacy is an explicit build property, not only a content convention.

### Repository guard

Extend validation to inspect the tracked-file list in addition to public runtime
files.

- Reject `.txt`, `.log`, `.csv`, `.tsv`, `.zip`, `.7z`, `.rar`, `.tar`, `.gz`,
  `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.jpg`, `.jpeg`,
  `.webp`, `.gif`, `.heic`, `.mp3`, `.m4a`, `.wav`, `.ogg`, `.mp4`, `.mov`,
  `.mkv`, and `.webm` tracked files. Reject `.json` except the exact existing
  `package.json` path.
- Permit binary/image files only through exact approved paths; for v1.1 the only
  new binary public asset is `assets/social-preview.png`.
- Permit the favicon only at the exact approved SVG path.
- Allow only `.github/workflows/pages.yml`, `.gitignore`, `README.md`,
  `package.json`, `index.html`, `styles.css`, `script.js`,
  `scripts/build-site.mjs`, `scripts/validate.mjs`, `src/content.mjs`,
  `src/time.mjs`, `tests/build.test.mjs`, `tests/content.test.mjs`,
  `tests/controller.test.mjs`, `tests/time.test.mjs`, the two exact approved
  asset paths, and dated Markdown documents under `docs/superpowers/specs/` or
  `docs/superpowers/plans/`. Reject every other tracked path by default.
- Keep documentation confined to the existing README plus dated Markdown files
  under `docs/superpowers/specs/` and `docs/superpowers/plans/`.
- Limit every tracked file other than the approved preview image to 256 KiB. Limit
  `assets/social-preview.png` to 1 MiB. Oversized files fail validation before
  deployment.
- Continue scanning public runtime source for forbidden private/tracking tokens.

The repository guard is designed to prevent accidental inclusion. It does not
replace deliberate human review of public content.

### Public artifact guard

Keep the current exact `_site` allowlist and extend it only for:

- `assets/social-preview.png`
- `assets/favicon.svg`

No tests, documentation, source-only validation files, or unrelated repository
files may enter `_site`.

### Runtime network boundary

The page continues to make no runtime request to analytics, APIs, CDNs, fonts, or
third-party media. Validation permits only the exact canonical/metadata URLs
needed for link previews while continuing to reject external executable,
stylesheet, font, or runtime-media dependencies.

## Error handling and graceful degradation

- Missing required markup continues to fail fast during initialization.
- A broken or missing local asset fails validation/build rather than deploying a
  partially referenced page.
- Sharing errors never break the rest of the experience; they fall back to the
  canonical link.
- JavaScript-disabled visitors still see the title, relationship start date,
  timeline, and static page design; only counters and interactions are unavailable.
- Reduced-motion users receive the same information without motion-heavy effects.

## Testing strategy

Keep Node's built-in test runner and add no package dependencies.

### Content tests

- both named pools exist and contain the required amount of fictional copy;
- selection uses the requested pool;
- immediate repetition is prevented independently per source;
- anti-cringe selection is deterministic with injected randomness and avoids an
  immediate repeat.

### Time tests

- all existing Pontianak day-counter cases remain green;
- 6 July reports one day until the anniversary;
- 7 July activates anniversary mode and reports zero days;
- 8 July targets the following year's anniversary;
- leap-year boundaries produce correct calendar-day distances;
- invalid dates remain rejected.

### Controller/share tests

- each star updates the correct attribution and uses its own pool;
- anniversary status and state are rendered from injected time;
- anti-cringe behavior still cleans up its effect;
- native share is preferred when available;
- Web Share cancellation is silent;
- clipboard fallback reports success;
- clipboard failure reveals the manual link;
- `destroy()` still removes listeners and cancels timers.

### Build/privacy tests

- the production artifact contains exactly the approved runtime files and two
  assets;
- unexpected media, chat-export, archive, and oversized fixture paths are rejected
  by the repository policy;
- an unexpected public runtime reference still fails validation;
- social metadata points only to the canonical site and approved preview asset.

All 14 existing tests must continue to pass; new behavior adds coverage rather
than replacing the existing checks.

## Deployment

Keep the existing GitHub Pages workflow and Node 22 environment. The workflow
continues to run tests, validation, the privacy-bounded build, and deployment in
that order. No dependency-install step is introduced.

After deployment, manually verify the public page on a narrow mobile viewport and
a desktop viewport, confirm both stars and anti-cringe behavior, exercise the
native/fallback share path where available, and confirm the public artifact does
not expose unapproved files.

## Non-goals

v1.1 intentionally does not add:

- a JavaScript framework;
- a backend, database, account, form, or user-generated content;
- analytics, cookies, visitor tracking, or telemetry;
- local/session storage or other persistent client state;
- private conversations, photographs, or media galleries;
- autoplay or background audio;
- a PWA/service worker or offline cache;
- a custom domain;
- unrelated refactoring.

## Acceptance criteria

The release is ready when all of the following are true:

1. Existing visual identity and static architecture are preserved.
2. Naufal and Rity have distinct fictional star-message pools with independent
   no-repeat behavior.
3. The approved three-entry timeline is visible and contains no pre-relationship
   date.
4. Anniversary calculations are Pontianak-correct and anniversary mode is
   accessible with and without motion.
5. Anti-cringe responses have variety while keeping the existing effect.
6. Native sharing degrades safely to copying or a manual link.
7. Social preview and favicon assets contain no private content.
8. No new runtime dependency or external network dependency is introduced.
9. Repository and build guards reject unapproved private-file classes and keep the
   deploy artifact explicitly bounded.
10. All existing and new tests, validation, and the production build pass before
    deployment.
