# Enhanced Shooting Stars Design

## Goal

Upgrade the existing shooting-star effect into a lightweight hybrid effects system that feels more cinematic and alive while preserving the site's current architecture, performance profile, privacy guarantees, and reduced-motion behavior.

The visual direction is a balanced mix: mostly white meteors with subtle gold and lavender variation, richer tails and glow, occasional brighter hero comets, small interaction-driven bursts, and rare ambient meteors whose cadence becomes temporarily more active after user interaction.

## Scope

### In scope

- Enhance shooting-star visual variety with richer per-particle specifications.
- Add four effect presets: ambient, transmission, anti-cringe, and anniversary.
- Trigger a small burst whenever a Naufal or Rity transmission is revealed.
- Keep Anti-Cringe as an effect trigger with a slightly more playful mix.
- Make anniversary mode the largest and most celebratory shower.
- Add rare ambient meteors while the page is open.
- Temporarily increase ambient meteor frequency after user interaction, then decay back to a calmer cadence.
- Improve cleanup timing so particles remain only as long as required by their animation durations and delays.
- Preserve deterministic generation through injected randomness so the effect model remains testable.

### Out of scope

- Canvas, WebGL, requestAnimationFrame-based particle engines, or external animation libraries.
- New image, video, audio, or font assets.
- Persistent activity history, local storage, session storage, cookies, analytics, identifiers, or server-side state.
- Layout redesign, new settings UI, user-configurable effect intensity, or manual meteor controls.
- Changes to message pools, transmission deck behavior, sharing behavior, timeline content, counters, soundtrack behavior, or the five-second equal-power audio crossfade.

## Architecture

The enhancement remains split across the existing content, controller, and presentation layers.

### `src/content.mjs`

`createShootingStarSpecs()` remains the deterministic source of randomized particle data. It will be expanded so each generated star can describe visual and motion properties such as:

- horizontal starting position;
- delay;
- duration;
- travel angle or trajectory class;
- trail length;
- thickness or scale;
- brightness;
- color family (`white`, `gold`, or `lavender`);
- whether the particle is a brighter hero-comet variant.

The generator should accept enough preset information to produce different effect families without introducing DOM concerns into `src/content.mjs`.

### `script.js`

The controller coordinates effect presets and lifecycle. It should expose one internal rendering pipeline:

`trigger -> choose preset -> generate specs -> render particles -> schedule cleanup`

Preset-specific wrappers or configuration objects should drive the same renderer rather than creating four separate implementations.

The controller also owns the ambient scheduler and recent-activity state. Ambient scheduling must remain page-memory only.

### `styles.css`

CSS owns the visual treatment. Existing `.shooting-star` styling will be enriched with CSS custom properties and pseudo-elements where appropriate to render:

- brighter meteor heads;
- layered or fading tails;
- variable trail lengths and thicknesses;
- subtle white, gold, and lavender variants;
- stronger glow for hero comets;
- trajectory differences without requiring a canvas renderer.

The existing fixed effect layer remains `pointer-events: none` so animations never intercept site interaction.

## Effect Presets

All presets use the same generator and renderer but differ in count, visual ranges, and comet probability.

### Ambient

- Usually one or two particles.
- Lowest brightness and most restrained trail treatment.
- Rare hero comet probability.
- Intended to feel organic rather than continuous or obviously periodic.

### Transmission

- Fires immediately after a Naufal or Rity transmission is revealed.
- Small, quick burst that provides feedback without obscuring the message card.
- Moderate brightness with white as the dominant color and occasional gold/lavender accents.
- Interaction also refreshes the activity-boost window for ambient scheduling.

### Anti-Cringe

- Retains the existing Anti-Cringe trigger.
- Slightly more playful than the transmission preset.
- May use a somewhat higher chance of a brighter meteor while remaining visually bounded.

### Anniversary

- Largest particle count and widest visual range.
- Highest hero-comet probability.
- Clearly more celebratory than normal interaction effects.
- Still bounded enough to avoid animation overload on mobile devices.

## Ambient Activity Model

The page starts in a calm ambient state. A randomized wait schedules the next ambient meteor event. After the event renders, the scheduler chooses a fresh randomized wait and repeats.

