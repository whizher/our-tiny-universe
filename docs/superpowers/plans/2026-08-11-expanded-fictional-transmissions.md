# Expanded Fictional Transmissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the live site's separate fictional Naufal and Rity transmission pools from 8 to 24 unique messages each.

**Architecture:** Keep the existing immutable `MESSAGE_POOLS` interface and random-selection logic unchanged. Extend only the two source arrays, protect the maximum-variety and uniqueness behavior in the focused content test, review the exact approved wording in the release diff, then rebuild and publish the isolated branch through a guarded GitHub pull request.

**Tech Stack:** Dependency-free JavaScript ES modules, Node.js built-in test runner, repository-local validator and build scripts, GitHub Pages.

## Global Constraints

- Only the already approved public names, Naufal and Rity, may appear in new copy.
- Every new line is newly authored fiction; never read, reference, copy, paraphrase, or commit private chats, photos, media, dates, locations, contact details, or other personal evidence.
- Keep the existing 8 entries for each person, in their current order, and append exactly 16 approved entries to each pool.
- Keep `pickNextMessage(source, lastIndex, random)` and its no-immediate-repeat behavior unchanged.
- Do not change anti-cringe responses, layout, styling, soundtrack, counters, sharing, analytics, or effects.
- Keep the visitor-analytics worktree and branch untouched.
- Preserve `assets/lunar-drive.opus` with SHA-256 `ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765`.

---

## File map

- `src/content.mjs`: sole runtime source for immutable fictional message pools and existing selection logic.
- `tests/content.test.mjs`: pool-shape, immutability, uniqueness, and selection regression coverage.
- `docs/superpowers/specs/2026-08-11-expanded-fictional-transmissions-design.md`: approved behavioral and privacy design.
- `docs/superpowers/plans/2026-08-11-expanded-fictional-transmissions.md`: this executable implementation and release plan.

### Task 1: Expand and lock the fictional message pools

**Files:**
- Modify: `tests/content.test.mjs:11-33`
- Modify: `src/content.mjs:1-22`

**Interfaces:**
- Consumes: `MESSAGE_POOLS: Readonly<{ naufal: ReadonlyArray<string>, rity: ReadonlyArray<string> }>`.
- Produces: the same `MESSAGE_POOLS` export with exactly 24 ordered, unique strings per source.
- Preserves: `pickNextMessage(source, lastIndex = -1, random = Math.random): { source, index, message }`.

- [ ] **Step 1: Write the failing maximum-variety behavior test**

Replace the existing `contains separate approved fictional message pools` test with:

```js
test("provides 24 distinct fictional transmissions per source", () => {
  assert.deepEqual(Object.keys(MESSAGE_POOLS), ["naufal", "rity"]);

  const allMessages = [];
  for (const [source, pool] of Object.entries(MESSAGE_POOLS)) {
    assert.equal(pool.length, 24, source + " pool length");
    assert.equal(new Set(pool).size, 24, source + " pool uniqueness");
    assert.equal(Object.isFrozen(pool), true, source + " pool immutability");
    for (const message of pool) {
      assert.equal(typeof message, "string");
      assert.notEqual(message.trim(), "");
      allMessages.push(message);
    }
  }

  assert.equal(new Set(allMessages).size, allMessages.length);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: one failure reporting `naufal pool length` because the actual pool still ends after its original eighth entry; all unrelated content tests pass.

- [ ] **Step 3: Append the approved Naufal implementation**

In `MESSAGE_POOLS.naufal`, append these entries after `Romance detected. Naufal is pretending not to notice.`:

```js
    "Naufal pressed one button. Three constellations filed complaints.",
    "Confidence: maximum. Instructions: unread.",
    "A quiet orbit lasted seven seconds. Naufal was there.",
    "Naufal called it a shortcut. Mission control called it character development.",
    "Signal acquired: one questionable idea and excellent commitment.",
    "Naufal is improvising. Please update the emergency checklist.",
    "Plot twist: the chaos came with snacks.",
    "Naufal challenged gravity. Gravity requested a break.",
    "Teasing protocol active. Affection hidden in the source code.",
    "Pretends this is casual. Maintains a suspiciously stable orbit.",
    "Soft heart detected beneath several layers of nonsense.",
    "The universe asked for subtlety. Naufal sent fireworks.",
    "Naufal missed the cue, found another cue, and committed to it.",
    "One part stardust, two parts stubbornness, somehow still reliable.",
    "Naufal remains online, emotionally buffering, and impossible to ignore.",
    "Mission status: unconventional, sincere, and somehow still on course.",
```

- [ ] **Step 4: Append the approved Rity implementation**

In `MESSAGE_POOLS.rity`, append these entries after `Caring, but please do not make it weird.`:

```js
    "Rity reviewed the chaos and returned it with corrections.",
    "One raised eyebrow restored order to the galaxy.",
    "Rity's patience has entered low-power mode.",
    "Unnecessary drama detected. Rity opened the incident report.",
    "Rity said one sentence. Mission control is still recovering.",
    "Sarcasm calibrated. Affection safely concealed.",
    "Rity keeps the orbit steady while pretending this is not a full-time job.",
    "The universe tried nonsense. Rity declined.",
    "Rity's silence has excellent comedic timing.",
    "Kindness detected beneath premium-grade side-eye.",
    "Rity arrived with facts. Naufal arrived with a theory.",
    "Emergency response: one sigh, one solution, zero applause requested.",
    "Rity acts unbothered with suspicious consistency.",
    "Orbit status: stable. Rity checked it twice.",
    "She could explain it, but watching Naufal figure it out is funnier.",
    "Rity remains sharp, steady, and quietly on the same wavelength.",
