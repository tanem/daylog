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

## Local development

Requires Node.js. The version is pinned in `.nvmrc`: run `nvm use` to switch to it automatically.

```sh
npm install
npm run dev       # Start Vite dev server
npm run check     # Format, lint, typecheck, test, build
npm run build     # Type-check then build for production
npm run preview   # Preview the production build locally
npm run test      # Run tests (Vitest)
npm run lint      # ESLint
npm run format    # Prettier
```

## Tech decisions

- **Minimal runtime dependencies.** Vanilla TypeScript, DOM APIs, no frameworks. The only production dependency is [htm](https://github.com/developit/htm) (~0.7 kB gzipped), a tagged-template parser used for readable DOM construction.
- **IndexedDB** for on-device storage. No backend, no network requests.
- **AES-GCM encryption** (optional) derived from a user-set PIN via PBKDF2 (600k iterations). Auto-locks after inactivity or when backgrounded.
- **Vite** for development and builds, with `vite-plugin-pwa` for service worker generation.
- **Vitest** for tests, **ESLint** + **Prettier** for linting and formatting.

## Licence

[MIT](LICENSE)
