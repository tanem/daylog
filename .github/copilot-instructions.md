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

- Zero runtime dependencies. Do not add npm packages.
- No frameworks. Vanilla TypeScript + DOM APIs only.
- Named exports only. Never use `export default`.
- Never use `innerHTML`. Build DOM with `el()` from `src/ui/helpers.ts` and swap content via `container.replaceChildren(...)`.

## Architecture

- `src/entries.ts` and `src/settings.ts` are data mediators: UI code reads/writes through them, never import `src/db.ts` directly (enforced by ESLint).
- `src/crypto.ts` handles encryption; `entries.ts` applies it transparently.
- `src/attendance.ts` is a pure calculator: no side effects, no I/O.
- UI views are `render*()` functions in `src/ui/` that receive a container and callbacks.

## Security

- The `CryptoKey` (`sessionKey`) is never persisted. It is cleared on lock.
- Destructive actions use a type-to-confirm pattern (e.g. type "delete") or an inline two-step confirmation (click then confirm). Never use `window.confirm()` or `window.alert()`.
- Maintain strict CSP in `index.html`. No `unsafe-inline` for scripts or styles.
- Validate date inputs with `isValidDate()` from `src/ui/helpers.ts` before saving entries.

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

- Integration-style: exercise the real stack rather than mocking.
- Call `vi.resetModules()` in a `beforeEach` when the module under test caches state (e.g. `db.ts` caches its connection).
- Use `/* v8 ignore start */` / `/* v8 ignore stop */` (not `/* v8 ignore next */`) to exclude untestable defensive code. The `next` variant breaks because esbuild strips comments before v8 sees them.
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
