// Encryption lifecycle user journeys: enable, unlock, change PIN, disable, brute-force.

import { test, expect } from '@playwright/test'
import {
  enableEncryption,
  lockSession,
  navigateTo,
  resetApp,
  saveEntry,
  unlockApp,
} from './helpers'

const TEST_PIN = 'testpin123'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

test.describe('enabling encryption', () => {
  test('encrypts entries and shows enabled state', async ({ page }) => {
    // Add an entry first so we can verify it survives encryption.
    await saveEntry(page, { date: '2026-02-20', reason: 'office' })

    await enableEncryption(page, TEST_PIN)

    await expect(
      page.getByText('Encryption is enabled for this device.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change PIN' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Disable encryption' }),
    ).toBeVisible()
  })

  test('rejects PIN shorter than 6 characters', async ({ page }) => {
    await navigateTo(page, 'settings')
    await page.getByLabel('PIN', { exact: true }).fill('short')
    await page.getByLabel('Confirm PIN').fill('short')
    await page.getByRole('button', { name: 'Enable encryption' }).click()

    await expect(page.getByText('at least 6 characters')).toBeVisible()
  })

  test('rejects mismatched PINs', async ({ page }) => {
    await navigateTo(page, 'settings')
    await page.getByLabel('PIN', { exact: true }).fill(TEST_PIN)
    await page.getByLabel('Confirm PIN').fill('different123')
    await page.getByRole('button', { name: 'Enable encryption' }).click()

    await expect(page.getByText('PINs do not match')).toBeVisible()
  })
})

test.describe('lock and unlock', () => {
  test('locks session and requires PIN to unlock', async ({ page }) => {
    await enableEncryption(page, TEST_PIN)

    await lockSession(page)

    // Navigate to trigger a re-render; the app should show the unlock view.
    await navigateTo(page, 'log')
    await expect(
      page.getByRole('heading', { name: 'Unlock Daylog' }),
    ).toBeVisible()

    await unlockApp(page, TEST_PIN)
    await expect(
      page.getByRole('heading', { name: 'Log attendance' }),
    ).toBeVisible()
  })

  test('clears PIN field after successful unlock', async ({ page }) => {
    await enableEncryption(page, TEST_PIN)

    await lockSession(page)
    await navigateTo(page, 'log')
    await unlockApp(page, TEST_PIN)
    await expect(
      page.getByRole('heading', { name: 'Log attendance' }),
    ).toBeVisible()

    // Lock again and verify the unlock screen shows an empty PIN field.
    // Navigate away first so navigateTo triggers a click and re-render.
    await navigateTo(page, 'history')
    await lockSession(page)
    await navigateTo(page, 'log')
    await expect(
      page.getByRole('heading', { name: 'Unlock Daylog' }),
    ).toBeVisible()
    await expect(page.getByLabel('PIN')).toHaveValue('')
  })

  test('shows error for wrong PIN', async ({ page }) => {
    await enableEncryption(page, TEST_PIN)

    await lockSession(page)
    await navigateTo(page, 'log')

    await unlockApp(page, 'wrongpin123')
    await expect(page.getByText('Check your PIN')).toBeVisible()

    await page.getByLabel('PIN').fill(TEST_PIN)
    await page.getByRole('button', { name: 'Unlock' }).click()
    await expect(
      page.getByRole('heading', { name: 'Log attendance' }),
    ).toBeVisible()
  })

  test('entries survive lock/unlock cycle', async ({ page }) => {
    await saveEntry(page, {
      date: '2026-02-20',
      reason: 'office',
      notes: 'Test note',
    })
    await enableEncryption(page, TEST_PIN)

    await lockSession(page)
    await navigateTo(page, 'history')
    await unlockApp(page, TEST_PIN)

    await expect(page.getByText('Office')).toBeVisible()
    await expect(page.getByText('Test note')).toBeVisible()
  })
})

test.describe('change PIN', () => {
  test('changes PIN successfully', async ({ page }) => {
    await enableEncryption(page, TEST_PIN)

    const newPin = 'newpin456'
    await page.getByLabel('Current PIN').fill(TEST_PIN)
    await page.getByLabel('New PIN', { exact: true }).fill(newPin)
    await page.getByLabel('Confirm new PIN').fill(newPin)
    await page.getByRole('button', { name: 'Change PIN' }).click()

    await expect(page.getByText('PIN changed successfully')).toBeVisible()

    // All PIN fields and the strength indicator should clear after success.
    await expect(page.getByLabel('Current PIN')).toHaveValue('')
    await expect(page.getByLabel('New PIN', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Confirm new PIN')).toHaveValue('')
    await expect(page.getByText('Fair')).not.toBeVisible()

    // Lock and verify the new PIN works.
    await lockSession(page)
    await navigateTo(page, 'log')
    await unlockApp(page, newPin)
    await expect(
      page.getByRole('heading', { name: 'Log attendance' }),
    ).toBeVisible()
  })

  test('rejects wrong current PIN', async ({ page }) => {
    await enableEncryption(page, TEST_PIN)

    await page.getByLabel('Current PIN').fill('wrongpin123')
    await page.getByLabel('New PIN', { exact: true }).fill('newpin456')
    await page.getByLabel('Confirm new PIN').fill('newpin456')
    await page.getByRole('button', { name: 'Change PIN' }).click()

    await expect(page.getByText('Current PIN is incorrect')).toBeVisible()
  })

  test('rejects mismatched new PINs', async ({ page }) => {
    await enableEncryption(page, TEST_PIN)

    await page.getByLabel('Current PIN').fill(TEST_PIN)
    await page.getByLabel('New PIN', { exact: true }).fill('newpin456')
    await page.getByLabel('Confirm new PIN').fill('different789')
    await page.getByRole('button', { name: 'Change PIN' }).click()

    await expect(page.getByText('New PINs do not match')).toBeVisible()
  })
})

test.describe('disable encryption', () => {
  test('disables encryption and decrypts entries', async ({ page }) => {
    await saveEntry(page, { date: '2026-02-20', reason: 'office' })
    await enableEncryption(page, TEST_PIN)

    await page.getByLabel('PIN', { exact: true }).fill(TEST_PIN)
    await page.getByRole('button', { name: 'Disable encryption' }).click()

    await expect(
      page.getByRole('button', { name: 'Enable encryption' }),
    ).toBeVisible()

    // Enabled-state content should be fully replaced by the disabled view.
    await expect(
      page.getByText('Encryption is enabled for this device.'),
    ).not.toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Change PIN' }),
    ).not.toBeVisible()

    // Entry should still be visible in history (decrypted back to plaintext).
    await navigateTo(page, 'history')
    await expect(page.getByText('Office')).toBeVisible()
  })
})

test.describe('brute-force protection', () => {
  test('shows cooldown after multiple wrong attempts', async ({ page }) => {
    await enableEncryption(page, TEST_PIN)

    await lockSession(page)
    await navigateTo(page, 'log')
    await expect(
      page.getByRole('heading', { name: 'Unlock Daylog' }),
    ).toBeVisible()

    // Seed the failed attempts counter directly to avoid slow PBKDF2 calls.
    // The meta store uses keyPath 'key', so include it in the object.
    // Attempts 1-4 have no cooldown; attempt 5 triggers a 30s cooldown.
    await page.evaluate(
      'import("/node_modules/idb/build/index.js").then(({ openDB }) => ' +
        'openDB("daylog", 1).then(db => ' +
        'db.put("meta", { key: "failedAttempts", count: 4, lastAttemptAt: Date.now() }).then(() => db.close())))',
    )

    // Install fake clock after all IDB work, before the unlock attempt.
    await page.clock.install()

    // This 5th attempt should trigger the cooldown.
    await unlockApp(page, 'wrongpin123')
    await expect(page.getByText('Too many attempts')).toBeVisible()

    // After advancing time past the cooldown, unlock should work.
    await page.clock.fastForward(31_000)

    // Input + button should re-enable after the cooldown expires.
    await page.getByLabel('PIN').fill(TEST_PIN)
    await page.getByRole('button', { name: 'Unlock' }).click()
    await expect(
      page.getByRole('heading', { name: 'Log attendance' }),
    ).toBeVisible()
  })
})

test.describe('auto-lock', () => {
  test('locks after inactivity timeout', async ({ page }) => {
    await enableEncryption(page, TEST_PIN)

    // Install fake clock before navigating so the auto-lock timer is under fake clock control.
    await page.clock.install()

    // Navigate to create a fresh auto-lock timer managed by the fake clock.
    await page.getByRole('button', { name: 'Log' }).click()
    await expect(
      page.getByRole('heading', { name: 'Log attendance' }),
    ).toBeVisible()

    // Fast-forward past the 5-minute inactivity timeout.
    // The timer fires, locks the session, and re-renders with the unlock view.
    await page.clock.fastForward(5 * 60 * 1000 + 1000)

    await expect(
      page.getByRole('heading', { name: 'Unlock Daylog' }),
    ).toBeVisible()
  })
})
