# GitHub Actions Runtime Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the safe GitHub Pages Action pins to maintained Node-24-compatible immutable commits without changing site behavior, project Node 22, privacy controls, soundtrack behavior, or the exact 10-file production artifact.

**Architecture:** Preserve the existing single Pages workflow and its exact test → validate → build → configure → upload → deploy sequence. Change only four immutable Action references plus their regression expectations in `tests/content.test.mjs`; keep setup-node and all application/runtime files untouched.

**Tech Stack:** GitHub Actions YAML, Node.js 22, Node built-in test runner, existing repository validator and deterministic build scripts.

**Spec:** `docs/superpowers/specs/2026-08-23-actions-runtime-maintenance-design.md`

## Global Constraints

- Keep project runtime `node-version: 22`.
- Keep `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` unchanged.
- Pin every changed Action to an exact 40-character SHA, never a mutable tag.
- Target pins:
  - `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (`v7.0.1`, Node 24).
  - `actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d` (`v6`, Node 24).
  - `actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9` (`v5`, composite; transitively pins `actions/upload-artifact@bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`).
  - `actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` (`v5`, Node 24).
- Keep Pages triggers limited to pushes to `main` plus `workflow_dispatch`.
- Keep workflow permissions exactly `contents: read`, `pages: write`, and `id-token: write`.
- Keep the current single-job architecture, `github-pages` environment, 10-minute timeout, concurrency, `_site` path, and test/validate/build/deploy order.
- Keep `assets/has-to-be.opus` byte-identical with SHA-256 `d5fc2e189524fb8228651bc733555a327e9fe2f516fed6c7872f1bfe345a1d5e`.
- Keep default soundtrack target volume at 50%, manual opt-in playback, and the five-second equal-power crossfade unchanged.
- Keep the production build exactly the existing 10 approved public files.
- Do not change HTML, CSS, application JavaScript, content, audio controller, validator policy, build logic, package metadata, or public assets.
- Open an unmerged PR and do not merge without explicit user approval.

---

### Task 1: Move immutable-pin regression expectations to the approved maintenance SHAs

**Files:**
- Modify: `tests/content.test.mjs`
- Read only: `.github/workflows/pages.yml`
- Read only: `tests/build.test.mjs`

**Interfaces:**
- Consumes: existing test `Pages workflow pins every external action to an approved immutable commit`.
- Produces: a failing regression test that requires the four new Action SHAs while preserving setup-node v4.

- [ ] **Step 1: Replace only the approved Action map in the existing workflow-pin test**

Use this exact map:

```js
const approved = new Map([
  ["actions/checkout", "3d3c42e5aac5ba805825da76410c181273ba90b1"],
  ["actions/setup-node", "49933ea5288caeca8642d1e84afbd3f7d6820020"],
  ["actions/configure-pages", "45bfe0192ca1faeb007ade9deae92b16b8254a0d"],
  ["actions/upload-pages-artifact", "fc324d3547104276b827a68afc52ff2a11cc49c9"],
  ["actions/deploy-pages", "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128"],
]);
```

Do not change content pools, shooting-star tests, soundtrack tests, validator tests, or any other application assertions.

- [ ] **Step 2: Run the focused test file and verify RED**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: FAIL only on the Pages immutable-pin test because `.github/workflows/pages.yml` still contains the old Action SHAs; unrelated content tests should pass.

- [ ] **Step 3: Commit the RED test change**

```bash
git add tests/content.test.mjs
git commit -m "test: require maintained Pages action pins"
```

---

### Task 2: Refresh the Pages workflow Action pins without altering workflow behavior

**Files:**
- Modify: `.github/workflows/pages.yml`
- Test: `tests/content.test.mjs`

**Interfaces:**
- Consumes: exact Action SHAs required by Task 1.
- Produces: behavior-identical Pages workflow with maintained Action runtimes.

- [ ] **Step 1: Replace checkout**

Change the checkout step to:

```yaml
uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

- [ ] **Step 2: Keep setup-node and project Node version unchanged**

Confirm this remains exactly:

```yaml
uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
with:
  node-version: 22
```

- [ ] **Step 3: Replace configure-pages**

Use:

```yaml
uses: actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d # v6
```

- [ ] **Step 4: Replace upload-pages-artifact**

Use:

```yaml
uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5
with:
  path: _site
```

- [ ] **Step 5: Replace deploy-pages**

Use:

```yaml
uses: actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128 # v5
```

Do not change triggers, permissions, environment, timeout, concurrency, shell commands, step ordering, or artifact path.

- [ ] **Step 6: Run the focused immutable-pin test and verify GREEN**

Run:

```bash
node --test tests/content.test.mjs
```

