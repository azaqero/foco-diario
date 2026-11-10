# Contributing

This is a small project. Keep changes focused, reviewable and covered by tests.

## Requirements

- Node 26 (see `.nvmrc`): `nvm use`
- npm

## Setup

```bash
npm install
npm run dev      # Chrome with the extension loaded, HMR for the content script
```

### Dependency install scripts

npm 11.20+ blocks dependency install scripts by default. A package that needs one
must be approved in `package.json` under `allowScripts` — `esbuild` is already
approved because Vite and WXT depend on it:

```bash
npm install-scripts ls                 # list unreviewed scripts
npm install-scripts approve <pkg>      # add the approval
```

Commit the resulting `package.json` change so a fresh `npm ci` behaves the same
for everyone. Without the entry, the script is skipped and npm only prints a
warning.

## Before opening a change

```bash
npm test
npm run compile
npm run build
```

## Architecture rules

These are documented in [`docs/adr/`](docs/adr/README.md):

- `src/core/*` must not import WXT or extension APIs.
- Network calls belong in `entrypoints/background.ts`, never in the content script.
- Adapters are data (`src/core/adapter/`), not render code. Fixing a network means
  editing selectors, not the engine.
- The renderer receives localized copy as plain data; it never reads `browser.i18n`.

## Internationalization

UI strings live in `public/_locales/<locale>/messages.json`. Add every new key to
all locales; `tests/locales.test.ts` enforces identical key sets and no empty
messages. Spanish is the default locale.

Content cleaning is **Spanish-first** (calls to action, month names, relative dates,
de-shouting). Read ADR 0005 before changing those rules.

## Tests

- Pure logic in `src/core`: unit tests.
- DOM behavior: jsdom fixtures.
- Add a test for each behavior change and keep existing rules covered.
- Tests encode documented behavior, not implementation quirks.

## Commits and pull requests

- Use Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `build:`, `chore:`.
- Prefer one reviewable work unit per commit: code, tests and docs together.
- Keep diffs scoped; avoid drive-by refactors.
- No AI attribution or co-author trailers.

## Language

- Code, comments, documentation and commit messages: English.
- UI copy and test fixtures: Spanish, because the product targets Spanish-language
  Facebook posts. This is a product decision, not a translation gap.

## Decisions

Architectural decisions are recorded as ADRs in [`docs/adr/`](docs/adr/README.md).
Use `template.md`, number them sequentially, write them in English and keep them
free of internal notes and personal data.

## License

The project is MIT licensed. By contributing you agree that your changes are
released under the same license.
