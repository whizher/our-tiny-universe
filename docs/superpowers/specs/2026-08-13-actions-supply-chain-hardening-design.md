# Actions Supply-Chain Hardening Design

## Goal
Reduce GitHub Actions supply-chain risk without changing application runtime behavior or the existing GitHub Pages deployment flow.

## Scope
Only `.github/workflows/pages.yml` will change at implementation time. Existing action major versions will be preserved and replaced with immutable full commit SHAs resolved from the corresponding upstream GitHub tags on 2026-08-13:

- `actions/checkout@v6` -> `d23441a48e516b6c34aea4fa41551a30e30af803`
- `actions/setup-node@v4` -> `49933ea5288caeca8642d1e84afbd3f7d6820020`
- `actions/configure-pages@v5` -> `983d7736d9b0ae728b81ab479565c72886d7745b`
- `actions/upload-pages-artifact@v4` -> `7b1f4a764d45c48632c6b24a0339c27f5614fb0b`
- `actions/deploy-pages@v4` -> `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e`

Human-readable comments may retain the major tag next to each SHA so future maintenance is understandable.

## Invariants
- Push-to-`main` and manual dispatch behavior remain unchanged.
- Existing least-privilege permissions remain unchanged: `contents: read`, `pages: write`, `id-token: write`.
- Existing test, validation, build, artifact, and deploy steps remain in the same order.
- No runtime JavaScript, CSS, HTML, assets, storage, analytics, networking, or content changes.
- No dependency installation is introduced.

## Verification
The branch must pass the repository's normal checks after pinning:

1. `node --test tests/*.test.mjs`
2. `node scripts/validate.mjs`
3. `node scripts/build-site.mjs`
4. Compare source and built runtime copies where applicable.
5. Confirm the workflow diff contains only action-reference substitutions plus optional explanatory comments.

Because the repository validator allowlists tracked paths, this design document is intentionally placed under the existing approved `docs/superpowers/specs/` convention.

## Out of Scope
- Branch protection/rulesets, because the connected GitHub tool does not expose a ruleset write operation here.
- Action major-version upgrades.
- Application security or feature changes.
