# Our Tiny Universe 🌌

A tiny playful corner of the internet for Naufal and Rity—orbiting together
since 7 July 2024.

## Live site

https://whizher.github.io/our-tiny-universe/

## Features

- Separate fictional transmissions for Naufal and Rity
- Pontianak-based relationship and anniversary counters
- Reduced-motion-aware orbit and shooting-star effects
- Native sharing with clipboard/manual fallbacks
- Privacy-bounded, dependency-free GitHub Pages build
- Optional local “Lunar Drive” soundtrack with manual play/pause and a five-second crossfade loop

## Privacy

This public project contains only the names Naufal and Rity, their relationship
start date, and fictional playful messages written for the page. It contains no
WhatsApp exports, private conversations, photographs, phone numbers, precise
personal locations, analytics, cookies, forms, or visitor tracking.

## Soundtrack

“Lunar Drive” is by Mondo Loops and is included here with the artist’s permission. Playback is optional, starts only after a visitor presses Play, and makes no third-party request.

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
