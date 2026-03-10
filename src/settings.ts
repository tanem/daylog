// Mediator between the UI and settings storage.
// UI code imports this instead of db.ts directly.

import type { AttendanceSettings, ThemePreference } from './types'
import * as db from './db'

export const loadAttendanceSettings = async (): Promise<AttendanceSettings> =>
  db.getAttendanceSettings()

export const saveAttendanceSettings = async (
  settings: AttendanceSettings,
): Promise<void> => {
  await db.setAttendanceSettings(settings)
}

export const loadThemePreference = async (): Promise<ThemePreference> =>
  db.getThemePreference()

export const saveThemePreference = async (
  mode: ThemePreference,
): Promise<void> => {
  await db.setThemePreference(mode)
}
