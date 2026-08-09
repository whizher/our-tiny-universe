# Compact Soundtrack Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wide soundtrack pill with an accessible 48 × 48 circular state button and raise default soundtrack playback from 30% to 50%.

**Architecture:** Preserve the existing two-channel crossfade controller and make its one default-volume constant the source of the 50% behavior. Keep controller state as the UI source of truth: `script.js` maps each state to an icon, accessible action label, pressed state, and existing status text, while CSS moves the old outer-panel treatment onto a compact status bubble.

**Tech Stack:** Plain HTML and CSS, browser JavaScript ES modules, HTMLMediaElement, Node.js 22 built-in test runner, existing repository validator/build scripts, GitHub Actions, GitHub Pages.

## Global Constraints

- Work only in `/workspace/scratch/01380b3c2ffa/repo-audit/.worktrees/otu-compact-soundtrack` on `feature/compact-soundtrack-control`, based on deployed `origin/main` commit `8408f09`.
- Keep playback user-triggered. Do not add `autoplay`, native `loop`, a remote player, or another listener.
- Keep the existing 5-second equal-power crossfade and all pause, resume, retry, end-of-track, error, and teardown behavior.
- Change only the default target volume from `0.3` to `0.5`; explicit `targetVolume` overrides remain valid.
- Use one 48 × 48 CSS-pixel circular button with visible icons `🎵`, `⏸`, `▶`, and `↻`.
- Give every icon state the exact dynamic `aria-label`, `aria-pressed`, and status copy specified below.
- Keep the status hint visible in a separate bubble with maximum width `16rem` and no width beyond `calc(100vw - 1.5rem)`.
- Preserve bottom-right safe-area positioning, keyboard operation, the existing visible focus outline, and layout down to a 320 CSS-pixel viewport.
- Add no dependency, new production file, remote resource, analytics code, or media. The production build remains exactly ten files.
- Do not modify `assets/lunar-drive.opus`; its SHA-256 remains `ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765`.
- Do not place private chats, photographs, permission evidence, invitation data, or unrelated personal content in source, tests, commits, screenshots, reports, or the pull request.
- Leave `feature/privacy-first-visitor-analytics` untouched; it will be rebased separately after this maintenance change deploys.
- Use red-green TDD for each behavior change. Do not edit production code before observing the relevant failing test.

## File Map

**Modify**

- `src/audio.mjs` — change the one default target-volume constant to `0.5`.
- `tests/audio.test.mjs` — encode and exercise the 50% default throughout existing lifecycle coverage while preserving the explicit 30% helper override test.
- `index.html` — make the initial button icon-only with its complete accessible label.
- `script.js` — map six controller states to icons, accessible labels, pressed state, and status copy.
- `styles.css` — make the fixed container transparent, move panel styling to the hint, and make the button circular.
- `tests/controller.test.mjs` — verify each state mapping, including pending initial playback and resume.
- `tests/build.test.mjs` — verify icon-only markup, no autoplay, and the compact CSS contract.

**Do not create**

- A new production module, asset, dependency, volume slider, persistent setting, remote embed, analytics hook, or private-content fixture.

---

### Task 1: Raise the default crossfade target to 50%

**Files:**

- Modify: `tests/audio.test.mjs`
- Modify: `src/audio.mjs`

**Interfaces:**

- Consumes: `equalPowerVolumes(progress, targetVolume?)` and `createCrossfadeController(options)` from `src/audio.mjs`
- Preserves: optional `targetVolume` range `(0, 1]`
- Produces: default `targetVolume = 0.5` for initial playback, resume, fallback promotion, and both sides of every equal-power crossfade

- [ ] **Step 1: Change the audio tests to express the new default**

In `tests/audio.test.mjs`, add a test-only constant after `flushPlayback`:

~~~js
const EXPECTED_DEFAULT_TARGET_VOLUME = 0.5;
~~~

Keep the existing `calculates a clamped equal-power crossfade` test's explicit
`0.3` arguments and assertions unchanged; that test proves custom target
volumes still work. Immediately after it, add this failing default test:

