# Daylog – Copilot Instructions

Offline-only PWA for logging daily work attendance type (office, WFH, leave, sick, public holiday). All data stored in IndexedDB on-device. No backend.

Keep these instructions minimal: only rules and constraints an agent cannot infer from code, configs, or file structure. Do not duplicate implementation details.

## Accessibility

- Every interactive element must have an associated `<label>` with a matching `for` attribute. Use the `fieldGroup()` helper which handles this automatically when the input has an `id`.
- Never use `placeholder` as a substitute for `<label>`. Placeholders disappear on input and are not reliably announced by screen readers.
- Use semantic HTML elements (`<nav>`, `<main>`, `<header>`, `<button>`, `<form>`) over generic `<div>`/`<span>`.
- Landmark elements should have an `aria-label` when there is more than one of the same type.
- Buttons must have visible text content or an `aria-label`. Repeated buttons (e.g. per-row Edit/Delete) need unique `aria-label`s that include context (e.g. the entry date).
- Ensure sufficient colour contrast (WCAG AA): 4.5:1 for normal text, 3:1 for large text. Use `--accent` for text on dark backgrounds, `--accent-bg` for button backgrounds with white text.
- All interactive elements must be reachable and operable via keyboard alone.
- Wrap related inputs and their submit button in a `<form>` element so Enter key triggers submission natively.
- Dynamic status/error messages must use `aria-live="assertive"` so screen readers announce changes.
- When replacing view content (SPA navigation), move focus to the new view's `<h2>` heading.
- Respect `prefers-reduced-motion`: all CSS transitions are disabled via the media query in `style.css`.

## Hard rules

