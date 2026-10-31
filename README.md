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
- An interactive Tiny constellation with three connected, native milestone disclosures
- A permanent Anniversary Capsule with an independent native Eternal Letter disclosure
- Native sharing with clipboard/manual fallbacks
- Privacy-bounded, dependency-free GitHub Pages build
- Optional local “Has to Be” soundtrack with manual play/pause and a five-second crossfade loop

## Privacy

The page includes the names Naufal and Rity, their relationship start date, and
fictional playful transmissions. The Anniversary Capsule contains a real personal
Eternal Letter from Naufal to Rity; the letter is not fictional. Its exact text
is included in this release's public source and repository history, even while
its disclosure is closed.

No imported chats, WhatsApp exports, photographs, phone numbers or precise
personal locations are included. There are no analytics, cookies, forms or
visitor tracking. See the publication authorization below before future releases.

## Soundtrack

“Has to Be” is by Capzlock and is included here with permission. Playback is optional, starts only after a visitor presses Play, and makes no third-party request. Both audio sources are attached on that first Play gesture, so visiting the page does not preload the soundtrack.

## Run locally

From the repository root:

```bash
node scripts/build-site.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory _site
```

Then open http://localhost:4173/.
Serve only `_site`, never the repository or private reference documents. Keep
local previews on loopback and stop the server afterward.

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

## Tiny constellation

Select a milestone's glowing star or heading to open its original story. The
first milestone starts expanded. Browsers supporting native `details` name
grouping keep at most one story open; other browsers can keep several open.
The three stories remain available without JavaScript, and no selection is stored.

- Use Tab and Shift+Tab to reach each milestone, then Enter or Space to toggle it.
  Focus stays on that milestone; expanded/collapsed feedback comes from the
  native disclosure control rather than extra ARIA attributes.
- Check the horizontal desktop and vertical mobile layouts, including 320px
  portrait and short landscape. Scroll and keyboard-focus every milestone to
  check that the fixed soundtrack player does not obstruct the controls.
- Check that reduced motion and the manual Pause motion state suppress the
  timeline's subtle color/border transitions. No milestone or connector moves.
- With JavaScript disabled, open every story and confirm all original labels
  and descriptions remain readable. Actual screen-reader and physical-phone
  behavior still require device testing.

## Anniversary Capsule

The stationary gold star and its visible label open the Eternal Letter in normal
page flow. It starts closed on a fresh page and works without JavaScript. Native
browser restoration may retain its open state; the application does not save or
reset it. Capsule disclosures are independent of the timeline's exclusive group.
There is no forced scrolling, focus movement, automatic opening or audio action.

The Phase 2B.1 Celestial Letter Reveal adds a brief 480ms gold/lavender halo and a
300ms fade with a 5px upward reveal when the letter opens. The star stays still;
closing is immediate. Reduced motion or manual Pause motion cancels both effects
and shows the resting letter immediately. Reopening or re-enabling motion while
already open may replay the one-shot effects. This enhancement uses CSS only.

The permanent letter is available every day. July 7 in Asia/Pontianak adds only
a short anniversary invitation and a warmer static accent. July 8 removes only
those seasonal elements. Calendar-year counts use the existing July 7, 2024 start.
Lifecycle refreshes share one midnight timer and preserve the reading position.
No new storage, external service, asset, dependency or soundtrack operation is added.

There are zero yearly notes and no empty collection. The first possible note is
the third anniversary, July 7, 2027. Later notes require separate exact-text and
publication approval and may enter public source only after their anniversary
has arrived. Publish them manually as independent, initially closed native cards
in chronological order, using one `data-anniversary-note-year="2027"` attribute,
a summary such as `3rd anniversary`, and `<time datetime="2027-07-07">7 July 2027</time>`.
Never ship unpublished notes in hidden markup, comments, templates or JavaScript.
Once published, notes remain readable regardless of the visitor's clock.

The production-inventory test checks eligibility with one current clock snapshot;
synthetic policy tests use fixed dates. The standalone builder is a copier, not a
publication gate. Tests cannot undo text already exposed in public Git history.

Candidate acceptance must check normal desktop, 320/360/390px portrait and short
landscape; native keyboard open/close/focus; the full letter ending and fixed-player
clearance; JavaScript-disabled reading; restoration; manual/reduced motion; and
pre-Play network silence plus soundtrack playback/background behavior. Sharing
continues to use the existing public-universe/transmission payload, never the letter.
Do not change the separate soundtrack overlap issue #17 within this feature.

Native 200%/400% browser zoom and real Android TalkBack are
**NOT TESTED — OWNER-WAIVED** unless reinstated. Physical Android testing before
deployment is also **NOT TESTED — OWNER-WAIVED**. The owner plans to test the
deployed website personally; that future testing is not a completed result.
iOS is **NOT TESTED — DEVICE UNAVAILABLE**. Automated checks and desktop viewport
emulation do not establish physical-device or spoken screen-reader results.
Preserve and report Windows baseline failures separately; do not disable tests
or describe the Windows suite as passing when it is not.

## Publication authorization

The owner has authorized publication of this exact Eternal Letter in public
source and repository history for Phase 2B. Merging and deployment require
independent review and successful validation. No future annual notes are
included or authorized by this release; each requires separate exact-text and
publication approval.