~~~js
test("uses 50% as the default equal-power target", () => {
  assert.deepEqual(equalPowerVolumes(0), {
    outgoing: EXPECTED_DEFAULT_TARGET_VOLUME,
    incoming: 0,
  });
  const halfway = equalPowerVolumes(0.5);
  assert.ok(
    Math.abs(
      halfway.outgoing -
        Math.SQRT1_2 * EXPECTED_DEFAULT_TARGET_VOLUME
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      halfway.incoming -
        Math.SQRT1_2 * EXPECTED_DEFAULT_TARGET_VOLUME
    ) < 1e-12,
  );
  assert.deepEqual(equalPowerVolumes(1), {
    outgoing: 0,
    incoming: EXPECTED_DEFAULT_TARGET_VOLUME,
  });
});
~~~

Replace every later assertion that describes a controller created without an
explicit `targetVolume` from literal `0.3` to
`EXPECTED_DEFAULT_TARGET_VOLUME`. This includes:

~~~js
assert.equal(channels[0].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
assert.deepEqual(
  channels[0].playVolumes,
  [EXPECTED_DEFAULT_TARGET_VOLUME],
);
assert.ok(
  Math.abs(
    channels[0].volume -
      Math.SQRT1_2 * EXPECTED_DEFAULT_TARGET_VOLUME
  ) < 1e-12,
);
assert.ok(
  Math.abs(
    channels[1].volume -
      Math.SQRT1_2 * EXPECTED_DEFAULT_TARGET_VOLUME
  ) < 1e-12,
);
assert.equal(channels[1].volume, EXPECTED_DEFAULT_TARGET_VOLUME);
~~~

Before the new test shifts line numbers, the exact default-path `0.3` uses to
replace are at lines 114, 227, 410, 413, 421, 464, 495, 512, 574, 595, 621,
650, 672, 836, 867, 877, 920, 1032, and 1221. Do not replace the explicit
`0.3` arguments and expectations at lines 90–99; those literals intentionally
exercise the public override parameter.

- [ ] **Step 2: Run the audio tests and verify the intended RED state**

Run:

~~~bash
node --test tests/audio.test.mjs
~~~

Expected: FAIL with actual default values based on `0.3` where the tests now
require `0.5`. Failures must be volume mismatches, not syntax or fixture errors.

- [ ] **Step 3: Make the one-line production change**

In `src/audio.mjs`, change only the default constant:

~~~js
const DEFAULT_CROSSFADE_MS = 5_000;
const DEFAULT_TARGET_VOLUME = 0.5;
~~~

Do not change the range check, any volume assignment, the crossfade formula,
or the explicit `targetVolume` injection point.

- [ ] **Step 4: Run the complete audio test file and verify GREEN**

Run:

~~~bash
node --test tests/audio.test.mjs
~~~

Expected: every audio test passes, including the explicit `0.3` helper test
and the new 50% default test.

- [ ] **Step 5: Verify the runtime boundary and inspect the focused diff**

Run:

~~~bash
node scripts/validate.mjs
git diff --check
git diff -- src/audio.mjs tests/audio.test.mjs
~~~

Expected: validator prints `Validated 8 runtime files.`, `git diff --check`
is silent, and the diff contains only the default constant plus corresponding
test expectations.

- [ ] **Step 6: Commit the default-volume change**

~~~bash
git add src/audio.mjs tests/audio.test.mjs
git commit -m "feat: raise soundtrack default volume"
~~~

---

### Task 2: Replace the soundtrack pill with the circular state control

**Files:**

- Modify: `tests/controller.test.mjs`
- Modify: `tests/build.test.mjs`
- Modify: `index.html`
- Modify: `script.js`
- Modify: `styles.css`

**Interfaces:**

- Consumes: controller states `idle`, `starting`, `playing`, `resuming`, `paused`, and `error`
- Produces: button view `{ icon: string, accessibleLabel: string, pressed: "true" | "false", status: string }`
- Preserves: `[data-music-toggle]`, `[data-music-status]`, two `[data-soundtrack-channel]` elements, and the existing click/teardown lifecycle

- [ ] **Step 1: Add a precise state-view assertion helper**

In `tests/controller.test.mjs`, add this helper after `createFixture()`:

~~~js
function assertMusicView(elements, {
  accessibleLabel,
  icon,
  pressed,
  status,
}) {
  assert.equal(elements.musicButton.textContent, icon);
  assert.equal(
    elements.musicButton.getAttribute("aria-label"),
    accessibleLabel,
  );
  assert.equal(
    elements.musicButton.getAttribute("aria-pressed"),
    pressed,
  );
  assert.equal(elements.musicStatus.textContent, status);
}
~~~

Replace the soundtrack-view assertions in the existing controller tests with
these exact expected views:

~~~js
assertMusicView(elements, {
  accessibleLabel: "Play soundtrack",
  icon: "🎵",
  pressed: "false",
  status: "Tap 🎵 to start Lunar Drive.",
});

assertMusicView(elements, {
  accessibleLabel: "Pause soundtrack",
  icon: "⏸",
  pressed: "true",
  status: "Lunar Drive — Mondo Loops",
});

assertMusicView(elements, {
  accessibleLabel: "Resume soundtrack",
  icon: "▶",
  pressed: "false",
  status: "Lunar Drive — Mondo Loops · Paused",
});

assertMusicView(elements, {
  accessibleLabel: "Retry soundtrack",
  icon: "↻",
  pressed: "false",
  status: "Lunar Drive couldn’t start. Tap to try again.",
});
~~~

Use the Pause view for both `starting`/`resuming` pending-state assertions and
for ordinary `playing`. Use the Resume view after controller-owned or external
pause. Use the Retry view for both production media error and fake-controller
error tests.

- [ ] **Step 2: Add direct coverage for the pending initial state**

Add this test after `renders the initial soundtrack control state`:

~~~js
test("shows Pause while initial soundtrack playback is pending", async () => {
  const { documentRef, elements } = createFixture();
  let releaseStart;
  elements.audioChannels[0].playWaits.push(
    new Promise((resolve) => { releaseStart = resolve; }),
  );
  initProductionSite({
    documentRef,
    schedule: () => 1,
    cancelSchedule: () => {},
  });

  const startClick = elements.musicButton.click();
  assertMusicView(elements, {
    accessibleLabel: "Pause soundtrack",
    icon: "⏸",
    pressed: "true",
    status: "Tap 🎵 to start Lunar Drive.",
  });

  releaseStart();
  await startClick;
  assertMusicView(elements, {
    accessibleLabel: "Pause soundtrack",
    icon: "⏸",
    pressed: "true",
    status: "Lunar Drive — Mondo Loops",
  });
});
~~~

- [ ] **Step 3: Add failing markup and compact-layout tests**

In `tests/build.test.mjs`, replace the old `🎵 Play soundtrack` markup
assertion inside `soundtrack markup is local, manual, visible, and duplicated
for crossfade` with:

~~~js
const toggle = html.match(
  /<button\b[^>]*data-music-toggle[^>]*>[\s\S]*?<\/button>/,
)?.[0] || "";
assert.match(toggle, /aria-label="Play soundtrack"/);
assert.match(toggle, /aria-pressed="false"/);
assert.match(toggle, />\s*🎵\s*<\/button>/);
assert.doesNotMatch(toggle, />[^<]*Play soundtrack/);
~~~

Add a separate style test:

~~~js
test("soundtrack control is a compact circle with a separate hint bubble", async () => {
  const styles = await readFile("styles.css", "utf8");
  const player = styles.match(/\.music-player\s*\{([^}]*)\}/)?.[1] || "";
  const status = styles.match(
    /\.music-player__status\s*\{([^}]*)\}/,
  )?.[1] || "";
  const toggle = styles.match(
    /\.music-player__toggle\s*\{([^}]*)\}/,
  )?.[1] || "";

  assert.match(player, /justify-items:\s*end;/);
  assert.match(player, /width:\s*max-content;/);
  assert.match(player, /max-width:\s*calc\(100vw - 1\.5rem\);/);
  assert.doesNotMatch(player, /background:\s*rgba/);
  assert.doesNotMatch(player, /padding:\s*0\.75rem/);

  assert.match(
    status,
    /max-width:\s*min\(16rem, calc\(100vw - 1\.5rem\)\);/,
  );
  assert.match(status, /padding:\s*0\.55rem 0\.7rem;/);
  assert.match(status, /background:\s*rgba\(8, 13, 39, 0\.94\);/);
  assert.match(status, /backdrop-filter:\s*blur\(12px\);/);

  assert.match(toggle, /width:\s*3rem;/);
  assert.match(toggle, /height:\s*3rem;/);
  assert.match(toggle, /min-width:\s*3rem;/);
  assert.match(toggle, /min-height:\s*3rem;/);
  assert.match(toggle, /padding:\s*0;/);
  assert.match(toggle, /border-radius:\s*50%;/);
});
~~~