Expected: all tests in `tests/content.test.mjs` PASS.

- [ ] **Step 7: Commit the workflow migration**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: refresh Pages action runtimes"
```

---

### Task 3: Run full application, privacy, soundtrack, and deterministic-build verification

**Files:**
- Read only: all runtime/test/build/validator files and assets
- Generated only: `_site/` (must not be committed)

**Interfaces:**
- Consumes: migrated Pages workflow and updated immutable-pin test.
- Produces: evidence that workflow maintenance did not alter application behavior or public artifact bytes.

- [ ] **Step 1: Run the complete Node test suite**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: all tests PASS, including controller, soundtrack, sharing, content, timing, validator policy, build boundary, reduced-motion, and immutable Action pin tests.

- [ ] **Step 2: Run repository validation**

Run:

```bash
node scripts/validate.mjs
```

Expected:

```text
Validated 8 runtime files.
```

- [ ] **Step 3: Run deterministic production build**

Run:

```bash
node scripts/build-site.mjs
```

Expected: successful build with exactly the approved production boundary.

- [ ] **Step 4: Verify exact 10-file artifact inventory**

Run:

```bash
find _site -type f -print | sort
```

Expected exactly:

```text
_site/.nojekyll
_site/assets/favicon.svg
_site/assets/has-to-be.opus
_site/assets/social-preview.png
_site/index.html
_site/script.js
_site/src/audio.mjs
_site/src/content.mjs
_site/src/time.mjs
_site/styles.css
```

- [ ] **Step 5: Verify byte equality for built source copies**

Run:

```bash
cmp index.html _site/index.html
cmp styles.css _site/styles.css
cmp script.js _site/script.js
cmp src/audio.mjs _site/src/audio.mjs
cmp src/content.mjs _site/src/content.mjs
cmp src/time.mjs _site/src/time.mjs
cmp assets/favicon.svg _site/assets/favicon.svg
cmp assets/social-preview.png _site/assets/social-preview.png
cmp assets/has-to-be.opus _site/assets/has-to-be.opus
```

Expected: every command exits 0 with no output.

- [ ] **Step 6: Recompute soundtrack digest**

Run:

```bash
sha256sum assets/has-to-be.opus _site/assets/has-to-be.opus
```

Expected both lines to report:

```text
d5fc2e189524fb8228651bc733555a327e9fe2f516fed6c7872f1bfe345a1d5e
```

- [ ] **Step 7: Verify soundtrack controller defaults remain unchanged through existing tests**

Run:

```bash
node --test tests/controller.test.mjs tests/audio.test.mjs
```

Expected: PASS, including 50% target-volume and five-second crossfade assertions.

- [ ] **Step 8: Confirm the final diff is maintenance-only**

Run:

```bash
git diff --check main...HEAD
git diff --name-only main...HEAD
```

Expected changed paths are limited to:

```text
.github/workflows/pages.yml
docs/superpowers/plans/2026-08-23-actions-runtime-maintenance.md
docs/superpowers/specs/2026-08-23-actions-runtime-maintenance-design.md
tests/content.test.mjs
```

`tests/build.test.mjs` is verification-only and should remain unchanged.

- [ ] **Step 9: Commit only if verification produced an intentional tracked correction**

Normally no commit is expected here. If verification reveals a necessary change outside the four listed maintenance paths, stop and re-scope instead of bundling it.

---

### Task 4: Open the unmerged maintenance PR and verify safe branch behavior

**Files:**
- No additional repository file changes expected.

**Interfaces:**
- Consumes: fully verified maintenance branch.
- Produces: an unmerged PR ready for explicit user approval.

- [ ] **Step 1: Recompare branch to `main`**

Run:

```bash
git log --oneline --decorate main..HEAD
git diff --stat main...HEAD
```

Expected: only the approved workflow/test/spec/plan maintenance changes.

- [ ] **Step 2: Open the pull request**

Use title:

```text
Refresh GitHub Pages Action runtimes
```

PR body must list all four new immutable SHAs, explicitly state setup-node and project Node 22 remain unchanged, state no site/runtime/audio assets changed, and include full tests/validator/build/artifact/hash verification evidence.

- [ ] **Step 3: Do not dispatch the production Pages workflow on the feature branch merely for validation**

The production workflow is intentionally main-only/manual and has deployment permissions. Use the repository's local/full verification evidence plus PR diff review; do not weaken the trigger policy or create temporary workflow changes unless execution discovers a genuine verification blocker and the user approves a re-scope.

- [ ] **Step 4: Leave the PR unmerged**

Do not merge. Report the PR number, head SHA, exact changed-file scope, verification results, and the one intentionally retained maintenance item: setup-node v4 remains pinned until a suitable patched maintained release is selected.
