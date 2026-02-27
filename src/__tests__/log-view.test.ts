// Integration tests for log-view: renders form, saves entries to real DB.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AttendanceEntry } from '../types'

let renderLogView: typeof import('../ui/log-view').renderLogView
let entries: typeof import('../entries')
let settings: typeof import('../settings')

beforeEach(async () => {
  vi.useRealTimers()
  vi.resetModules()
  renderLogView = (await import('../ui/log-view')).renderLogView
  entries = await import('../entries')
  settings = await import('../settings')
})

const getContainer = (): HTMLElement => document.createElement('div')

describe('renderLogView', () => {
  it('renders a form with date, reason, notes, and save button', async () => {
    const container = getContainer()
    await renderLogView(container, vi.fn())

    expect(container.querySelector('h2')!.textContent).toBe('Log attendance')
    expect(container.querySelector('input[type="date"]')).toBeTruthy()
    expect(container.querySelector('select')).toBeTruthy()
    expect(container.querySelector('textarea')).toBeTruthy()
    expect(container.querySelector('button[type="submit"]')!.textContent).toBe(
      'Save',
    )
  })

  it('defaults date to today', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-03-15T10:00:00'))

    const container = getContainer()
    await renderLogView(container, vi.fn())

    const dateInput = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement
    expect(dateInput.value).toBe('2026-03-15')
  })

  it('submits a new entry and calls onSaved', async () => {
    const container = getContainer()
    const onSaved = vi.fn()
    await renderLogView(container, onSaved)

    const dateInput = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement
    const select = container.querySelector('select') as HTMLSelectElement
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const form = container.querySelector('form') as HTMLFormElement

    dateInput.value = '2026-02-20'
    select.value = 'wfh'
    textarea.value = 'Remote day'

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    // Wait for async save to complete.
    await vi.waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce()
    })

    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(1)
    expect(all[0]!.date).toBe('2026-02-20')
    expect(all[0]!.reason).toBe('wfh')
    expect(all[0]!.notes).toBe('Remote day')
  })

  it('trims whitespace-only notes to undefined', async () => {
    const container = getContainer()
    const onSaved = vi.fn()
    await renderLogView(container, onSaved)

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    textarea.value = '   '
    const form = container.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await vi.waitFor(() => {
      expect(onSaved).toHaveBeenCalled()
    })

    const all = await entries.loadAllEntries()
    expect(all[0]!.notes).toBeUndefined()
  })

  it('pre-fills the form when editing an existing entry', async () => {
    const container = getContainer()
    const existing: AttendanceEntry = {
      date: '2026-01-15',
      id: 'edit-1',
      notes: 'Important meeting',
      reason: 'office',
    }
    await renderLogView(container, vi.fn(), existing)

    expect(container.querySelector('h2')!.textContent).toBe('Edit entry')
    expect(container.querySelector('button[type="submit"]')!.textContent).toBe(
      'Update',
    )

    const dateInput = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement
    expect(dateInput.value).toBe('2026-01-15')

    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('office')

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('Important meeting')
  })

  it('preserves the entry id when updating', async () => {
    const container = getContainer()
    const onSaved = vi.fn()
    const existing: AttendanceEntry = {
      date: '2026-01-15',
      id: 'keep-this-id',
      reason: 'office',
    }
    await renderLogView(container, onSaved, existing)

    const form = container.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await vi.waitFor(() => {
      expect(onSaved).toHaveBeenCalled()
    })

    const all = await entries.loadAllEntries()
    expect(all[0]!.id).toBe('keep-this-id')
  })

  it('updates placeholder when reason changes to wfh', async () => {
    const container = getContainer()
    await renderLogView(container, vi.fn())

    const select = container.querySelector('select') as HTMLSelectElement
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement

    expect(textarea.placeholder).toContain('Optional')

    select.value = 'wfh'
    select.dispatchEvent(new Event('change'))
    expect(textarea.placeholder).toContain('Reason for working from home')

    select.value = 'office'
    select.dispatchEvent(new Event('change'))
    expect(textarea.placeholder).toContain('Optional')
  })

  it('sets wfh placeholder when editing a wfh entry', async () => {
    const container = getContainer()
    const existing: AttendanceEntry = {
      date: '2026-01-15',
      id: 'wfh-1',
      reason: 'wfh',
    }
    await renderLogView(container, vi.fn(), existing)

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    expect(textarea.placeholder).toContain('Reason for working from home')
  })
})

