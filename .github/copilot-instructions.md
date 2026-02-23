# Daylog – Copilot Instructions

Offline-only PWA for logging daily work attendance type (office, WFH, leave, sick, public holiday). All data stored in IndexedDB on-device. No backend.

## Hard rules

- Zero runtime dependencies. Do not add npm packages.
- No frameworks. Vanilla TypeScript + DOM APIs only.
- Named exports only. Never use `export default`.
- Never use `innerHTML`. Build DOM with the `el()` helper from `src/ui/helpers.ts` and swap content via `container.replaceChildren(...)`.

## Architecture

- `src/entries.ts` and `src/settings.ts` are data mediators: UI code reads/writes through them, never import `src/db.ts` directly (enforced by ESLint `no-restricted-imports` in `src/ui/`).
- `src/crypto.ts` handles encryption; `entries.ts` applies it transparently.
- `src/attendance.ts` is a pure calculator: given entries and settings, it returns rolling attendance stats.
- UI views are `render*()` functions in `src/ui/` that receive a container and callbacks.
- An entry stores a date (`YYYY-MM-DD`), a reason (day type), and optional notes. No time-of-day tracking.

## Conventions

- Files: `kebab-case.ts`. Functions/variables: `camelCase`. Types: `PascalCase`. Constants: `UPPER_SNAKE_CASE`.
- First line of every `.ts` file: a `//` comment describing the module's purpose.
- Locale: `en-NZ` for all date/time formatting.
- NZ English in all docs, comments, and UI text (e.g. "colour", "organised", "behaviour"). CSS/JS API names like `color` are unchanged.
- CSS: use existing custom properties (`--bg`, `--accent`, etc.), BEM-lite class naming (`.parent-child`).
- Tests: Vitest with `jsdom` environment. `fake-indexeddb` provides an in-memory IndexedDB. Run `npm test` (single run) or `npm run test:watch` (interactive). `npm run test:coverage` checks v8 coverage against 100 % thresholds.
- Type-checking: `npm run typecheck` runs `tsc --noEmit` across all files. The `build` script uses `tsconfig.build.json` which excludes test files.
- Verification: `npm run check` runs format, lint, typecheck, test:coverage, and build in sequence. Use this to verify all changes before pushing.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). Body lines use `- ` hyphen bullets, not prose paragraphs.
- Comments: only for non-obvious logic, decisions, or trade-offs. Do not restate what the code already says.
- Language in docs and comments: plain, technical. Avoid marketing or hyperbolic phrasing.
- Do not use em dashes (—). Use a colon instead.
- Keep all docs (this file, README, etc.) up to date when making changes that affect documented behaviour.

## Tests

- Organised to maximise integration-style coverage: each test exercises as much of the real stack as possible rather than mocking.
- Test files live in `src/__tests__/` and are named `<topic>.test.ts`.
- `src/__tests__/setup.ts` runs before every test. It stubs `indexedDB` with a fresh `IDBFactory` (from `fake-indexeddb`) so each test gets an isolated, empty database.
- Call `vi.resetModules()` in a `beforeEach` when the module under test caches state (e.g. `db.ts` caches its connection).
- Use `/* v8 ignore start */` / `/* v8 ignore stop */` (not `/* v8 ignore next */`) to exclude defensive code that cannot be triggered in tests. The `next` variant does not work because esbuild strips comments from the transformed JS before the v8 coverage tool sees them.
- Keep dev-only dependencies (`fake-indexeddb`, `jsdom`, `@vitest/coverage-v8`) in `devDependencies`. The zero-runtime-dependency rule applies to production bundles only.

## Code style

- Arrow functions everywhere. Never use `function` declarations or expressions: use `const foo = (...) => { ... }` instead.
- Keep functions short and focused. Favour early returns over deep nesting.
- Prefer simple, readable code over clever or terse patterns.

## Formatting & linting

- Prettier handles all formatting: do not override its choices manually.
- ESLint enforces code quality: see `eslint.config.js`. Run `npm run lint` to check; `npm run lint:fix` to auto-fix.
- Run `npm run format` to format and `npm run format:check` to verify.
- Always use `npm run` scripts over `npx` when a script exists in `package.json`.
- Group object keys and interface properties by logical relationship, not alphabetically. Identity fields first, then primary data, then derived or optional fields.

## README

Follow the principles from [Art of README](https://github.com/hackergrrl/art-of-readme), adapted for a deployed app (not an npm package):

- **Cognitive funnelling**: order sections from broadest context to most specific detail. Let readers bail out early.
- **One-liner**: start with a single sentence that says what Daylog is.
- **Brevity**: as short as possible without losing clarity. Detailed docs go in separate files if needed.
- **No selling**: state facts, skip superlatives.
- **Sections to include**: one-liner, background/motivation, usage overview, local development, tech decisions, licence.
- **Sections that don't apply** (npm-specific): API documentation, install-as-dependency instructions, badge walls.