User interaction with a transmission temporarily puts the page into an active window of approximately one minute. While the active window is in effect, ambient waits come from a shorter range so the sky feels more responsive. Each new transmission interaction refreshes the active window. When no new interaction occurs, the system naturally returns to the calmer range.

The final implementation plan should define exact timing ranges, but the intended behavior is:

- calm mode: infrequent ambient events;
- active mode: noticeably but not aggressively more frequent events;
- no fixed visible cadence;
- one ambient timer owned at a time.

Anti-Cringe interaction may count as recent activity if doing so simplifies the controller and keeps the behavior coherent, but transmission interaction is the required activity trigger.

## Reduced Motion

`prefers-reduced-motion` remains a hard guardrail.

When reduced motion is enabled:

- no transmission burst is rendered;
- no Anti-Cringe shooting-star burst is rendered;
- no anniversary shower is rendered;
- no ambient meteor timer is scheduled;
- existing non-shooting-star reduced-motion behavior remains unchanged.

No animation should be created only to have CSS collapse its duration. The controller should avoid scheduling or rendering the effect in the first place.

## Lifecycle and Cleanup

The current fixed two-second cleanup delay will be replaced by timing derived from the rendered specifications.

For each render batch, cleanup should occur after:

`maximum(delayMs + durationMs) + safety buffer`

This prevents long hero comets from being removed early and prevents short bursts from leaving dead DOM nodes around unnecessarily.

Only one cleanup timer is owned by the renderer at a time. Starting a new batch may replace the currently rendered effect batch as the site does today, unless implementation testing shows safe concurrent batches are both simple and beneficial. The design preference is to keep ownership simple and bounded rather than introduce an unbounded multi-batch particle queue.

Destroy/cleanup behavior must cancel both the ambient timer and the shooting-star cleanup timer.

## Performance Constraints

The system must stay lightweight on mobile.

- Ambient effects remain one or two particles.
- Transmission bursts remain modest.
- Anti-Cringe remains moderate.
- Anniversary is the only large shower.
- No continuous animation loop is introduced.
- No external dependencies or runtime requests are introduced.
- DOM particle counts remain explicitly bounded by preset configuration.
- Effects must never block pointer input.

## Testing Strategy

### Content tests

Expand deterministic shooting-star tests to cover:

- the richer generated schema;
- bounded numeric ranges for position, delay, duration, scale, angle, trail length, and brightness;
- valid color-family values;
- deterministic output with injected randomness;
- preset-specific count/range differences where those differences belong in the generator;
- deterministic hero-comet selection or bounded comet flags.

Tests should avoid asserting fragile visual implementation details that belong solely to CSS.

### Controller tests

Add or strengthen tests for:

- transmission clicks triggering the transmission preset;
- Anti-Cringe triggering its preset;
- anniversary entry triggering the anniversary preset;
- calm ambient scheduling on initialization;
- transmission interaction refreshing the activity window;
- active ambient scheduling using the shorter cadence;
- decay back to calm cadence after the activity window;
- only one ambient timer being owned at a time;
- cleanup timing being based on the longest generated particle lifetime plus a safety buffer;
- reduced motion suppressing both scheduled ambient effects and interaction-triggered bursts;
- destroy cancelling all effect-related timers.

### Regression verification

The full existing automated test suite must still pass. Validation/build checks should verify that no unrelated behavior, assets, storage, analytics, runtime requests, or soundtrack bytes changed.

## Success Criteria

The enhancement is successful when all of the following hold:

- shooting stars show visibly richer variation in size, speed, angle, glow, trail length, and color;
- white remains the dominant meteor color, with gold and lavender used as subtle accents;
- occasional hero comets are visually distinct without dominating normal effects;
- transmission clicks produce a small satisfying burst;
- Anti-Cringe remains playful rather than overwhelming;
- anniversary mode is clearly the most special effect state;
- ambient meteors feel rare and organic rather than repetitive;
- recent interaction temporarily makes the ambient sky more active and then naturally settles;
- reduced-motion users receive no shooting-star animation or ambient scheduling;
- mobile interaction remains smooth and unobstructed;
- no external dependencies, network requests, storage, analytics, identifiers, or new assets are introduced;
- existing transmission, sharing, timeline, soundtrack, privacy, and build behavior remain unchanged.
