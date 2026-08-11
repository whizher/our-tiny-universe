# Expanded Fictional Transmissions Design

**Date:** 2026-08-11

**Status:** Approved

**Repository:** `whizher/our-tiny-universe`

## Context

The deployed site currently has two separate fictional transmission pools, but
each pool contains only eight messages. The previously discussed expansion was
never implemented on a local or remote feature branch, so GitHub Pages is
correctly serving the original set rather than a stale build.

Naufal selected maximum variety with a balanced tone. This change expands both
named pools while retaining the site's existing interaction and privacy model.

## Goals

- Expand the Naufal pool from 8 to 24 unique fictional transmissions.
- Expand the Rity pool from 8 to 24 unique fictional transmissions.
- Balance cosmic humor, teasing, chaos, warmth, and understated affection.
- Preserve source attribution and the existing no-immediate-repeat behavior.
- Keep every existing transmission and append newly authored fictional copy.
- Deploy through a focused pull request after all tests and privacy checks pass.

## Non-goals

- No changes to layout, styling, soundtrack, relationship counters, sharing,
  analytics, or shooting-star effects.
- No shuffle-bag, persistence, cookies, storage, or cross-visit history.
- No changes to the four anti-cringe responses.
- No visitor-tracker work in this branch.

## Privacy boundary

Only the already approved public names, Naufal and Rity, may appear in the new
copy. Every added transmission is newly authored fiction based on broad tone
directions. Private chats, quotations, close paraphrases, photos, media, dates,
locations, contact details, and other personal evidence must not be read,
referenced, copied, or committed.

## Content design

`src/content.mjs` remains the single source of truth. `MESSAGE_POOLS` keeps the
same immutable `naufal` and `rity` arrays. The original eight entries in each
array remain in their current order, followed by sixteen new entries.

### Naufal pool

1. “Naufal entered the orbit. Normal behavior immediately left.”
2. “Current status: dramatic, but still present.”
3. “Acts chaotic. Still checks if Rity is okay.”
4. “Naufal has a plan. The universe is concerned.”
5. “Somehow both the problem and the tech support.”
6. “Orbit stability: questionable. Commitment: still online.”
7. “Naufal found a new way to be weird. Again.”
8. “Romance detected. Naufal is pretending not to notice.”
9. “Naufal pressed one button. Three constellations filed complaints.”
10. “Confidence: maximum. Instructions: unread.”
11. “A quiet orbit lasted seven seconds. Naufal was there.”
12. “Naufal called it a shortcut. Mission control called it character development.”
13. “Signal acquired: one questionable idea and excellent commitment.”
14. “Naufal is improvising. Please update the emergency checklist.”
15. “Plot twist: the chaos came with snacks.”
16. “Naufal challenged gravity. Gravity requested a break.”
17. “Teasing protocol active. Affection hidden in the source code.”
18. “Pretends this is casual. Maintains a suspiciously stable orbit.”
19. “Soft heart detected beneath several layers of nonsense.”
20. “The universe asked for subtlety. Naufal sent fireworks.”
21. “Naufal missed the cue, found another cue, and committed to it.”
22. “One part stardust, two parts stubbornness, somehow still reliable.”
23. “Naufal remains online, emotionally buffering, and impossible to ignore.”
24. “Mission status: unconventional, sincere, and somehow still on course.”

### Rity pool

1. “Rity entered the orbit. Naufal's peace immediately left.”
2. “Roasting Naufal remains a renewable energy source.”
3. “Acts unimpressed. Keeps showing up anyway.”
4. “Patience level: somehow still above zero.”
5. “Rity detected unnecessary Naufal behavior.”
6. “Romance detected. Sarcasm deployed immediately.”
7. “Orbit supervisor: tired, but operational.”
8. “Caring, but please do not make it weird.”
9. “Rity reviewed the chaos and returned it with corrections.”
10. “One raised eyebrow restored order to the galaxy.”
11. “Rity's patience has entered low-power mode.”
12. “Unnecessary drama detected. Rity opened the incident report.”
13. “Rity said one sentence. Mission control is still recovering.”
14. “Sarcasm calibrated. Affection safely concealed.”
15. “Rity keeps the orbit steady while pretending this is not a full-time job.”
16. “The universe tried nonsense. Rity declined.”
17. “Rity's silence has excellent comedic timing.”
18. “Kindness detected beneath premium-grade side-eye.”
19. “Rity arrived with facts. Naufal arrived with a theory.”
20. “Emergency response: one sigh, one solution, zero applause requested.”
21. “Rity acts unbothered with suspicious consistency.”
22. “Orbit status: stable. Rity checked it twice.”
23. “She could explain it, but watching Naufal figure it out is funnier.”
24. “Rity remains sharp, steady, and quietly on the same wavelength.”

## Selection behavior

`pickNextMessage(source, lastIndex, random)` is unchanged. A star interaction
continues to select from only its attributed pool. If the random result matches
that source's immediately previous index, selection advances by one position.
The larger pools provide more variety without introducing new state or storage.

## Testing

Implementation follows a red-green-refactor cycle:

1. Update the content test to require exactly 24 nonempty, immutable messages
   in each named pool and reject duplicates within or across the two pools.
2. Run the focused content test and capture the expected failure against the
   current 8+8 implementation.
3. Append the approved fictional messages and rerun the focused test to green.
4. Run the complete Node test suite, repository validator, production build,
   artifact inventory, diff check, and soundtrack byte-integrity check.
5. Review the exact diff to confirm the original entries and approved new copy,
   require only the design, plan, content source, and content test paths, and
   confirm no private material or unrelated feature work entered the branch.

## Release

Publish the focused branch through GitHub, open a pull request, and merge only
after every required check is green. Wait for GitHub Pages deployment, then
verify that the live source contains 24 Naufal and 24 Rity transmissions and
that both stars still show correctly attributed, non-immediate-repeat messages.
