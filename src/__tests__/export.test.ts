// Unit tests for export.ts: JSON, CSV, and file download.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AttendanceEntry } from '../types'
import { download, toCSV, toJSON } from '../export'

const ENTRIES: AttendanceEntry[] = [
  { id: '1', date: '2026-02-20', reason: 'office', notes: 'Morning standup' },
  { id: '2', date: '2026-02-21', reason: 'wfh' },
]

describe('toJSON', () => {
  it('produces formatted JSON with all fields', () => {
    const result = toJSON(ENTRIES)
    const parsed = JSON.parse(result) as AttendanceEntry[]
    expect(parsed).toEqual(ENTRIES)
  })

  it('returns empty array JSON for no entries', () => {
    expect(toJSON([])).toBe('[]')
  })
})

describe('toCSV', () => {
  it('includes header row and data rows', () => {
    const csv = toCSV(ENTRIES)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('id,date,reason,notes')
    expect(lines[1]).toBe('1,2026-02-20,office,Morning standup')
    // Entry without notes: empty string in notes column.
    expect(lines[2]).toBe('2,2026-02-21,wfh,')
  })

  it('wraps fields containing commas in double quotes', () => {
    const entry: AttendanceEntry = {
      date: '2026-01-01',
      id: '3',
      notes: 'meeting, then lunch',
      reason: 'office',
    }
    const csv = toCSV([entry])
    const dataLine = csv.split('\n')[1]!
    expect(dataLine).toContain('"meeting, then lunch"')
  })

  it('escapes double quotes within fields', () => {
    const entry: AttendanceEntry = {
      date: '2026-01-01',
      id: '4',
      notes: 'said "hello"',
      reason: 'office',
    }
    const csv = toCSV([entry])
    const dataLine = csv.split('\n')[1]!
    expect(dataLine).toContain('"said ""hello"""')
  })

  it('wraps fields containing newlines in double quotes', () => {
    const entry: AttendanceEntry = {
      date: '2026-01-01',
      id: '5',
      notes: 'line one\nline two',
      reason: 'office',
    }
    const csv = toCSV([entry])
    expect(csv).toContain('"line one\nline two"')
  })

  it('returns only header for empty entries', () => {
    const csv = toCSV([])
    expect(csv).toBe('id,date,reason,notes')
  })
})

describe('download', () => {
  let clickSpy: ReturnType<typeof vi.fn>
  let appendChildSpy: ReturnType<typeof vi.fn>
  let removeChildSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    clickSpy = vi.fn()
    appendChildSpy = vi.spyOn(document.body, 'appendChild')
    removeChildSpy = vi.spyOn(document.body, 'removeChild')

    // jsdom does not support createObjectURL; stub it.
    vi.stubGlobal(
      'URL',
      Object.assign(new URL('http://localhost'), {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn(),
      }),
    )

    // Stub HTMLAnchorElement.click.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy)
  })

  it('creates a blob URL, clicks the anchor, and cleans up', () => {
    download('hello', 'test.txt', 'text/plain')

    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(appendChildSpy).toHaveBeenCalledOnce()
    expect(removeChildSpy).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    // Check the anchor attributes.
    const anchor = appendChildSpy.mock.calls[0]![0] as HTMLAnchorElement
    expect(anchor.download).toBe('test.txt')
    expect(anchor.href).toBe('blob:mock-url')
  })
})