- Minimal runtime dependencies. Only add a production dep when it eliminates significant boilerplate around a browser API with poor ergonomics (e.g. `idb` for IndexedDB, `htm` for DOM construction). Justify each addition.
- No frameworks. Vanilla TypeScript + DOM APIs only.
- Named exports only. Never use `export default`.
- Never use `innerHTML`. Build DOM with `html` tagged templates from `src/ui/html.ts` (backed by [htm](https://github.com/developit/htm)) and swap content via `container.replaceChildren(...)`. Use `fieldGroup()` from `src/ui/fields.ts` for labelled form inputs: prefer `html` for view-level templates.
- When a template has a single root, cast the result: `html\`<div>…</div>\` as HTMLElement`. For multi-root templates, use `htmlList` which always returns an array.
- Inline event handlers in templates use lowercase `on*` attributes: `onclick`, `onsubmit`, etc.

## Architecture

- Flat directory structure: new files go alongside siblings, not into new subdirectories. Only `src/ui/` exists as a sub-boundary.
- One clear purpose per module. Prefer many small files over fewer large ones.
- `src/entries.ts`, `src/encryption.ts`, and `src/settings.ts` are data mediators: UI code reads/writes through them, never import `src/db.ts` directly (enforced by ESLint).
- `src/crypto.ts` handles encryption primitives; `src/encryption.ts` handles encryption lifecycle (enable/disable, PIN changes, migration).
- `src/attendance.ts` is a pure calculator: no side effects, no I/O.
- UI views are `render*()` functions in `src/ui/` that receive a container and callbacks.

## Security

- The `CryptoKey` (`sessionKey`) is never persisted. It is cleared on lock.
- Destructive actions use a type-to-confirm pattern (e.g. type "delete") or an inline two-step confirmation (click then confirm). Never use `window.confirm()` or `window.alert()`.
- Maintain strict CSP in `index.html`. No `unsafe-inline` for scripts or styles.
- Validate date inputs with `isValidDate()` from `src/dates.ts` before saving entries.
- PIN change, disable-encryption, and migrate operations use `atomicRekey()` from `src/db.ts` for crash safety: all entries + meta are written in a single IndexedDB transaction.
- `unlock()` in `src/crypto.ts` enforces exponential backoff on failed attempts and wipes all data after 15 consecutive failures. Failed attempt state is persisted in IndexedDB.

## Conventions

- Files: `kebab-case.ts`. Functions/variables: `camelCase`. Types: `PascalCase`. Constants: `UPPER_SNAKE_CASE`.
- First line of every `.ts` file: a `//` comment describing the module's purpose.
- Locale: `en-NZ` for all date/time formatting.
- NZ English in all docs, comments, and UI text (e.g. "colour", "organised", "behaviour"). CSS/JS API names like `color` are unchanged.
- CSS: use existing custom properties (`--bg`, `--accent`, etc.), BEM-lite class naming (`.parent-child`).
- Run `npm run check` before pushing.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). Body lines use `- ` hyphen bullets, not prose paragraphs.
- Comments: only for non-obvious logic, decisions, or trade-offs. Do not restate what the code already says.
- Plain, technical language in all docs, comments, and UI text. No marketing or hyperbolic phrasing.
- Do not use em dashes (—). Use a colon instead.
- Keep all docs (this file, README, etc.) up to date when making changes that affect documented behaviour.

## Tests

Testing philosophy follows Kent C. Dodds' [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications): integration tests that resemble real usage give the most confidence per line of test code. Simplicity over speed: one test runner, one config, one mental model.

- **Single runner**: [Playwright](https://playwright.dev/) only. No Vitest, no jsdom. Tests run against the real Vite dev server in real browsers.
- **Multi-browser**: Chromium, Firefox, WebKit. Covers desktop and mobile browser engines.
- **Locator priority** (mirrors Testing Library): `getByRole` > `getByLabel` > `getByText` > CSS locator (last resort, e.g. checking classes). Query the page the way a user would.
- **Feature-based organisation**: specs are organised by user journey (`entry-crud`, `encryption-lifecycle`, `settings`), not by source module.
- **Real stack**: no mocks, no fake-indexeddb. Tests drive the real app through nav buttons and forms. Only use `page.evaluate()` when the browser environment requires it (e.g. programmatically locking the session).
- **Clean slate**: `beforeEach` deletes the IndexedDB database and reloads the page. Each test starts from empty state.
- **Time control**: use `page.clock` for time-dependent features (brute-force backoff, auto-lock). Install the clock after IDB operations to avoid interfering with IndexedDB internals.
- **Brute-force testing**: prefer seeding the `failedAttempts` counter via `page.evaluate()` + direct IDB writes over looping through PBKDF2 calls. This keeps tests fast without sacrificing realism.
- **Downloads**: use Playwright's `page.waitForEvent('download')` to intercept and verify export file content.
- **Shared helpers**: `e2e/helpers.ts` provides reusable actions (`navigateTo`, `saveEntry`, `enableEncryption`, `unlockApp`, `clearData`). Keep helpers thin: they should compose real user interactions, not abstract them away.
- **Coverage**: reported via `monocart-reporter` (V8 coverage with source maps). Not enforced with thresholds: good coverage follows naturally from thorough user journey tests.
- Dev-only dependencies go in `devDependencies`. The zero-runtime-dependency rule applies to production bundles only.

## Code style

- Arrow functions everywhere. Never use `function` declarations or expressions.
- Keep functions short and focused. Favour early returns over deep nesting.
- Prefer simple, readable code over clever or terse patterns.
- Always use `npm run` scripts over `npx` when a script exists in `package.json`.
- Group object keys and interface properties by logical relationship, not alphabetically. Identity fields first, then primary data, then derived or optional fields.

## README

Follow the principles from [Art of README](https://github.com/hackergrrl/art-of-readme), adapted for a deployed app (not an npm package):

- **Cognitive funnelling**: order sections from broadest context to most specific detail.
- **One-liner**: start with a single sentence that says what Daylog is.
- **Brevity**: as short as possible without losing clarity.
- **No selling**: state facts, skip superlatives.
- **Sections to include**: one-liner, background/motivation, usage overview, local development, tech decisions, licence.
- **Sections that don't apply** (npm-specific): API documentation, install-as-dependency instructions, badge walls.
