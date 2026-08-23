# GitHub Actions Runtime Maintenance Design

**Date:** 2026-08-23

## Goal

Refresh the repository's pinned GitHub Actions to maintained Node-24-compatible releases where that can be done safely, while preserving the existing site behavior, Node 22 project runtime, privacy-bounded build, soundtrack behavior, and explicit merge approval gate.

## Current state

The production Pages workflow pins external Actions to immutable commits and currently uses `actions/checkout` v6, `actions/setup-node` v4, `actions/configure-pages` v5, `actions/upload-pages-artifact` v4, and `actions/deploy-pages` v4. GitHub-hosted runners now emit Node 20 deprecation warnings for several of those Action runtimes.

The application itself remains dependency-free and runs its tests/build under Node 22. The current workflow has a single deployment job with the existing approved permissions and behavior; this maintenance pass must not restructure application behavior or the site build.

## Scope

Update only the Action pins that have a maintained Node-24-compatible upstream generation and can be verified before pinning:

- `actions/checkout`: move from the current v6 commit to a verified immutable commit from the maintained v7 line.
- `actions/configure-pages`: move from the current v5 commit to a verified immutable commit whose `action.yml` uses Node 24.
- `actions/upload-pages-artifact`: move from the current v4 commit to a verified immutable commit from the maintained Node-24-compatible line and verify its transitive `actions/upload-artifact` dependency is current.
- `actions/deploy-pages`: move from the current v4 commit to a verified immutable commit whose `action.yml` uses Node 24.

Do **not** update `actions/setup-node` in this maintenance change. Keep the current immutable v4 pin until a maintained upstream release is verified to include the relevant dependency/security fixes while using the desired runtime. The project runtime remains `node-version: 22` regardless of Action-runtime generations.

## Pin-selection policy

Implementation must resolve each selected upstream Action to an exact 40-character commit SHA, never a mutable tag. Before editing this repository, verify the selected upstream commit corresponds to the intended maintained release/generation and inspect upstream `action.yml` or release-commit evidence for its runtime behavior.

The current maintenance investigation has already identified viable upstream candidates, including checkout v7.0.1 and Node-24 migrations in configure-pages and deploy-pages. The implementation plan must re-resolve and record the exact final SHAs immediately before editing so the PR does not rely on stale discovery data.

## Files expected to change

- `.github/workflows/pages.yml` — checkout/configure-pages/upload-pages-artifact/deploy-pages pins only; setup-node, Node 22, triggers, permissions, timeout, concurrency, artifact path, deployment environment, test/validate/build order, and deployment semantics remain unchanged.
- `tests/build.test.mjs` — update immutable-pin regression expectations and, where useful, preserve assertions for the existing workflow behavior.
- This design document and the later implementation plan.

No HTML, CSS, application JavaScript, content, audio controller, soundtrack asset, validator policy, build script, package metadata, or public asset should change unless verification reveals a maintenance blocker. If hidden complexity appears, stop and re-scope rather than bundling unrelated changes.

## Security and behavior invariants

- Production deployment remains limited to pushes to `main` and manual dispatch.
- Existing workflow permissions remain unchanged: `contents: read`, `pages: write`, and `id-token: write`.
- Node 22 remains the project test/build runtime.
- Tests, repository validation, deterministic build, Pages configuration, artifact upload, and deploy keep the current ordering.
- The `_site` artifact remains exactly the existing 10 approved public files.
- `assets/has-to-be.opus` remains byte-identical and SHA-256 pinned by the existing repository validator.
- Default soundtrack target volume remains 50%, manual playback remains opt-in, and the five-second equal-power crossfade remains unchanged.
- No analytics, storage, tracking, external runtime requests, content edits, or unrelated UI changes.
- All third-party Actions remain immutable-SHA pinned.

## Verification

Use TDD for the pin-regression change: first update/add expectations so they fail against the old pins, then update the workflow pins to make them pass.

Before opening the PR, run all Node tests, `node scripts/validate.mjs`, and `node scripts/build-site.mjs`. Verify the exact 10-file `_site` inventory, byte equality for built source copies, and byte-identical soundtrack copy with the already pinned soundtrack SHA. Review the final diff to ensure only workflow/test/spec/plan maintenance files changed.

After a separately approved merge, verify the Pages run on the exact merge SHA through tests, validator, build, artifact upload, and deployment. Confirm exactly one `github-pages` artifact and successful live deployment. A quick live smoke test should confirm the site renders and the optional soundtrack still plays/pauses/resumes normally.

## Separate housekeeping findings

The old feature/security branches associated with already-completed work are stale cleanup candidates, including branches for v1.1, the original soundtrack, compact soundtrack control, expanded transmissions, Transmission Deck v2, shooting stars, Action pinning, and the Has to Be replacement. The closed Copilot PR #6 branch is also superseded by the subsequently merged documentation correction. `main` is currently unprotected.

Branch deletion and branch-protection/ruleset changes are intentionally separate from this PR because they are repository-administration operations and the current connector does not expose the required safe write controls.

## Merge gate

Open the implementation as an unmerged pull request. Do not merge without explicit user approval.