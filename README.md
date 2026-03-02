# Daylog

[![build status](https://img.shields.io/github/actions/workflow/status/tanem/daylog/ci.yml?style=flat-square)](https://github.com/tanem/daylog/actions?query=workflow%3ACI)

> Offline PWA for logging your daily work attendance type: office, working from home, leave, sick, or public holiday. All data stays on your device.

**Live:** https://tanem.github.io/daylog/

[Background](#background) | [Usage](#usage) | [Local development](#local-development) | [Tech decisions](#tech-decisions) | [Licence](#licence)

## Background

Teams with hybrid schedules need a simple way to track which days were spent in the office versus working from home. Daylog records the day type, not clock-in/clock-out times. Optional notes let you capture context (e.g. why you worked from home on a scheduled office day).

Data is stored in IndexedDB with optional PIN-based encryption (AES-GCM, PBKDF2 key derivation). Nothing leaves the browser.

## Usage

1. Open the app and select today's date (defaults to today).
2. Pick a day type: Office, Working from home, Leave, Sick, or Public holiday.
3. Add optional notes: the placeholder prompts for a reason when WFH is selected.
4. Hit **Save**. View or edit past entries on the History tab.
5. Enable attendance tracking in Settings to see a rolling office-attendance percentage on the log screen. Configure the target percentage and window size in weeks.
6. Export your data as JSON or CSV from Settings.

### PIN protection

Enable PIN encryption in Settings to encrypt all entries at rest (AES-256-GCM). The session auto-locks after inactivity or when the tab is backgrounded. After 15 consecutive failed unlock attempts, all data is permanently erased.

See [docs/security.md](docs/security.md) for the full security model: what is and isn't encrypted, brute-force backoff timings, and export behaviour.

## Local development

Requires Node.js. The version is pinned in `.nvmrc`: run `nvm use` to switch to it automatically.

```sh
npm install
npx playwright install --with-deps   # Install browser engines (first time only)
npm run dev       # Start Vite dev server
npm run check     # Format, lint, typecheck, test, build
npm run build     # Type-check then build for production
npm run preview   # Preview the production build locally
npm test          # Run tests (Playwright, all browsers)
npm run test:ui   # Interactive Playwright UI mode
npm run lint      # ESLint
npm run format    # Prettier
```

## Tech decisions

- **Minimal runtime dependencies.** Vanilla TypeScript, DOM APIs, no frameworks. Two production dependencies: [htm](https://github.com/developit/htm) (~0.7 kB gzipped) for readable DOM construction and [idb](https://github.com/jakearchibald/idb) (~1.2 kB gzipped) for a promise-based IndexedDB API.
- **IndexedDB** for on-device storage. No backend, no network requests.
- **AES-GCM encryption** (optional) derived from a user-set PIN via PBKDF2 (600k iterations). Auto-locks after inactivity or when backgrounded.
- **Vite** for development and builds, with `vite-plugin-pwa` for service worker generation.
- **Playwright** for end-to-end tests across Chromium, Firefox, and WebKit. Integration-first: tests drive the real app through nav buttons and forms, no mocks or fake environments. Follows [Kent C. Dodds' Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) approach.
- **ESLint** + **Prettier** for linting and formatting.

## Licence

[MIT](LICENSE)
