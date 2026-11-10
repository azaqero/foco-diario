# ADR 0003 — Adapter as data, own renderer and fail-closed behavior

- **Status**: accepted
- **Date**: 2026-11-10

## Context

The network's feed is virtualized: only two or three posts are mounted in the DOM
at a time. CSS classes are obfuscated and change, so selectors break often.
Additionally, the product is not meant to block the site but to replace the feed
with a finite front page. If extraction fails and the original feed is left
visible, the product does not fulfill its purpose.

## Decision

1. **Adapter as data**: selectors, home paths and harvest parameters live in
   `src/core/adapter/facebook.ts`. Fixing a network means editing that mapping,
   not the engine.
2. **Extractor separate from renderer**: `extract.ts` produces `FeedItem`;
   `render.ts` builds the front page. The renderer does not know which network
   the data came from.
3. **Scroll harvest**: push the site's real scroller and accumulate until the
   edition is complete, restoring the original position afterwards.
4. **Own DOM**: mount a container over the site and hide the native feed.
5. **Fail-closed**: with zero items, show an explicit empty state. Never fall
   back to the original feed.

## Consequences

**Gains**

- Site DOM changes are fixed in a single data file.
- The renderer is testable with fixtures and reusable for another network.
- The product keeps its finite-feed promise even when extraction fails.

**Costs**

- Harvesting has a cost (real scrolling, waits and auto-clicking "see more"); a
  cached edition is planned to mitigate it.
- It depends on the site's structure and terms of service; maintenance is
  continuous.
- The empty state becomes visible to the user when the site changes.

## Alternatives considered

- **Restyle the native DOM**: fragile and leaves engagement metrics on screen.
- **Consume an internal site API**: requires credentials, violates terms and
  breaks without notice.
- **Block the site**: a different product; this rewrites the feed instead of
  preventing access.
