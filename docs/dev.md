# Dev — Foco Diario (current state)

An MV3 extension that rewrites the Facebook home feed as a newspaper front page:
finite, text-first, grayscale and free of engagement metrics.

## Requirements

Node >= 26 (tested with 26.13.0). With nvm: `nvm use` (reads `.nvmrc`) or
`nvm install 26 && nvm alias default 26`.
The project pins `engines.node` and uses jsdom 31 for tests.

## Loading the extension (WXT)

1. `npm install`
2. `npm run dev` — WXT opens Chrome with the extension loaded and hot-reloads the
   content script on save (HMR). No need to refresh the tab.
3. Production build: `npm run build` (output in `.output/chrome-mv3`, load it as an
   unpacked extension) or `npm run zip` for the package.
4. If the manifest changes (permissions, entrypoints), reload the extension.

## Testing

`npm test` (vitest + jsdom). Covers `clean`, `extract`, `render`, the edition
`cache` and the locale catalogs. `ads` and `license` add their own tests with
their phases.

## Languages (i18n)

- UI strings live in `public/_locales/<locale>/messages.json`; the manifest sets
  `default_locale: "es"` and uses `__MSG_extName__` / `__MSG_extDescription__`.
- `src/shared/i18n.ts` reads `browser.i18n` and returns a `PaperCopy` object.
  `render()` receives that copy as plain data, so `src/core/*` never touches the
  i18n API.
- Adding a locale is adding a catalog; `tests/locales.test.ts` enforces identical
  key sets and no empty messages.
- Public copy and docs use neutral, professional Spanish: no regional verb forms
  or slang. `tests/copy-style.test.ts` guards README, docs and the locale catalogs.

**Spanish-first limitation:** the extraction and cleaning rules are optimized for
Facebook posts written in Spanish. The CTA list, month names, relative dates and
de-shouting rules are Spanish; only the "Ver más"/"See more" toggles cover
English. English posts still render, but with less aggressive cleaning. Per-language
content rules are future work.

## How it works

- **Edition cache**: the first load of a local day runs the harvest and saves the
  resulting edition in `storage.local` under `edition:{YYYY-MM-DD}:day`. Later
  loads render it directly (`getValidEdition`), with no `waitForFeed`, no scroll
  and no auto-click. Validity requires the same day, window, `schemaVersion` and
  `adapterVersion`. History is pruned to 7 days. If a fresh harvest yields zero
  items and a previous-day edition exists, that stale edition is shown with a
  notice; otherwise the empty state stays fail-closed. Images keep their signed
  URL (not re-hosted): a card photo that fails to load is dropped, the item stays.
  "Reimprimir" clears today's edition and harvests again, limited to once per day.
- **Virtualized feed**: Facebook keeps only 2–3 real posts in the DOM at a time.
  A scroll harvest pushes the real scroller (`getScrollParent` + `scrollTop +=
  chunk`) and accumulates until the edition's items are collected. An opaque
  overlay hides the scroll.
- **Auto-click "see more"**: before extracting each mounted post, its
  "Ver más"/"See more" button is clicked and the expansion is awaited so the full
  text is stored. The expanded version replaces the truncated one (same key, the
  longer text wins). The "Ver más"/"Ver menos" (See more/See less) toggles are
  removed from the text.
- **Fail-closed**: with zero items, an empty state is shown (never the original
  feed).

## Structure (WXT)

- `entrypoints/content.ts` — composition root: adapter -> harvest -> ordering -> render.
- `entrypoints/background.ts` — service worker (stub; licensing, AI and auto-update
  will live here).
- `entrypoints/options/` — options page (stub, localized).
- `public/_locales/` — UI translations (`es` default, `en`).
- `src/core/adapter/facebook.ts` — selectors, harvest and home matching.
- `src/core/clean.ts` — text pipeline (pure, no DOM).
- `src/core/extract.ts` — DOM -> `FeedItem`.
- `src/core/cache.ts` — edition cache over a key/value store (pure, no WXT).
- `src/core/render.ts` — front page + lightbox.
- `src/core/paper.css` — front page styles.
- `src/shared/` — editorial config, localized copy, i18n loader, types and
  storage wrapper.

