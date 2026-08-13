# Actions Supply-Chain Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mutable GitHub Action major-version tags with approved immutable commit SHAs while preserving the existing Pages deployment behavior and adding a regression test that prevents tag-based Actions from returning.

**Architecture:** Keep the existing single Pages workflow unchanged except for the `uses:` references. Add one focused repository-policy assertion to the existing, compact `tests/content.test.mjs` file so the connected GitHub whole-file writer can make the change safely; the test reads the workflow as text, verifies the exact approved action-to-SHA mapping, and requires every external Action reference to be a 40-character lowercase hexadecimal commit SHA.

**Tech Stack:** GitHub Actions YAML, Node.js 22, Node built-in test runner, existing repository validator/build scripts.

## Global Constraints

- Only `.github/workflows/pages.yml` and `tests/content.test.mjs` change during implementation; the approved spec and this plan remain documentation-only additions.
- Preserve `push` to `main` and `workflow_dispatch` triggers.
- Preserve permissions exactly: `contents: read`, `pages: write`, `id-token: write`.
- Preserve step order: checkout -> setup Node -> tests -> validator -> build -> configure Pages -> upload artifact -> deploy.
- Preserve Node version `22` and job timeout `10` minutes.
- Preserve current Action major versions; do not upgrade them.
- Approved immutable pins:
  - `actions/checkout` -> `d23441a48e516b6c34aea4fa41551a30e30af803` (`v6`)
  - `actions/setup-node` -> `49933ea5288caeca8642d1e84afbd3f7d6820020` (`v4`)
  - `actions/configure-pages` -> `983d7736d9b0ae728b81ab479565c72886d7745b` (`v5`)
  - `actions/upload-pages-artifact` -> `7b1f4a764d45c48632c6b24a0339c27f5614fb0b` (`v4`)
  - `actions/deploy-pages` -> `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` (`v4`)
- Do not change runtime JavaScript, HTML, CSS, assets, content, storage, analytics, networking, or dependencies.
- Do not merge the resulting PR without explicit user approval.

---

### Task 1: Enforce and apply immutable GitHub Action pins

**Files:**
- Modify: `tests/content.test.mjs`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: the existing Pages workflow and Node built-in test runner.
- Produces: a regression test named `Pages workflow pins every external action to an approved immutable commit` and a Pages workflow whose five `uses:` entries are pinned to the approved SHAs above.

- [ ] **Step 1: Add the failing workflow-pin regression test**

Add this import near the top of `tests/content.test.mjs`:

```js
import { readFile } from "node:fs/promises";
```

Append this test:

```js
test("Pages workflow pins every external action to an approved immutable commit", async () => {
  const workflow = await readFile(".github/workflows/pages.yml", "utf8");
  const approved = new Map([
    ["actions/checkout", "d23441a48e516b6c34aea4fa41551a30e30af803"],
    ["actions/setup-node", "49933ea5288caeca8642d1e84afbd3f7d6820020"],
    ["actions/configure-pages", "983d7736d9b0ae728b81ab479565c72886d7745b"],
    ["actions/upload-pages-artifact", "7b1f4a764d45c48632c6b24a0339c27f5614fb0b"],
    ["actions/deploy-pages", "d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e"],
  ]);
  const uses = [
    ...workflow.matchAll(/^\s*uses:\s+([^@\s]+)@([^\s#]+)(?:\s+#.*)?$/gm),
  ];

  assert.equal(uses.length, approved.size);
  assert.deepEqual(
    new Set(uses.map(([, action]) => action)),
    new Set(approved.keys()),
  );
  for (const [, action, ref] of uses) {
    assert.match(ref, /^[0-9a-f]{40}$/);
    assert.equal(ref, approved.get(action));
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails on the current mutable tags**

Run:

```bash
node --test --test-name-pattern="Pages workflow pins every external action" tests/content.test.mjs
```

Expected: FAIL because the current workflow references `@v6`, `@v4`, and `@v5` rather than the approved 40-character SHAs.

- [ ] **Step 3: Replace only the five mutable `uses:` references**

Change the action references in `.github/workflows/pages.yml` to exactly:

```yaml
      - name: Checkout
        uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6

      - name: Setup Node
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 22
```

and later in the same workflow:

```yaml
      - name: Configure Pages
        uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b # v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b # v4
        with:
          path: _site

      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4
```

Do not alter triggers, permissions, concurrency, environment, timeout, commands, or step order.

- [ ] **Step 4: Run the focused regression test and verify it passes**

Run:

```bash
node --test --test-name-pattern="Pages workflow pins every external action" tests/content.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run the complete repository test suite**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: all tests pass; the previous 145-test suite grows to 146 tests because of the new workflow-pin regression test.

- [ ] **Step 6: Run the existing runtime-policy validator**

Run:

```bash
node scripts/validate.mjs
```

Expected:

```text
Validated 8 runtime files.
```

- [ ] **Step 7: Build and prove runtime output is unchanged**

Run:

```bash
node scripts/build-site.mjs
cmp index.html _site/index.html
cmp styles.css _site/styles.css
cmp script.js _site/script.js
cmp src/time.mjs _site/src/time.mjs
cmp src/content.mjs _site/src/content.mjs
cmp src/audio.mjs _site/src/audio.mjs
```

Expected: build succeeds and every `cmp` exits `0` with no output.

- [ ] **Step 8: Review the implementation diff for scope**

Run:

```bash
git diff -- .github/workflows/pages.yml tests/content.test.mjs
```

Expected: only one new regression test plus its `readFile` import and five action-reference substitutions with human-readable major-version comments.

- [ ] **Step 9: Commit the implementation**

```bash
git add .github/workflows/pages.yml tests/content.test.mjs
git commit -m "ci: pin GitHub Actions to immutable commits"
```

- [ ] **Step 10: Open a PR without merging**

Open a PR from `security/pin-actions` to `main` titled:

```text
Pin GitHub Actions to immutable commits
```

The PR body must state the exact five pins, that application/runtime behavior is unchanged, and the results of the 146-test suite, validator, build, and byte-comparison checks. Stop before merge and wait for explicit user approval.
