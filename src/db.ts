// IndexedDB access layer. Uses idb for a promise-based API.

import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type {
  AttendanceEntry,
  AttendanceSettings,
  EncryptedEnvelope,
  EncryptionMeta,
} from './types'

const DB_NAME = 'daylog'
const DB_VERSION = 1

interface DaylogSchema extends DBSchema {
  entries: {
    key: string
    value: AttendanceEntry | EncryptedEnvelope
  }
  meta: {
    key: string
    value: { key: string } & Record<string, unknown>
  }
}

let dbInstance: IDBPDatabase<DaylogSchema> | null = null

const getDb = async (): Promise<IDBPDatabase<DaylogSchema>> => {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<DaylogSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      /* v8 ignore start */
      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
      /* v8 ignore stop */
    },
  })

  return dbInstance
}

// ---------- Entries ----------

export const putEntry = async (
  entry: AttendanceEntry | EncryptedEnvelope,
): Promise<void> => {
  const db = await getDb()
  await db.put('entries', entry)
}

export const getEntry = async (
  id: string,
): Promise<AttendanceEntry | EncryptedEnvelope | undefined> => {
  const db = await getDb()
  return db.get('entries', id)
}

export const getAllEntries = async (): Promise<
  (AttendanceEntry | EncryptedEnvelope)[]
> => {
  const db = await getDb()
  return db.getAll('entries')
}

export const deleteEntry = async (id: string): Promise<void> => {
  const db = await getDb()
  await db.delete('entries', id)
}

export const clearAllEntries = async (): Promise<void> => {
  const db = await getDb()
  await db.clear('entries')
}

// ---------- Encryption meta ----------

export const getEncryptionMeta = async (): Promise<EncryptionMeta> => {
  const db = await getDb()
  const result = await db.get('meta', 'encryption')
  return result ? (result as unknown as EncryptionMeta) : { enabled: false }
}

export const setEncryptionMeta = async (
  meta: EncryptionMeta,
): Promise<void> => {
  const db = await getDb()
  await db.put('meta', { key: 'encryption', ...meta })
}

// ---------- Attendance settings ----------

const DEFAULT_ATTENDANCE: AttendanceSettings = {
  enabled: false,
  weeks: 8,
  percentage: 60,
}

export const getAttendanceSettings = async (): Promise<AttendanceSettings> => {
  const db = await getDb()
  const result = await db.get('meta', 'attendance')
  if (!result) return { ...DEFAULT_ATTENDANCE }
  const raw = result as unknown as AttendanceSettings & { key: string }
  return { enabled: raw.enabled, weeks: raw.weeks, percentage: raw.percentage }
}

export const setAttendanceSettings = async (
  settings: AttendanceSettings,
): Promise<void> => {
  const db = await getDb()
  await db.put('meta', { key: 'attendance', ...settings })
}

// ---------- Full wipe ----------

export const deleteAllData = async (): Promise<void> => {
  const db = await getDb()
  const tx = db.transaction(
    Array.from(db.objectStoreNames) as ('entries' | 'meta')[],
    'readwrite',
  )
  for (const name of tx.objectStoreNames) {
    tx.objectStore(name).clear()
  }
  await tx.done
}
