// Integration tests for the settings mediator and DB persistence.

import { beforeEach, describe, expect, it, vi } from 'vitest'

let db: typeof import('../db')
let settings: typeof import('../settings')

beforeEach(async () => {
  vi.resetModules()
  db = await import('../db')
  settings = await import('../settings')
})

describe('attendance settings', () => {
  it('returns defaults when nothing is saved', async () => {
    const result = await settings.loadAttendanceSettings()
    expect(result).toEqual({ enabled: false, weeks: 8, percentage: 60 })
  })

  it('persists and loads enabled settings', async () => {
    await settings.saveAttendanceSettings({
      enabled: true,
      weeks: 4,
      percentage: 75,
    })
    const result = await settings.loadAttendanceSettings()
    expect(result).toEqual({ enabled: true, weeks: 4, percentage: 75 })
  })

  it('overwrites previous settings', async () => {
    await settings.saveAttendanceSettings({
      enabled: true,
      weeks: 8,
      percentage: 60,
    })
    await settings.saveAttendanceSettings({
      enabled: false,
      weeks: 2,
      percentage: 50,
    })
    const result = await settings.loadAttendanceSettings()
    expect(result).toEqual({ enabled: false, weeks: 2, percentage: 50 })
  })

  it('round-trips through db accessors directly', async () => {
    await db.setAttendanceSettings({
      enabled: true,
      weeks: 12,
      percentage: 80,
    })
    const result = await db.getAttendanceSettings()
    expect(result).toEqual({ enabled: true, weeks: 12, percentage: 80 })
  })

  it('is cleared by deleteAllData', async () => {
    await settings.saveAttendanceSettings({
      enabled: true,
      weeks: 6,
      percentage: 70,
    })
    await db.deleteAllData()
    const result = await settings.loadAttendanceSettings()
    expect(result).toEqual({ enabled: false, weeks: 8, percentage: 60 })
  })
})