- [ ] **Step 4: Run the focused controller and build tests and verify RED**

Run:

~~~bash
node --test tests/controller.test.mjs tests/build.test.mjs
~~~

Expected: FAIL because the current button still contains full text, has no
dynamic `aria-label`, and uses the wide outer panel/pill CSS. Confirm the audio
behavior assertions themselves do not regress.

- [ ] **Step 5: Change the initial accessible markup**

In `index.html`, make the button icon-only without altering its hooks or the
audio elements:

~~~html
<button
  class="music-player__toggle"
  type="button"
  data-music-toggle
  aria-label="Play soundtrack"
  aria-pressed="false"
>
  🎵
</button>
~~~

Keep the existing status paragraph and its exact
`Tap 🎵 to start Lunar Drive.` text.

- [ ] **Step 6: Map controller states to icons and accessible labels**

Replace only the view data and rendering assignments inside
`renderMusicState` in `script.js`:

~~~js
function renderMusicState(state) {
  const views = {
    idle: {
      accessibleLabel: "Play soundtrack",
      icon: "🎵",
      pressed: "false",
      status: "Tap 🎵 to start Lunar Drive.",
    },
    starting: {
      accessibleLabel: "Pause soundtrack",
      icon: "⏸",
      pressed: "true",
      status: "Tap 🎵 to start Lunar Drive.",
    },
    playing: {
      accessibleLabel: "Pause soundtrack",
      icon: "⏸",
      pressed: "true",
      status: "Lunar Drive — Mondo Loops",
    },
    resuming: {
      accessibleLabel: "Pause soundtrack",
      icon: "⏸",
      pressed: "true",
      status: "Lunar Drive — Mondo Loops",
    },
    paused: {
      accessibleLabel: "Resume soundtrack",
      icon: "▶",
      pressed: "false",
      status: "Lunar Drive — Mondo Loops · Paused",
    },
    error: {
      accessibleLabel: "Retry soundtrack",
      icon: "↻",
      pressed: "false",
      status: "Lunar Drive couldn’t start. Tap to try again.",
    },
  };
  const view = views[state];
  if (!view) return;
  musicButton.textContent = view.icon;
  musicButton.setAttribute("aria-label", view.accessibleLabel);
  musicButton.setAttribute("aria-pressed", view.pressed);
  musicStatus.textContent = view.status;
}
~~~

