# Transmission Deck v2 Design

**Date:** 2026-08-11

**Status:** Approved

**Repository:** `whizher/our-tiny-universe`

**Branch:** `feature/transmission-deck-v2`

## Context

The site currently selects each star's fictional transmission with independent
random draws and prevents only an immediate repeat. The expanded pools contain
24 messages each, but random selection can still surface a small subset several
times before the visitor sees the full pool.

The existing share control always sends a generic site message. It does not use
the public fictional transmission currently shown in the message card.

This release improves repeat-visit variety and makes sharing more meaningful
without adding persistence, tracking, deep links, dependencies, or private
material.

## Goals

- Give Naufal and Rity separate in-memory shuffled decks.
- Show all 24 messages from one source exactly once before reshuffling it.
- Prevent an immediate repeat across reshuffle boundaries.
- Keep each source's deck independent from the other source.
- Let the existing share control share the latest displayed transmission.
- Preserve the generic share behavior before a visitor selects a star.
- Preserve native sharing, clipboard fallback, cancellation, and manual fallback.
- Retain the dependency-free runtime and strict privacy boundary.

## Non-goals

- No joint Naufal-and-Rity transmission pool in this release.
- No exact-message URL, query parameter, hash state, or deep link.
- No local storage, session storage, cookies, database, or cross-visit history.
- No analytics, forms, third-party requests, or visitor identifiers.
- No layout redesign, new panel, transmission archive, or favorites interface.
- No changes to the soundtrack, volume, crossfade, counters, or timeline.
- No private chats, quotations, close paraphrases, photos, media, locations,
  contact details, or permission evidence.

## Considered approaches

### 1. Independent in-memory deck objects — selected

`src/content.mjs` owns a small deck abstraction with deterministic random
injection. `script.js` creates one deck for Naufal and one for Rity during site
initialization. Selection remains independent from DOM rendering and can be
tested without a browser.

This approach gives the behavior a clear interface, keeps controller state
small, and makes complete-cycle guarantees straightforward to verify.

### 2. Controller-managed index queues

`script.js` could directly shuffle and consume two arrays. This would change
fewer exports, but it would mix selection rules with event listeners and DOM
updates. It would also make the controller fixture responsible for testing
algorithmic behavior.

### 3. Persistent cross-visit decks

Browser storage could remember progress across reloads. This was rejected
because the benefit is small for a 48-message page and persistence would weaken
the site's deliberately storage-free privacy model.

## Architecture

### Message deck

`src/content.mjs` will export a message-deck factory that accepts a valid source
and an injectable random function. The factory owns:

- the immutable source pool;
- a mutable queue of remaining message indexes; and
- the previously returned index.

The factory returns a narrow object with a `next()` method. Each call returns the
existing selection shape:

```text
{ source, index, message }
```

When the queue is empty, the deck creates indexes `0` through `23` and shuffles
them with Fisher-Yates using the repository's bounded-random behavior. The deck
then consumes each index exactly once.

When a new cycle begins, if its first index equals the previous cycle's final
index, the deck swaps that first index with another entry. This guarantees no
immediate repeat without reroll loops or biased repeated attempts. The pool size
is greater than one, so a valid swap is always available.

An unknown source fails immediately with the existing range-error semantics.
Reloading or reinitializing the page creates fresh decks.

The existing anti-cringe selector remains independent and keeps its current
no-immediate-repeat behavior.

### Controller integration

`initSite()` will create one deck for each approved source. `revealMessage()`
asks only the clicked source's deck for its next selection, renders it with the
existing animation, and stores that complete selection as the current
transmission.

The current transmission starts as `null`. Anti-cringe actions, soundtrack
actions, counter updates, and sharing do not consume or reorder either deck.

After the first star selection, the existing share button text changes from
`Share Our Universe` to `Share This Transmission`. No additional button or
panel is introduced.

### Sharing

`shareUniverse()` will accept an optional current transmission while retaining
the existing injected native-share and clipboard functions.

Before a transmission exists, behavior remains unchanged:

- title: `Our Tiny Universe 🌌`;
- text: `Same chaos, more teamwork.`; and
- clipboard fallback: the canonical site URL.

After a transmission exists, the native share payload uses:

- title: `Transmission from <Name> ✨`;
- text: the public fictional message in quotation marks, followed by
  `— <Name>` and `Our Tiny Universe`; and
- URL: the unchanged canonical homepage.

The clipboard fallback writes the same formatted quote, attribution, project
name, and canonical URL as plain text. The shared link opens the normal site and
does not force or encode a selected message.

Cancelling the native share remains silent. A non-cancellation native-share
failure still falls back to the clipboard. If both mechanisms fail, the existing
manual canonical link becomes visible; the currently displayed quote remains
visible in the message card for manual copying.

## Data flow

1. `initSite()` creates independent Naufal and Rity decks.
2. A visitor selects one star.
3. That source's deck returns its next unused selection.
4. The controller renders and remembers the selection.
5. The share button changes to `Share This Transmission`.
6. Sharing formats the remembered public transmission and attaches the normal
   homepage URL.
7. Reloading discards both deck queues and the current transmission.

## Accessibility and interface behavior

- The existing button remains a native keyboard-accessible `button`.
- Its visible text communicates whether sharing is generic or transmission-specific.
- Existing `aria-live` share status behavior remains intact.
- The message reveal remains in the existing polite live region.
- No new motion or visual effect is introduced.

## Privacy and security

All state is held only in JavaScript memory for the current page lifetime. The
feature introduces no storage API, network API, third-party asset, identifier,
or external runtime URL.

Only messages already present in the immutable public fictional pools can enter
a share payload. Source attribution is limited to the already approved public
names Naufal and Rity.

The validator must continue rejecting forbidden storage, analytics, external
references, and unapproved tracked content. The approved soundtrack must remain
byte-identical with SHA-256:

`ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765`

## Testing

Implementation will follow a focused red-green-refactor cycle.

### Content behavior

- A deck returns all 24 source indexes exactly once in one cycle.
- A second cycle contains the same complete set.
- The cycle boundary never repeats the previous final index.
- Naufal and Rity decks advance independently.
- Injected deterministic random values produce deterministic order.
- Source pools remain immutable and unchanged.
- Unknown sources continue to throw.
- Anti-cringe selection remains unchanged.

### Controller and sharing behavior

- Each star uses only its attributed deck.
- Repeated star interactions consume that source's deck.
- Selecting one star does not advance the other deck.
- The initial share payload remains generic.
- After selection, native sharing includes the exact message and attribution.
- The button label changes after selection.
- Clipboard fallback includes the formatted quote and canonical URL.
- Native-share cancellation stays silent.
- Native-share and clipboard failures reveal the existing manual fallback.
- Destroy still removes listeners and tears down the soundtrack.

### Release verification

- Run the focused content and controller tests.
- Run the complete Node test suite.
- Run `node scripts/validate.mjs`.
- Run `node scripts/build-site.mjs`.
- Confirm the exact approved artifact inventory.
- Compare built runtime sources with their tracked sources.
- Review the complete diff and changed filenames.
- Perform a focused privacy review.
- Confirm both source and built soundtrack hashes remain unchanged.
- Publish through a focused pull request and verify the live behavior after the
  GitHub Pages deployment succeeds.

## Expected implementation scope

Production behavior should require changes only to:

- `src/content.mjs`
- `script.js`

Focused tests should require changes only to:

- `tests/content.test.mjs`
- `tests/controller.test.mjs`

The design and implementation plan will add their normal documentation files.
`index.html`, `styles.css`, audio files, analytics work, and unrelated branches
remain unchanged.
