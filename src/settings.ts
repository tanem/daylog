// Mediator between the UI and settings storage.
// UI code imports this instead of db.ts directly.

import type { AttendanceSettings } from './types'
import * as db from './db'

export const loadAttendanceSettings = async (): Promise<AttendanceSettings> =>
  db.getAttendanceSettings()

export const saveAttendanceSettings = async (
  settings: AttendanceSettings,
): Promise<void> => {
  await db.setAttendanceSettings(settings)
}
