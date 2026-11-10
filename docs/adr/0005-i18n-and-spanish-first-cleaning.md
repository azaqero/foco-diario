# ADR 0005 — Localized UI, Spanish-first content cleaning

- **Status**: accepted
- **Date**: 2026-11-10

## Context

The product targets the Facebook home feed of Spanish-speaking users: the text
cleaning rules (calls to action, month names, relative dates, de-shouting and
headline casing) are built from Spanish-language posts. At the same time, the
extension UI is shown inside a browser whose interface language may be anything,
and the project will ship publicly.

Hardcoding UI strings in Spanish would impose the product language on every user.
Localizing the content rules would multiply the maintenance surface before there
is a single user.

## Decision

1. **Localize the UI** with the MV3 i18n catalog:
   `public/_locales/<locale>/messages.json`, `default_locale: "es"`, and
   `browser.i18n.getMessage` accessed through `src/shared/i18n.ts`.
2. **Inject copy as data**: `render()` receives a `PaperCopy` object. The core
   never imports the i18n API, preserving the framework-free boundary.
3. **Spanish-first content rules**: keep the extraction and cleaning pipeline
   optimized for Spanish posts. Ship `es` as the default locale and `en` as an
   alternative for the UI shell. Only the "Ver más"/"See more" toggles are
   bilingual.
4. A locale test enforces identical key sets across catalogs.

## Consequences

**Gains**

- The UI follows the browser language without touching product logic.
- Adding a language is adding a JSON file; no engine changes.
- The Spanish-first scope is explicit, so users know what to expect.
- The core stays testable: tests pass copy fixtures instead of reading a catalog.

**Costs**

- Two sources of truth for user-visible text (catalog + `DEFAULT_COPY` fallback),
  kept honest by the key-set test.
- English posts get less aggressive cleaning until per-language rules exist.
- Manifest strings depend on the catalog; a missing key falls back to the raw
  `__MSG_` placeholder.

## Alternatives considered

- **Hardcoded Spanish UI**: simpler, but wrong for non-Spanish browsers.
- **Localize content rules now**: high cost and no demand yet; deferred.
- **`@wxt-dev/i18n` module**: convenient, but the built-in catalog plus
  `browser.i18n` covers the need with no extra dependency.
