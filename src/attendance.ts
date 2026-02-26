// Attendance percentage calculator.
// Pure function: takes entries and settings, returns stats.

import { toISODate } from './date-utils'
import type {
  AttendanceEntry,
  AttendanceSettings,
  AttendanceStats,
} from './types'

// Check whether a Date falls on a weekday (Mon–Fri).
const isWeekday = (d: Date): boolean => {
  const dow = d.getDay()
  return dow >= 1 && dow <= 5
}

/**
 * Calculate rolling attendance over the configured window.
 *
 * Numerator: days logged as 'office'.
 * Denominator: weekdays in the window minus dead days (leave, sick, public-holiday).
 * WFH and unlogged weekdays remain in the denominator but are not attended.
 */
export const calculateAttendance = (
  entries: AttendanceEntry[],
  settings: AttendanceSettings,
  today?: string,
): AttendanceStats => {
  const lookup = new Map<string, AttendanceEntry['reason']>()
  for (const e of entries) {
    lookup.set(e.date, e.reason)
  }

  const totalDays = settings.weeks * 7
  const start = today ? new Date(`${today}T00:00:00`) : new Date()
  if (!today) {
    // Normalise to midnight local time.
    start.setHours(0, 0, 0, 0)
  }

  let attended = 0
  let total = 0

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() - i)

    if (!isWeekday(d)) continue

    const iso = toISODate(d)
    const reason = lookup.get(iso)

    if (
      reason === 'leave' ||
      reason === 'sick' ||
      reason === 'public-holiday'
    ) {
      // Dead day: excluded from both numerator and denominator.
      continue
    }

    total++
    if (reason === 'office') {
      attended++
    }
    // 'wfh' or no entry: stays in denominator, not attended.
  }

  return {
    attended,
    total,
    percentage: total > 0 ? Math.round((attended / total) * 100) : 0,
    target: settings.percentage,
  }
}
