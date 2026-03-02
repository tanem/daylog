// Entry CRUD user journeys: log, edit, delete, and view history.

import { test, expect } from '@playwright/test'
import { navigateTo, resetApp, saveEntry } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

test.describe('logging entries', () => {
  test('saves a new entry and shows it in history', async ({ page }) => {
    await saveEntry(page, {
      date: '2026-02-20',
      reason: 'office',
      notes: 'Standup at 9am',
    })

    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()
    await expect(page.getByText('Office')).toBeVisible()
    await expect(page.getByText('Standup at 9am')).toBeVisible()
  })

  test('defaults to today when no date is set', async ({ page }) => {
    // The date input should already have today's date pre-filled.
    const dateInput = page.getByLabel('Date')
    const value = await dateInput.inputValue()
    // Should be a valid ISO date matching YYYY-MM-DD.
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('rejects invalid dates', async ({ page }) => {
    // Temporarily change input type to text so we can set a truly invalid value
    // (type="date" normalises or rejects invalid strings across browsers).
    await page.getByLabel('Date').evaluate((el: HTMLInputElement) => {
      el.type = 'text'
      el.value = 'not-a-date'
    })
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Please enter a valid date')).toBeVisible()
  })

  test('saves multiple entries sorted newest-first in history', async ({
    page,
  }) => {
    await saveEntry(page, { date: '2026-02-18', reason: 'office' })
    await saveEntry(page, { date: '2026-02-20', reason: 'wfh' })
    await saveEntry(page, { date: '2026-02-19', reason: 'leave' })

    // Already on History after the last save. Verify sort order.
    const dates = page.locator('.entry-date')
    await expect(dates).toHaveCount(3)

    // Newest first: Feb 20, Feb 19, Feb 18.
    await expect(dates.nth(0)).toContainText('20')
    await expect(dates.nth(1)).toContainText('19')
    await expect(dates.nth(2)).toContainText('18')
  })

  test('shows edit and delete buttons for every entry', async ({ page }) => {
    await saveEntry(page, { date: '2026-02-18', reason: 'office' })
    await saveEntry(page, { date: '2026-02-19', reason: 'wfh' })
    await saveEntry(page, { date: '2026-02-20', reason: 'leave' })

    const items = page.locator('.entry-item')
    await expect(items).toHaveCount(3)

    for (let i = 0; i < 3; i++) {
      await expect(
        items.nth(i).getByRole('button', { name: /Edit entry for/ }),
      ).toBeVisible()
      await expect(
        items.nth(i).getByRole('button', { name: /Delete entry for/ }),
      ).toBeVisible()
    }
  })
})

test.describe('editing entries', () => {
  test('pre-fills the form and updates the entry', async ({ page }) => {
    await saveEntry(page, {
      date: '2026-02-20',
      reason: 'office',
      notes: 'Original note',
    })

    // Now in History: click Edit.
    await page.getByRole('button', { name: /Edit entry for/ }).click()

    await expect(
      page.getByRole('heading', { name: 'Edit entry' }),
    ).toBeVisible()
    await expect(page.getByLabel('Date')).toHaveValue('2026-02-20')
    await expect(page.getByLabel('Notes')).toHaveValue('Original note')

    await page.getByLabel('Reason').selectOption('wfh')
    await page.getByLabel('Notes').fill('Updated note')
    await page.getByRole('button', { name: 'Update' }).click()

    await expect(page.getByRole('heading', { name: 'History' })).toBeVisible()
    await expect(page.getByText('WFH')).toBeVisible()
    await expect(page.getByText('Updated note')).toBeVisible()
    await expect(page.getByText('Office')).not.toBeVisible()
  })
})

test.describe('deleting entries', () => {
  test('deletes an entry after confirmation', async ({ page }) => {
    await saveEntry(page, { date: '2026-02-20', reason: 'office' })

    // Click Delete, then Confirm in the inline confirmation.
    await page.getByRole('button', { name: /Delete entry for/ }).click()
    await expect(page.getByText('Delete?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm' }).click()

    // Entry is gone, empty state shown.
    await expect(page.getByText('No entries yet')).toBeVisible()
  })

  test('cancels deletion when Cancel is clicked', async ({ page }) => {
    await saveEntry(page, { date: '2026-02-20', reason: 'office' })

    await page.getByRole('button', { name: /Delete entry for/ }).click()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByText('Office')).toBeVisible()
  })
})

test.describe('empty state', () => {
  test('shows empty message when there are no entries', async ({ page }) => {
    await navigateTo(page, 'history')
    await expect(page.getByText('No entries yet')).toBeVisible()
  })
})
