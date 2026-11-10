# ADR 0004 — Vitest + jsdom and parity checks during migrations

- **Status**: accepted
- **Date**: 2026-11-10

## Context

Most of the product risk sits in the text logic (normalization, cleaning,
de-shouting, headlines) and in the render structure. That logic does not need a
browser to be verified. At the same time, the migration to WXT changed packaging
without intending to change behavior: evidence of parity was needed, not just
"it compiles".

## Decision

- **Vitest + jsdom** as the testing base. `clean.ts` is tested as pure functions;
  `extract.ts` and `render.ts` with DOM fixtures.
- Tests encode the product's **documented rules** (toggles, URLs, CTAs, decimals,
  casing, headlines), not implementation details.
- Behavior migrations use a **temporary differential harness**: load the previous
  implementation and compare its output against the new one over a corpus. It is
  not committed because it depends on git history.
- **Node 26 LTS** and **jsdom 31** as the baseline, declared in `engines` and
  `devDependencies`.

## Consequences

**Gains**

- Fast, deterministic suite with no browsers and no network.
- Product rules are written down and executable.
- Migration parity is demonstrated with reproducible evidence during the
  migration window.

**Costs**

- jsdom performs no layout and applies no CSS: visual verification stays manual.
- The differential harness is not a permanent test; if needed again, it is
  rebuilt against the reference commit.
- Render tests validate structure, not appearance.

## Alternatives considered

- **Playwright end-to-end**: more faithful, but it needs browsers and a test site;
  it can be added later for the full flow.
- **Snapshots only**: brittle against cosmetic changes and carries no explicit
  intent.
- **No tests**: the text pipeline has too many rules to maintain by hand.