Architecture decisions: [`adr/`](./adr/README.md).

Rule: `src/core/*` does not import WXT. It is the open (MIT) part and is tested
without a browser.

## Selectors (Facebook home, verified Nov 2026)

| Field | Selector |
|---|---|
| item | `[aria-posinset]` |
| text | `[data-ad-comet-preview="message"]` (fallback `[data-ad-preview="message"]`, `[data-ad-rendering-role="story_message"]`) |
| author | `[data-ad-rendering-role="profile_name"]` (h4; strips "Seguir/Cuenta verificada/está con…") |
| image | `img[data-imgperflogname="feedImage"]` |
| video | `video` -> thumbnail = `video.poster` |
| timestamp | `a[aria-describedby][aria-labelledby]` -> hidden div with the date |

`[role="feed"]` does not exist; `[role="article"]` only marks skeletons. `x...`
classes are obfuscated and unusable.

## Content rules

- **Text is required**; posts without text are dropped (videos/images without a
  caption).
- **No body means dropped**: if the text is only the headline (a body-less card),
  the item does not enter the front page (avoids one-line notes with no content).
- **Hashtags** are removed from headline and text; if the headline becomes empty,
  the item is dropped.
- **Decorative Unicode** is normalized (NFKC): `𝐂𝐎𝐍𝐅𝐄𝐒𝐈Ó𝐍` -> `CONFESIÓN`
  (accents preserved).
- **URLs** are removed from the text (with or without scheme: `https://…`,
  `ptv.pe/477229`).
- **CTAs** are removed ("Entérate más en…" [note/platform], "Lee la nota
  completa:", "… AQUÍ", "Conoce más/si…", "Más información en el primer
  comentario", "todos los detalles", "en Whatsapp Telegram", "wa. link/…",
  "Escríbenos…", "Sígueme…", "cobertura especial", "Solo por…").
- **Markup artifacts** are cleaned: stray pipes `|`, markdown asterisks, odd
  prefixes (`: *¡…`), dangling periods/parentheses (`..`, `(: AMD)`) and missing
  spaces after `.`/`!`/`?`/`,`/`;`/`:` (`sector.El` -> `sector. El`). Decimals
  (`3.8`) are not split as sentence ends.
- **Repeated blocks** are collapsed (duplicated headline / A+A at the end).
- **Ads** are dropped (`[data-ad-rendering-role^="cta"]` or
  "Patrocinado/Sponsored").
- **Headline**: if it is predominantly uppercase (>=60% of letters) it is
  converted to sentence case (first letter uppercase, rest lowercase); otherwise
  the original casing is preserved. It is the first sentence, capped at
  `headlineMax` (140) chars, cut on a word boundary, without "…" and never
  leaving a dangling connector ("...no", "...a", "...que"). Known limitation: in
  all-caps headlines proper nouns lose their casing ("Perú" -> "perú").
- **Byline**: author only (no date, no "Seguir/Follow/Unirte", no "está en…/está
  con…", no "Cuenta verificada"/"Meta Verified"/"transmitió en vivo" tooltips).
- **Date**: today + yesterday, preferring today, until the edition is full;
  falls back to the latest available day.
- **Body**: if predominantly uppercase it is converted to sentence case
  (capitalizing each sentence); shouted runs (2+ uppercase words) and shouted
  single words (>=6 letters) are also de-shouted. min-height ~3 lines (briefs
  clamp to 5).

## Layout

- CSS grid: 4 columns (>900px), 2 columns (<=900), 1 column (<=640).
- `maxItems`: >900px = 11, >640 = 8, <=640 = 4.
- Hero 2x2 = most recent post (ts desc); 2 secondary; briefs.
- Image only on hero/secondary; the hero uses `flex:1` on the photo to fill its
  height.
- The harvest guarantees >=3 items with an image and reorders so the first three
  slots (hero + 2 secondary) always show a photo.
- **Detail (lightbox)**: click/Enter on any post opens a modal with headline,
  byline+date, image (when present, briefs included) and the full text. Closes
  with ×, Esc or a click on the overlay. No outbound links: the newspaper is the
  final destination.

## Pending

- Video captions (VTT) to turn video into text.
- Additional networks (one front page per network).
- `git remote` / push.
