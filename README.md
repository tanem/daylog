# Daylog

Offline PWA for logging your daily work attendance type: office, working from home, leave, sick, or public holiday. All data stays on your device.

**Live:** https://tanem.github.io/daylog/

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

Enable PIN encryption in Settings to encrypt all entries at rest. The minimum PIN length is 6 characters. Once enabled:

- Existing plaintext entries are automatically encrypted.
- The session auto-locks after 5 minutes of inactivity or when the browser tab is backgrounded.
- You can change your PIN or disable encryption from Settings (requires entering the current PIN).
- Exports are always plaintext: a confirmation prompt warns you before exporting encrypted data.
- After 15 consecutive failed unlock attempts, all data is permanently erased.

## Security model

Daylog is designed for casual protection of personal attendance data on a single device. It is not intended to resist a sophisticated attacker with full filesystem access and unlimited time.

### What is encrypted

When PIN protection is enabled, each attendance entry (date, reason, notes) is individually encrypted with AES-256-GCM. The encryption key is derived from your PIN via PBKDF2 with 600,000 iterations of SHA-256.

### What is not encrypted

The following metadata remains in plaintext in IndexedDB:

- The number of entries and their random UUIDs (IDs carry no semantic information).
- Encryption parameters: salt, verification tag.
- Attendance tracking settings (enabled flag, week window, target percentage).

### Brute-force protection

Failed unlock attempts trigger exponential backoff: no delay for the first 4, then 30 seconds, 5 minutes, and 30 minutes. After 15 consecutive failures, all data is permanently erased (matching iOS device behaviour).

### Exports

Exported files (JSON and CSV) are always plaintext regardless of encryption status. When encryption is enabled, the app requires a two-step confirmation before downloading.

### Network

Daylog makes no network requests after the initial load. All data stays in the browser's IndexedDB. There is no backend, analytics, or telemetry.

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

- **Minimal runtime dependencies.** Vanilla TypeScript, DOM APIs, no frameworks. The only production dependency is [htm](https://github.com/developit/htm) (~0.7 kB gzipped), a tagged-template parser used for readable DOM construction.
- **IndexedDB** for on-device storage. No backend, no network requests.
- **AES-GCM encryption** (optional) derived from a user-set PIN via PBKDF2 (600k iterations). Auto-locks after inactivity or when backgrounded.
- **Vite** for development and builds, with `vite-plugin-pwa` for service worker generation.
- **Playwright** for end-to-end tests across Chromium, Firefox, and WebKit. Integration-first: tests drive the real app through nav buttons and forms, no mocks or fake environments. Follows [Kent C. Dodds' Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) approach.
- **ESLint** + **Prettier** for linting and formatting.

## Licence

[MIT](LICENSE)
