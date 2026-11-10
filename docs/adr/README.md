# Architecture Decision Records

Record of the project's architecture decisions. Each ADR documents the context,
the decision and its consequences at the time it was made; it is not rewritten
when the code changes. If a decision is reversed, a new ADR that supersedes it is
added.

## Format

Simplified MADR:

- **Status**: proposed · accepted · superseded by ADR-NNNN · deprecated
- **Date**: `YYYY-MM-DD`
- **Context**: the problem and its constraints
- **Decision**: what was chosen
- **Consequences**: what is gained, what is lost, what remains open
- **Alternatives**: what was discarded and why

Template: [`template.md`](./template.md).

## Index

| ADR | Decision | Status |
|---|---|---|
| [0001](./0001-wxt-and-typescript.md) | WXT + TypeScript as the extension foundation | accepted |
| [0002](./0002-framework-free-core.md) | Framework-free core with composition roots in the entrypoints | accepted |
| [0003](./0003-adapter-as-data.md) | Adapter as data, own renderer and fail-closed behavior | accepted |
| [0004](./0004-testing-strategy.md) | Vitest + jsdom and parity checks during migrations | accepted |
| [0005](./0005-i18n-and-spanish-first-cleaning.md) | Localized UI with Spanish-first content cleaning | accepted |

## Scope

These documents are public material: they contain no internal notes, personal
data, credentials or commercial information.
