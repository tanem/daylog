# Security model

Daylog is designed for casual protection of personal attendance data on a single device. It is not intended to resist a sophisticated attacker with full filesystem access and unlimited time.

## What is encrypted

When PIN protection is enabled, each attendance entry (date, reason, notes) is individually encrypted with AES-256-GCM. The encryption key is derived from your PIN via PBKDF2 with 600,000 iterations of SHA-256.

## What is not encrypted

The following metadata remains in plaintext in IndexedDB:

- The number of entries and their random UUIDs (IDs carry no semantic information).
- Encryption parameters: salt, verification tag.
- Attendance tracking settings (enabled flag, week window, target percentage).

## Brute-force protection

Failed unlock attempts trigger exponential backoff: no delay for the first 4, then 30 seconds, 5 minutes, and 30 minutes. After 15 consecutive failures, all data is permanently erased (matching iOS device behaviour).

## Exports

Exported files (JSON and CSV) are always plaintext regardless of encryption status. When encryption is enabled, the app requires a two-step confirmation before downloading.

## Network

Daylog makes no network requests after the initial load. All data stays in the browser's IndexedDB. There is no backend, analytics, or telemetry.