Do not change `toggleSoundtrack`, the controller factory, or listener cleanup.

- [ ] **Step 7: Implement the transparent container, hint bubble, and circle**

Replace the three soundtrack rules in `styles.css` with:

~~~css
.music-player {
  position: fixed;
  right: max(0.75rem, env(safe-area-inset-right, 0px));
  bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
  z-index: 20;
  display: grid;
  justify-items: end;
  gap: 0.55rem;
  width: max-content;
  max-width: calc(100vw - 1.5rem);
  text-align: left;
}

.music-player__status {
  max-width: min(16rem, calc(100vw - 1.5rem));
  padding: 0.55rem 0.7rem;
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.35;
  background: rgba(8, 13, 39, 0.94);
  border: 1px solid rgba(188, 156, 255, 0.52);
  border-radius: 0.85rem;
  box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
}

.music-player__toggle {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  min-width: 3rem;
  min-height: 3rem;
  padding: 0;
  color: var(--ink);
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1;
  background: rgba(188, 156, 255, 0.16);
  border: 1px solid rgba(188, 156, 255, 0.52);
  border-radius: 50%;
  cursor: pointer;
}
~~~

Keep the existing `.music-player__toggle:hover` rule and global
`button:focus-visible` outline unchanged. Add no animation or media query.

- [ ] **Step 8: Run the focused tests and verify GREEN**

Run:

~~~bash
node --test tests/controller.test.mjs tests/build.test.mjs
~~~

Expected: all controller and build tests pass, including pending initial play,
pending resume, external pause, media error, retry, icon-only markup, no
autoplay, and compact CSS.

- [ ] **Step 9: Validate and build the integrated runtime**

Run:

~~~bash
node scripts/validate.mjs
node scripts/build-site.mjs
find _site -type f -printf '%P\n' | sort
~~~

Expected: validator prints `Validated 8 runtime files.`, build prints
`Built _site with privacy-bounded public assets.`, and inventory is exactly:

~~~text
.nojekyll
assets/favicon.svg
assets/lunar-drive.opus
assets/social-preview.png
index.html
script.js
src/audio.mjs
src/content.mjs
src/time.mjs
styles.css
~~~

