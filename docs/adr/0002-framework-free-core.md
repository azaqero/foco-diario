# ADR 0002 — Framework-free core with composition roots in the entrypoints

- **Status**: accepted
- **Date**: 2026-11-10

## Context

The product core (extraction, text cleaning, edition assembly and rendering) must
be distributable as open source while coexisting with private capabilities added
by composition. It must also be testable without a browser: most of the logic is
data transformation, not browser APIs.

If the core imports WXT or extension APIs, it becomes bound to the framework,
cannot be tested in Node, and blurs the line between open and private code.

## Decision

- `src/core/*` imports neither WXT nor extension APIs. Standard DOM and pure
  functions only.
- `entrypoints/*` are **composition roots**: they read the browser environment
  and wire adapter, harvest, ordering and render. They hold no product logic.
- The only boundary to extension persistence APIs is `src/shared/storage.ts`,
  behind the `KeyValueStore` interface.
- Optional capabilities are injected by composition; the core never imports
  private code.

## Consequences

**Gains**

- The core is tested with vitest + jsdom or plain Node, without loading the
  extension.
- The engine does not depend on the current framework; replacing WXT touches only
  the entrypoints.
- The open/private split is structural, not a license `if`.
- Entrypoints stay small and readable as a map of the system.

**Costs**

- Discipline must be maintained: a WXT import inside `src/core` breaks the rule
  even if it compiles. It is checked in review and can be automated with a lint
  rule once the project adopts one.
- Some operations (scroll harvest, expanding "see more") depend on the live DOM;
  they are covered with fixtures and visual verification stays manual.

## Alternatives considered

- **Import WXT in the core**: more direct, but couples the engine to the
  framework and blocks Node tests.
- **A monolithic content script**: that was the MVP; it does not scale when
  cache, licensing and advertising arrive.
