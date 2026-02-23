// Integration tests for history-view: renders entries from real DB.

import type { Reason } from '../types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let renderHistoryView: typeof import('../ui/history-view').renderHistoryView
let entries: typeof import('../entries')

beforeEach(async () => {
  vi.resetModules()
  renderHistoryView = (await import('../ui/history-view')).renderHistoryView
  entries = await import('../entries')
})

const getContainer = (): HTMLElement => document.createElement('div')

describe('renderHistoryView', () => {
  it('shows empty state when no entries exist', async () => {
    const container = getContainer()
    await renderHistoryView(container, vi.fn())

    expect(container.querySelector('h2')!.textContent).toBe('History')
    expect(container.querySelector('.empty-state')!.textContent).toContain(
      'No entries yet',
    )
  })

  it('renders entries sorted newest first', async () => {
    await entries.saveEntry({
      date: '2026-01-01',
      id: 'old',
      reason: 'office',
    })
    await entries.saveEntry({
      date: '2026-02-01',
      id: 'new',
      reason: 'wfh',
    })

    const container = getContainer()
    await renderHistoryView(container, vi.fn())

    const items = container.querySelectorAll('.entry-item')
    expect(items).toHaveLength(2)

    // Newest first: Feb before Jan.
    const dates = Array.from(container.querySelectorAll('.entry-date')).map(
      (el) => el.textContent!,
    )
    expect(dates[0]).toContain('Feb')
    expect(dates[1]).toContain('Jan')
  })

  it('displays reason labels correctly', async () => {
    await entries.saveEntry({ date: '2026-01-01', reason: 'office' })
    await entries.saveEntry({ date: '2026-01-02', reason: 'wfh' })
    await entries.saveEntry({ date: '2026-01-03', reason: 'leave' })
    await entries.saveEntry({ date: '2026-01-04', reason: 'sick' })
    await entries.saveEntry({ date: '2026-01-05', reason: 'public-holiday' })

    const container = getContainer()
    await renderHistoryView(container, vi.fn())

    const reasons = Array.from(
      container.querySelectorAll('[class*="entry-reason"]'),
    ).map((el) => el.textContent!)

    expect(reasons).toContain('Office')
    expect(reasons).toContain('WFH')
    expect(reasons).toContain('Leave')
    expect(reasons).toContain('Sick')
    expect(reasons).toContain('Holiday')
  })

  it('shows notes when present', async () => {
    await entries.saveEntry({
      date: '2026-01-01',
      notes: 'Team lunch',
      reason: 'office',
    })

    const container = getContainer()
    await renderHistoryView(container, vi.fn())

    expect(container.querySelector('.entry-notes')!.textContent).toBe(
      'Team lunch',
    )
  })

  it('omits notes element when notes are absent', async () => {
    await entries.saveEntry({ date: '2026-01-01', reason: 'office' })

    const container = getContainer()
    await renderHistoryView(container, vi.fn())

    expect(container.querySelector('.entry-notes')).toBeNull()
  })

  it('calls onEdit with the entry when edit button is clicked', async () => {
    const saved = await entries.saveEntry({
      date: '2026-01-01',
      reason: 'office',
    })

    const container = getContainer()
    const onEdit = vi.fn()
    await renderHistoryView(container, onEdit)

    const editBtn = container.querySelector(
      '.btn.btn-small:not(.btn-danger)',
    ) as HTMLButtonElement
    editBtn.click()

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onEdit).toHaveBeenCalledWith(saved)
  })

  it('deletes entry and refreshes when delete is confirmed', async () => {
    await entries.saveEntry({
      date: '2026-01-01',
      id: 'to-delete',
      reason: 'leave',
    })

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )

    const container = getContainer()
    await renderHistoryView(container, vi.fn())

    const deleteBtn = container.querySelector(
      '.btn-danger',
    ) as HTMLButtonElement
    deleteBtn.click()

    // Wait for async deletion and re-render.
    await vi.waitFor(() => {
      expect(container.querySelector('.empty-state')).toBeTruthy()
    })

    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(0)
  })

  it('does not delete when confirm is cancelled', async () => {
    await entries.saveEntry({
      date: '2026-01-01',
      id: 'keep-me',
      reason: 'office',
    })

    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    )

    const container = getContainer()
    await renderHistoryView(container, vi.fn())

    const deleteBtn = container.querySelector(
      '.btn-danger',
    ) as HTMLButtonElement
    deleteBtn.click()

    // Entry should still be there.
    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(1)
  })

  it('falls back to raw reason string for unknown reasons', async () => {
    // Manually insert an entry with an unrecognised reason via db.
    vi.resetModules()
    const db = await import('../db')
    await db.putEntry({
      date: '2026-01-01',
      id: 'unknown-reason',
      reason: 'custom-reason' as Reason,
    })

    entries = await import('../entries')
    renderHistoryView = (await import('../ui/history-view')).renderHistoryView

    const container = getContainer()
    await renderHistoryView(container, vi.fn())

    const reasons = Array.from(
      container.querySelectorAll('[class*="entry-reason"]'),
    ).map((el) => el.textContent!)
    expect(reasons).toContain('custom-reason')
  })
})