- [ ] **Step 10: Inspect and commit the circular control**

Run:

~~~bash
git diff --check
git diff -- index.html script.js styles.css tests/controller.test.mjs tests/build.test.mjs
~~~

Confirm the diff contains no controller-lifecycle, content, sharing, analytics,
or asset change. Then commit:

~~~bash
git add index.html script.js styles.css tests/controller.test.mjs tests/build.test.mjs
git commit -m "feat: compact soundtrack controls"
~~~

---

### Task 3: Verify, review, merge, and deploy the maintenance change

**Files:**

- Verify: all tracked production, test, workflow, plan, and specification files
- Verify live: `https://whizher.github.io/our-tiny-universe/`

**Interfaces:**

- Consumes: committed Task 1 and Task 2 behavior
- Produces: reviewed pull request, successful Pages deployment, and live circular 50%-volume soundtrack control

- [ ] **Step 1: Run the complete committed verification matrix**

Start from a clean tracked worktree and run:

~~~bash
git status --short
git diff --check
node --test tests/*.test.mjs
node scripts/validate.mjs
node scripts/build-site.mjs
find _site -type f -printf '%P\n' | sort
cmp index.html _site/index.html
cmp styles.css _site/styles.css
cmp script.js _site/script.js
cmp src/time.mjs _site/src/time.mjs
cmp src/content.mjs _site/src/content.mjs
cmp src/audio.mjs _site/src/audio.mjs
cmp assets/favicon.svg _site/assets/favicon.svg
cmp assets/lunar-drive.opus _site/assets/lunar-drive.opus
cmp assets/social-preview.png _site/assets/social-preview.png
sha256sum assets/lunar-drive.opus _site/assets/lunar-drive.opus
git diff --exit-code
git diff --cached --exit-code
~~~

Expected:

- initial `git status --short` is empty;
- every test passes with zero failures;
- validator and build emit their exact success lines;
- the inventory contains exactly the ten Task 2 files;
- every `cmp` exits zero;
- both Opus hashes equal
  `ba8d55ed26addb68ea68ca4703b96aeee665d429981495db3aee272e04081765`;
- both tracked diff checks exit zero.

- [ ] **Step 2: Run a cleanup-safe local HTTP smoke check**

~~~bash
set -e
python3 -m http.server 4173 --directory _site \
  >/tmp/otu-compact-soundtrack-http.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
curl --fail --silent --show-error --retry 10 --retry-connrefused \
  --retry-delay 1 http://127.0.0.1:4173/ >/dev/null
curl --fail --silent --show-error \
  http://127.0.0.1:4173/styles.css >/dev/null
curl --fail --silent --show-error \
  http://127.0.0.1:4173/src/audio.mjs >/dev/null
curl --fail --silent --show-error \
  http://127.0.0.1:4173/assets/lunar-drive.opus >/dev/null
kill "$server_pid"
wait "$server_pid" 2>/dev/null || true
trap - EXIT
~~~

Expected: all four requests return successfully and the explicit server is
stopped even if a request fails.

- [ ] **Step 3: Perform a focused maintenance review**

Review `git diff origin/main...HEAD` and verify each item directly:

- only the seven planned source/test files and the two design/plan documents changed;
- default volume is exactly `0.5`, while the injected-volume API and range guard are unchanged;
- all six UI states match the approved icon/label/pressed/status table;
- initial HTML is icon-only, has `aria-label="Play soundtrack"`, and has no autoplay;
- button geometry is exactly 3 rem square and circular;
- status width is capped at 16 rem and viewport width minus 1.5 rem;
- focus, hover, safe-area positioning, and the existing two audio channels remain;
- no remote URL, dependency, new asset, analytics code, private content, or unrelated refactor entered the diff.

If the review finds a functional or accessibility defect, add a deterministic
failing regression test first, observe RED, make the smallest fix, rerun the
complete Task 3 matrix, and create one focused fix commit.

- [ ] **Step 4: Push and open the focused pull request**

Record the exact reviewed head and push it:

~~~bash
reviewed_head=$(git rev-parse HEAD)
git push -u origin feature/compact-soundtrack-control
~~~

Then call the installed GitHub connector's
`mcp__codex_apps__github_create_pull_request` operation with:

~~~json
{
  "repository_full_name": "whizher/our-tiny-universe",
  "base": "main",
  "head": "feature/compact-soundtrack-control",
  "title": "Compact the soundtrack control",
  "body": "Replaces the wide soundtrack pill with an accessible 48 × 48 circular state button and raises the default crossfade target from 30% to 50%. Playback remains opt-in; the soundtrack asset, five-second crossfade, lifecycle behavior, dependencies, and ten-file production boundary are unchanged. Includes focused state/accessibility/layout tests plus a green full suite, validator, build, artifact, hash, and HTTP smoke matrix. No private chats or photos are included.",
  "draft": false,
  "maintainer_can_modify": true
}
~~~

Record the returned pull-request number and URL. Do not mention or combine the
pending visitor analytics branch.

- [ ] **Step 5: Confirm the pull-request head and merge only the reviewed commit**

The repository's Pages workflow is intentionally push-only on `main`, so there
is no pull-request workflow to wait for. The local verification matrix and
focused review above are the pre-merge gates.

Call `mcp__codex_apps__github_get_pr_info` with the recorded pull-request
number:

~~~json
{
  "repository_full_name": "whizher/our-tiny-universe",
  "pr_number": 0
}
~~~

Replace `0` with the returned number. Confirm the response reports an open PR,
base branch `main`, head branch `feature/compact-soundtrack-control`, and head
SHA exactly equal to `reviewed_head`. If any value differs, stop without
merging and investigate.

With that equality established, call
`mcp__codex_apps__github_merge_pull_request`:

~~~json
{
  "repository_full_name": "whizher/our-tiny-universe",
  "pr_number": 0,
  "expected_head_sha": "REVIEWED_HEAD_SHA",
  "merge_method": "squash",
  "commit_title": "Compact the soundtrack control"
}
~~~

Replace `0` and `REVIEWED_HEAD_SHA` with the recorded values. Expected: the
squash merge succeeds. Record the returned merge commit SHA. If the connector
rejects the merge, reports a conflict, or returns a different head, stop and
investigate rather than bypassing the gate.

- [ ] **Step 6: Wait for the main Pages deployment**

Because Pages runs only after the merge reaches `main`, poll the official
GitHub Actions REST endpoint for this exact merge SHA using internet access:

~~~text
https://api.github.com/repos/whizher/our-tiny-universe/actions/workflows/pages.yml/runs?branch=main&event=push&head_sha=MERGE_SHA&per_page=10
~~~

Replace `MERGE_SHA` with the returned squash-merge SHA. Poll for up to 12
attempts with a five-second interval until exactly one matching run is visible
and `workflow_runs[0].status` is `completed`. Confirm
`workflow_runs[0].head_sha` equals the merge SHA and
`workflow_runs[0].conclusion` is `success`, then record its `html_url` as the
Pages run URL. If the run concludes with any other result or no matching run
appears within the bounded window, stop and report the deployment as pending
or failed; do not claim the live site is updated.

- [ ] **Step 7: Verify the live site**

Open `https://whizher.github.io/our-tiny-universe/` in a narrow mobile viewport
and verify:

1. the control is a circular button at the lower right and the hint bubble is readable without horizontal scrolling;
2. initial icon/label is `🎵` / `Play soundtrack` and no audio starts automatically;
3. pressing it produces `⏸` / `Pause soundtrack` and audible playback near the requested 50% media-element target;
4. pausing produces `▶` / `Resume soundtrack`, and resuming returns to `⏸`;
5. a blocked playback attempt produces `↻` / `Retry soundtrack` with the approved error text;
6. keyboard focus remains visible and the same button retains focus through state changes;
7. the two channels still crossfade and loop without a gap;
8. relationship counters, transmissions, anti-cringe, sharing, shooting stars, reduced motion, and the rest of the page still work;
9. the console has no site-origin error;
10. the live source contains no remote player, analytics addition, private chat, photo, or new media.

If a live blocker appears, do not call the deployment complete. Reproduce it
locally, create a failing test, fix on a dedicated branch, and repeat the
review/check/deployment gates.

## Completion Evidence

Return a concise handoff containing:

- feature branch and final pre-merge commit SHA;
- total passing test count;
- validator and build success lines;
- exact ten-file inventory and matching Opus hashes;
- focused review verdict;
- pull-request URL, squash-merge SHA, Pages run URL, and live smoke verdict;
- confirmation that default target volume is `0.5`, playback remains opt-in,
  and no private chats or photos were added.
