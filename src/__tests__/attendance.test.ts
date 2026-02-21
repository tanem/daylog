// Unit tests for the attendance percentage calculator.

import { describe, expect, it } from 'vitest'
import type { AttendanceEntry, AttendanceSettings } from '../types'
import { calculateAttendance } from '../attendance'

// Helper to build an entry for a given date and reason.
const entry = (
  date: string,
  reason: AttendanceEntry['reason'],
): AttendanceEntry => ({
  id: date,
  date,
  reason,
})

// Default settings: 60% target, 1-week window.
const settings = (
  overrides?: Partial<AttendanceSettings>,
): AttendanceSettings => ({
  enabled: true,
  weeks: 1,
  percentage: 60,
  ...overrides,
})

describe('calculateAttendance', () => {
  // 2026-02-22 is a Sunday. A 1-week window (7 days) covers
  // Sun 22 Feb back to Mon 16 Feb, giving weekdays Mon 16 – Fri 20.

  it('returns 100% when all weekdays are office days', () => {
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-17', 'office'),
      entry('2026-02-18', 'office'),
      entry('2026-02-19', 'office'),
      entry('2026-02-20', 'office'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(5)
    expect(stats.total).toBe(5)
    expect(stats.percentage).toBe(100)
    expect(stats.target).toBe(60)
  })

  it('returns 60% for 3 office days out of 5', () => {
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-18', 'office'),
      entry('2026-02-19', 'office'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(3)
    expect(stats.total).toBe(5)
    expect(stats.percentage).toBe(60)
  })

  it('returns 0% when no entries exist', () => {
    const stats = calculateAttendance([], settings(), '2026-02-22')
    expect(stats.attended).toBe(0)
    expect(stats.total).toBe(5)
    expect(stats.percentage).toBe(0)
  })

  it('excludes leave days from the denominator', () => {
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-17', 'office'),
      entry('2026-02-18', 'office'),
      entry('2026-02-19', 'leave'),
      entry('2026-02-20', 'leave'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    // 3 office / 3 counted = 100%
    expect(stats.attended).toBe(3)
    expect(stats.total).toBe(3)
    expect(stats.percentage).toBe(100)
  })

  it('excludes sick days from the denominator', () => {
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-17', 'sick'),
      entry('2026-02-18', 'office'),
      entry('2026-02-19', 'office'),
      entry('2026-02-20', 'sick'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(3)
    expect(stats.total).toBe(3)
    expect(stats.percentage).toBe(100)
  })

  it('excludes public holidays from the denominator', () => {
    // Holiday on Friday: 4 counted days, 3 attended.
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-18', 'office'),
      entry('2026-02-19', 'office'),
      entry('2026-02-20', 'public-holiday'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(3)
    expect(stats.total).toBe(4)
    expect(stats.percentage).toBe(75)
  })

  it('does not count WFH as attendance', () => {
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-17', 'wfh'),
      entry('2026-02-18', 'office'),
      entry('2026-02-19', 'wfh'),
      entry('2026-02-20', 'office'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(3)
    expect(stats.total).toBe(5)
    expect(stats.percentage).toBe(60)
  })

  it('counts unlogged weekdays against attendance', () => {
    // Only Mon and Tue logged as office, rest unlogged.
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-17', 'office'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(2)
    expect(stats.total).toBe(5)
    expect(stats.percentage).toBe(40)
  })

  it('ignores entries outside the rolling window', () => {
    const entries = [
      // Inside window (Mon 16 – Fri 20 Feb).
      entry('2026-02-16', 'office'),
      // Outside window (previous week).
      entry('2026-02-09', 'office'),
      entry('2026-02-10', 'office'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(1)
    expect(stats.total).toBe(5)
    expect(stats.percentage).toBe(20)
  })

  it('handles a 2-week window', () => {
    // 2 weeks back from Sun 22 Feb = Mon 9 – Fri 20: 10 weekdays.
    const entries = [
      entry('2026-02-09', 'office'),
      entry('2026-02-10', 'office'),
      entry('2026-02-11', 'office'),
      entry('2026-02-12', 'office'),
      entry('2026-02-13', 'office'),
      entry('2026-02-16', 'office'),
      entry('2026-02-17', 'office'),
      entry('2026-02-18', 'office'),
    ]
    const stats = calculateAttendance(
      entries,
      settings({ weeks: 2 }),
      '2026-02-22',
    )
    expect(stats.attended).toBe(8)
    expect(stats.total).toBe(10)
    expect(stats.percentage).toBe(80)
  })

  it('returns 0% when all days are dead days', () => {
    const entries = [
      entry('2026-02-16', 'leave'),
      entry('2026-02-17', 'sick'),
      entry('2026-02-18', 'public-holiday'),
      entry('2026-02-19', 'leave'),
      entry('2026-02-20', 'sick'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(0)
    expect(stats.total).toBe(0)
    expect(stats.percentage).toBe(0)
  })

  it('includes today when today is a weekday', () => {
    // 2026-02-20 is a Friday. 1-week window = Sat 14 back to Fri 20.
    // Weekdays: Mon 16, Tue 17, Wed 18, Thu 19, Fri 20.
    const entries = [entry('2026-02-20', 'office')]
    const stats = calculateAttendance(entries, settings(), '2026-02-20')
    expect(stats.attended).toBe(1)
    expect(stats.total).toBe(5)
    expect(stats.percentage).toBe(20)
  })

  it('uses the target from settings', () => {
    const stats = calculateAttendance(
      [],
      settings({ percentage: 75 }),
      '2026-02-22',
    )
    expect(stats.target).toBe(75)
  })

  it('handles a mixed week with all reason types', () => {
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-17', 'wfh'),
      entry('2026-02-18', 'leave'),
      entry('2026-02-19', 'sick'),
      entry('2026-02-20', 'public-holiday'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    // Dead: Wed (leave), Thu (sick), Fri (holiday) = 3 dead.
    // Counted: Mon (office) + Tue (wfh) = 2 total, 1 attended.
    expect(stats.attended).toBe(1)
    expect(stats.total).toBe(2)
    expect(stats.percentage).toBe(50)
  })

  it('handles today being a Monday (window starts mid-week)', () => {
    // 2026-02-16 is a Monday. 1-week window = Tue 10 back to Mon 16.
    // Weekdays: Tue 10, Wed 11, Thu 12, Fri 13, Mon 16.
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-13', 'office'),
      entry('2026-02-12', 'office'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-16')
    expect(stats.attended).toBe(3)
    expect(stats.total).toBe(5)
    expect(stats.percentage).toBe(60)
  })

  it('rounds percentage to nearest integer', () => {
    // 1 of 3 = 33.33...% → 33%.
    const entries = [
      entry('2026-02-16', 'office'),
      entry('2026-02-17', 'leave'),
      entry('2026-02-18', 'leave'),
    ]
    const stats = calculateAttendance(entries, settings(), '2026-02-22')
    expect(stats.attended).toBe(1)
    expect(stats.total).toBe(3)
    expect(stats.percentage).toBe(33)
  })
})