```

- [ ] **Step 5: Run the focused test to verify GREEN**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 6: Review and commit the runtime change**

Run:

```bash
git diff --check
git diff -- src/content.mjs tests/content.test.mjs
git add src/content.mjs tests/content.test.mjs
git commit -m "feat: expand fictional transmissions"
```

Expected: the commit changes only the two listed files and preserves all selection logic.

### Task 2: Verify privacy, build integrity, and regression safety

**Files:**
- Verify: all tracked and built runtime files
- Do not modify: `assets/lunar-drive.opus`

**Interfaces:**
- Consumes: the committed 24+24 message pools from Task 1.
- Produces: a verified release candidate whose tracked diff contains only the two docs, `src/content.mjs`, and `tests/content.test.mjs`.

- [ ] **Step 1: Cover the expanded selector boundary found during review**

Add this focused characterization after the existing independent-source
selection test in `tests/content.test.mjs`:

```js
test("selects the expanded final index and wraps its immediate repeat", () => {
  assert.deepEqual(pickNextMessage("naufal", -1, () => 1), {
    source: "naufal",
    index: 23,
    message: MESSAGE_POOLS.naufal[23],
  });
  assert.deepEqual(pickNextMessage("naufal", 23, () => 1), {
    source: "naufal",
    index: 0,
    message: MESSAGE_POOLS.naufal[0],
  });
  assert.deepEqual(pickNextMessage("rity", -1, () => 1), {
    source: "rity",
    index: 23,
    message: MESSAGE_POOLS.rity[23],
  });
  assert.deepEqual(pickNextMessage("rity", 23, () => 1), {
    source: "rity",
    index: 0,
    message: MESSAGE_POOLS.rity[0],
  });
});
```

Run `node --test tests/content.test.mjs` and require 7 tests to pass. This is
coverage of already-existing selector behavior; it requires no production
change.

- [ ] **Step 2: Run the complete automated suite**

Run:

```bash
node --test
```

Expected: 128 tests pass, 0 fail.

- [ ] **Step 3: Validate and build the production site**

Run:

```bash
node scripts/validate.mjs
node scripts/build-site.mjs
```

Expected: both commands exit 0; validation reports `Validated 8 runtime files.` and the build completes without adding tracked files.

- [ ] **Step 4: Verify exact artifacts and soundtrack integrity**

Run:

```bash
find _site -type f -print | LC_ALL=C sort
cmp src/content.mjs _site/src/content.mjs
sha256sum assets/lunar-drive.opus _site/assets/lunar-drive.opus
```

Expected artifact inventory:

```text
_site/.nojekyll
_site/assets/favicon.svg
_site/assets/lunar-drive.opus
_site/assets/social-preview.png
_site/index.html
_site/script.js
_site/src/audio.mjs
_site/src/content.mjs
_site/src/time.mjs
_site/styles.css
```

Expected: `cmp` exits 0 and both soundtrack hashes equal `ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765`.

- [ ] **Step 5: Review the complete release diff and privacy boundary**

Run:

```bash
git diff --check origin/main...HEAD
git diff --name-only origin/main...HEAD
git diff --stat origin/main...HEAD
git diff origin/main...HEAD -- src/content.mjs tests/content.test.mjs
git status --short
```

Expected changed paths:

```text
docs/superpowers/plans/2026-08-11-expanded-fictional-transmissions.md
docs/superpowers/specs/2026-08-11-expanded-fictional-transmissions-design.md
src/content.mjs
tests/content.test.mjs
```

Confirm manually that the 32 additions are the approved fictional lines, the original 16 remain byte-for-byte, no selection logic changed, no unrelated branch content entered, and the worktree is clean.

### Task 3: Publish, merge, deploy, and verify live

**Files:**
- Publish: the exact committed tree from `feature/expanded-fictional-transmissions`
- Verify remotely: `src/content.mjs`, pull-request changed paths, merge commit, Pages run, and live runtime source

**Interfaces:**
- Consumes: the clean, verified local release candidate from Task 2.
- Produces: a merged `main` commit and successful GitHub Pages deployment containing the exact 24+24 pools.

- [ ] **Step 1: Publish the exact local tree through GitHub**

Try the configured non-interactive Git transport only if credentials are available. If normal push is unavailable, use the GitHub connector's blob/tree/commit/ref operations. In either path, compare the remote commit tree SHA with `git rev-parse HEAD^{tree}` before opening the pull request.

Expected: remote branch `feature/expanded-fictional-transmissions` points to a commit with the exact local tree.

- [ ] **Step 2: Open and verify the focused pull request**

Create a pull request titled `Expand fictional transmissions` against `main`. Verify its head SHA and require the changed-filename list to match exactly:

```text
docs/superpowers/plans/2026-08-11-expanded-fictional-transmissions.md
docs/superpowers/specs/2026-08-11-expanded-fictional-transmissions-design.md
src/content.mjs
tests/content.test.mjs
```

- [ ] **Step 3: Merge with a guarded head and verify deployment**

Merge only with the verified pull-request head SHA. Wait for the push-triggered GitHub Pages workflow to complete successfully; stop and diagnose if it fails.

- [ ] **Step 4: Verify the live site**

Fetch the deployed `src/content.mjs` without using a cached response. Confirm it contains exactly 24 `naufal` strings and 24 `rity` strings, includes the final approved line from each pool, retains the no-immediate-repeat selection function, and contains no unrelated analytics or private material.

- [ ] **Step 5: Record final evidence**

Report the local commit, pull request, merge commit, Pages run, live URL, 128/128 test result, validator/build result, exact artifact inventory, matching soundtrack hashes, and confirmation that the visitor-analytics branch remained untouched.