describe('attendance banner', () => {
  it('does not render the banner when attendance tracking is disabled', async () => {
    const container = getContainer()
    await renderLogView(container, vi.fn())

    expect(container.querySelector('.attendance-banner')).toBeNull()
  })

  it('renders the banner when attendance tracking is enabled', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-02-22T10:00:00'))

    await settings.saveAttendanceSettings({
      enabled: true,
      weeks: 1,
      percentage: 60,
    })

    // Mon 16 – Fri 20 are the weekdays in the 1-week window.
    await entries.saveEntry({ date: '2026-02-16', reason: 'office' })
    await entries.saveEntry({ date: '2026-02-17', reason: 'office' })
    await entries.saveEntry({ date: '2026-02-18', reason: 'office' })

    const container = getContainer()
    await renderLogView(container, vi.fn())

    const banner = container.querySelector('.attendance-banner')
    expect(banner).toBeTruthy()
    expect(banner!.querySelector('.attendance-percentage')!.textContent).toBe(
      '60%',
    )
    expect(banner!.querySelector('.attendance-detail')!.textContent).toContain(
      '3 of 5 days',
    )
  })

  it('applies attendance-ok class when at or above target', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-02-22T10:00:00'))

    await settings.saveAttendanceSettings({
      enabled: true,
      weeks: 1,
      percentage: 60,
    })

    await entries.saveEntry({ date: '2026-02-16', reason: 'office' })
    await entries.saveEntry({ date: '2026-02-17', reason: 'office' })
    await entries.saveEntry({ date: '2026-02-18', reason: 'office' })

    const container = getContainer()
    await renderLogView(container, vi.fn())

    const pct = container.querySelector('.attendance-percentage')!
    expect(pct.classList.contains('attendance-ok')).toBe(true)
    expect(pct.classList.contains('attendance-below')).toBe(false)
  })

  it('applies attendance-below class when below target', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-02-22T10:00:00'))

    await settings.saveAttendanceSettings({
      enabled: true,
      weeks: 1,
      percentage: 60,
    })

    // Only 1 office day out of 5 = 20%.
    await entries.saveEntry({ date: '2026-02-16', reason: 'office' })

    const container = getContainer()
    await renderLogView(container, vi.fn())

    const pct = container.querySelector('.attendance-percentage')!
    expect(pct.classList.contains('attendance-below')).toBe(true)
    expect(pct.classList.contains('attendance-ok')).toBe(false)
  })
})

describe('date validation', () => {
  it('rejects an invalid date and shows error message', async () => {
    const container = getContainer()
    const onSaved = vi.fn()
    await renderLogView(container, onSaved)

    const dateInput = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement
    dateInput.value = '2026-02-30'

    const form = container.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await vi.waitFor(() => {
      const msg = container.querySelector('.form-message')
      expect(msg).toBeTruthy()
      expect(msg!.textContent).toBe('Please enter a valid date.')
    })

    expect(onSaved).not.toHaveBeenCalled()
  })

  it('clears error message on successful save', async () => {
    const container = getContainer()
    const onSaved = vi.fn()
    await renderLogView(container, onSaved)

    const dateInput = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement

    // First submit invalid.
    dateInput.value = '2026-02-30'
    const form = container.querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await vi.waitFor(() => {
      expect(container.querySelector('.form-message')!.textContent).toBe(
        'Please enter a valid date.',
      )
    })

    // Then submit valid.
    dateInput.value = '2026-02-20'
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await vi.waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce()
    })
  })
})
