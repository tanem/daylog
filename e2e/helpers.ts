// Shared helpers for Playwright e2e tests.

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

type View = 'log' | 'history' | 'settings'

const viewLabels: Record<View, string> = {
  log: 'Log',
  history: 'History',
  settings: 'Settings',
}

// Heading patterns for each view. Used to confirm the view has rendered
// (not just that aria-current flipped, which happens before the async render).
const viewHeadings: Record<View, RegExp> = {
  log: /Log attendance|Edit entry|Unlock Daylog/,
  history: /^History$|Unlock Daylog/,
  settings: /^Settings$|Unlock Daylog/,
}

// Navigate to a view by clicking its nav button and waiting for the view to render.
// Skips the click when already on the target view to avoid triggering an async
// re-render that races with subsequent test interactions.
export const navigateTo = async (page: Page, view: View): Promise<void> => {
  const btn = page.getByRole('button', { name: viewLabels[view] })
  if ((await btn.getAttribute('aria-current')) === 'page') return
  await btn.click()
  await expect(
    page.getByRole('heading', { name: viewHeadings[view] }),
  ).toBeVisible()
}

export const saveEntry = async (
  page: Page,
  opts: { date?: string; reason?: string; notes?: string },
): Promise<void> => {
  await navigateTo(page, 'log')
  if (opts.date) {
    await page.getByLabel('Date').fill(opts.date)
  }
  if (opts.reason) {
    await page.getByLabel('Reason').selectOption(opts.reason)
  }
  if (opts.notes) {
    await page.getByLabel('Notes').fill(opts.notes)
  }
  await page.getByRole('button', { name: 'Save' }).click()
  // Wait for the save-and-redirect to History to complete, so callers
  // don't race with an in-flight IDB write or navigation.
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()
}

export const enableEncryption = async (
  page: Page,
  pin: string,
): Promise<void> => {
  await navigateTo(page, 'settings')
  await page.getByLabel('PIN', { exact: true }).fill(pin)
  await page.getByLabel('Confirm PIN').fill(pin)
  await page.getByRole('button', { name: 'Enable encryption' }).click()
  await expect(
    page.getByText('Encryption is enabled for this device.'),
  ).toBeVisible()
}

// Fill the unlock form and submit. Waits for the unlock view to render
// before interacting, since it appears asynchronously after lock/navigation.
export const unlockApp = async (page: Page, pin: string): Promise<void> => {
  await page.getByRole('heading', { name: 'Unlock Daylog' }).waitFor()
  await page.getByLabel('PIN').fill(pin)
  await page.getByRole('button', { name: 'Unlock' }).click()
}

// Lock the encryption session programmatically (simulates auto-lock or tab hide).
export const lockSession = async (page: Page): Promise<void> => {
  await page.evaluate('import("/src/crypto.ts").then(m => m.lock())')
}

// Start each test from a clean app state. Playwright creates a fresh browser
// context per test, so IndexedDB is already empty: no manual deleteDatabase needed.
// Waits for the boot render to complete so async navigateTo() in main.ts
// does not race with subsequent test interactions.
export const resetApp = async (page: Page): Promise<void> => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Log attendance' }),
  ).toBeVisible()
}

export const clearData = async (page: Page): Promise<void> => {
  await navigateTo(page, 'settings')
  await page.getByLabel('Type "delete" to confirm').fill('delete')
  await page.getByRole('button', { name: 'Delete all data' }).click()
}
