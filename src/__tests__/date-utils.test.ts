// Tests for date validation (isValidDate).

import { describe, expect, it } from 'vitest'
import { isValidDate } from '../date-utils'

describe('isValidDate', () => {
  it('accepts a valid date', () => {
    expect(isValidDate('2026-02-20')).toBe(true)
  })

  it('accepts leap day in a leap year', () => {
    expect(isValidDate('2024-02-29')).toBe(true)
  })

  it('rejects wrong format', () => {
    expect(isValidDate('20-02-2026')).toBe(false)
    expect(isValidDate('2026/02/20')).toBe(false)
    expect(isValidDate('not-a-date')).toBe(false)
  })

  it('rejects invalid calendar date (e.g. Feb 30)', () => {
    expect(isValidDate('2026-02-30')).toBe(false)
  })

  it('rejects leap day in a non-leap year', () => {
    expect(isValidDate('2025-02-29')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidDate('')).toBe(false)
  })

  it('rejects a date that matches the pattern but produces NaN', () => {
    expect(isValidDate('0000-00-00')).toBe(false)
  })
})
