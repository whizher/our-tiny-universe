# Our Tiny Universe 🌌

A tiny playful corner of the internet for Naufal and Rity—orbiting together
since 7 July 2024.

## Live site

https://whizher.github.io/our-tiny-universe/

## Features

- Separate fictional transmissions for Naufal and Rity
- Pontianak-based relationship and anniversary counters
- Reduced-motion-aware orbit and shooting-star effects
- Descriptive star controls, repeat-selection guidance, and an optional motion pause
- English/Indonesian language handling and attributed transmission announcements
- Native sharing with clipboard/manual fallbacks
- Privacy-bounded, dependency-free GitHub Pages build
- Optional local “Has to Be” soundtrack with manual play/pause and a five-second crossfade loop

## Privacy

This public project contains only the names Naufal and Rity, their relationship
start date, and fictional playful messages written for the page. It contains no
WhatsApp exports, private conversations, photographs, phone numbers, precise
personal locations, analytics, cookies, forms, or visitor tracking.

## Soundtrack

“Has to Be” is by Capzlock and is included here with permission. Playback is optional, starts only after a visitor presses Play, and makes no third-party request. Both audio sources are attached on that first Play gesture, so visiting the page does not preload the soundtrack.

## Run locally

From the repository root:

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173/.

## Validate

```bash
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
```

No dependency installation is required.

## Manual accessibility and mobile checks

Automated tests check controller behavior and markup/CSS contracts. They do not
replace physical-device testing or listening with a real screen reader.

- Tab through both stars, motion pause, Anti-Cringe, sharing, and soundtrack controls. Check visible focus and Enter/Space activation.
- Confirm stars stay still while hovered or keyboard-focused. Pause motion, select both stars repeatedly, and resume: messages should continue while effects pause.
- With reduced motion enabled, check that orbit/shooting-star motion stays suppressed and the optional pause control is hidden.
- Listen with a screen reader: confirm English transmissions include the speaker, Indonesian passages use the appropriate language, and Anti-Cringe/share results are announced.
- Check 320/360/390-pixel portrait layouts, narrow landscape, and native browser zoom at 200%/400%. Scroll and keyboard-focus lower controls to check that the fixed soundtrack player does not cover them.
- On Android and iOS, check that no soundtrack request occurs before Play, then test Play/Pause/Resume and the five-second crossfade at the loop boundary. Check attribution and behavior after backgrounding the browser.
