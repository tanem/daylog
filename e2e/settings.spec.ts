// Settings user journeys: attendance tracking, export, danger zone.

import { test, expect } from '@playwright/test'
import { enableEncryption, navigateTo, resetApp, saveEntry } from './helpers'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
})

test.describe('attendance tracking', () => {
  test('enables tracking and shows banner on log view', async ({ page }) => {
    await navigateTo(page, 'settings')
    await page.getByLabel('Enable attendance tracking').check()

    // Target and weeks fields should now be visible.
    await expect(page.getByLabel('Target %')).toBeVisible()
    await expect(page.getByLabel('Rolling window (weeks)')).toBeVisible()

    // Navigate to Log and verify the attendance banner appears.
    await navigateTo(page, 'log')
    await expect(
      page.getByRole('status', { name: 'Attendance summary' }),
    ).toBeVisible()
  })

  test('hides banner when tracking is disabled', async ({ page }) => {
    // Enable, then disable.
    await navigateTo(page, 'settings')
    await page.getByLabel('Enable attendance tracking').check()
    await page.getByLabel('Enable attendance tracking').uncheck()

    await navigateTo(page, 'log')
    await expect(
      page.getByRole('status', { name: 'Attendance summary' }),
    ).not.toBeVisible()
  })

  test('configures target percentage and window', async ({ page }) => {
    await navigateTo(page, 'settings')
    await page.getByLabel('Enable attendance tracking').check()
    await page.getByLabel('Target %').fill('80')
    // Trigger change event so the setting is saved.
    await page.getByLabel('Target %').press('Tab')
    await page.getByLabel('Rolling window (weeks)').fill('4')
    await page.getByLabel('Rolling window (weeks)').press('Tab')

    // The change handler saves to IDB asynchronously. Wait for it to flush
    // before reloading, otherwise the navigation aborts the in-flight write.
    await expect
      .poll(() =>
        page.evaluate(
          'import("/src/settings.ts").then(m => m.loadAttendanceSettings()).then(s => s.weeks)',
        ),
      )
      .toBe(4)
    await page.reload()
    await navigateTo(page, 'settings')
    await expect(page.getByLabel('Target %')).toHaveValue('80')
    await expect(page.getByLabel('Rolling window (weeks)')).toHaveValue('4')
  })

  test('shows correct attendance percentage', async ({ page }) => {
    // Log some entries: 2 office days, 1 WFH.
    await saveEntry(page, { date: '2026-02-23', reason: 'office' })
    await saveEntry(page, { date: '2026-02-24', reason: 'office' })
    await saveEntry(page, { date: '2026-02-25', reason: 'wfh' })

    // Enable attendance tracking.
    await navigateTo(page, 'settings')
    await page.getByLabel('Enable attendance tracking').check()

    // Go to Log view and check the banner shows a percentage.
    await navigateTo(page, 'log')
    const banner = page.getByRole('status', { name: 'Attendance summary' })
    await expect(banner).toBeVisible()
    // The banner should contain a percentage number.
    await expect(banner.locator('.attendance-percentage')).toContainText('%')
  })
})

test.describe('export', () => {
  test('exports entries as JSON', async ({ page }) => {
    await saveEntry(page, {
      date: '2026-02-20',
      reason: 'office',
      notes: 'Test',
    })

    await navigateTo(page, 'settings')

    // Listen for download events.
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export as JSON' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/daylog-export-.*\.json$/)

    // Verify the content structure.
    const content = await (await download.createReadStream()).toArray()
    const text = Buffer.concat(content).toString()
    const parsed = JSON.parse(text) as Array<Record<string, unknown>>
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toHaveProperty('date', '2026-02-20')
    expect(parsed[0]).toHaveProperty('reason', 'office')
    expect(parsed[0]).toHaveProperty('notes', 'Test')
  })

  test('exports entries as CSV', async ({ page }) => {
    await saveEntry(page, { date: '2026-02-20', reason: 'office' })

    await navigateTo(page, 'settings')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export as CSV' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/daylog-export-.*\.csv$/)

    const content = await (await download.createReadStream()).toArray()
    const text = Buffer.concat(content).toString()
    // CSV should have a header and one data row.
    const lines = text.trim().split('\n')
    expect(lines[0]).toBe('id,date,reason,notes')
    expect(lines[1]).toContain('2026-02-20')
    expect(lines[1]).toContain('office')
  })

  test('requires two-step confirmation when encrypted', async ({ page }) => {
    await saveEntry(page, { date: '2026-02-20', reason: 'office' })
    await enableEncryption(page, 'testpin123')

    const jsonBtn = page.getByRole('button', { name: 'Export as JSON' })
    await jsonBtn.click()

    // First click changes button text to a confirmation prompt.
    const confirmBtn = page.getByRole('button', {
      name: 'Confirm: download plaintext file?',
    })
    await expect(confirmBtn).toBeVisible()

    // Second click triggers the download.
    const downloadPromise = page.waitForEvent('download')
    await confirmBtn.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/)
  })
})

test.describe('danger zone', () => {
  test('requires typing "delete" to confirm', async ({ page }) => {
    await navigateTo(page, 'settings')
    await page.getByRole('button', { name: 'Delete all data' }).click()
    // The error message appears after clicking without typing "delete".
    await expect(page.getByText('Type "delete" to confirm.')).toBeVisible()
  })

  test('deletes all data when confirmed', async ({ page }) => {
    await saveEntry(page, { date: '2026-02-20', reason: 'office' })

    await navigateTo(page, 'settings')
    await page.getByLabel('Type "delete" to confirm').fill('delete')
    await page.getByRole('button', { name: 'Delete all data' }).click()

    // Should navigate back to Log view (the onDataWiped callback).
    await expect(
      page.getByRole('heading', { name: 'Log attendance' }),
    ).toBeVisible()

    // Verify history is empty.
    await navigateTo(page, 'history')
    await expect(page.getByText('No entries yet')).toBeVisible()
  })

  test('resets encryption state when data is deleted', async ({ page }) => {
    await enableEncryption(page, 'testpin123')

    await page.getByLabel('Type "delete" to confirm').fill('delete')
    await page.getByRole('button', { name: 'Delete all data' }).click()

    // The onDataWiped callback navigates to Log: wait for that to complete.
    await expect(
      page.getByRole('heading', { name: 'Log attendance' }),
    ).toBeVisible()

    // After wipe, navigating to settings should show the "enable" form, not the "enabled" state.
    await navigateTo(page, 'settings')
    await expect(
      page.getByRole('button', { name: 'Enable encryption' }),
    ).toBeVisible()
  })
})
