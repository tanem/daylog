// IndexedDB access layer.

import type {
  AttendanceEntry,
  AttendanceSettings,
  EncryptedEnvelope,
  EncryptionMeta,
} from './types'

const DB_NAME = 'daylog'
const DB_VERSION = 1
const ENTRIES_STORE = 'entries'
const META_STORE = 'meta'

let dbInstance: IDBDatabase | null = null

// Open (or create) the database and return a reference.
const openDb = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      /* v8 ignore start */
      if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
        db.createObjectStore(ENTRIES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' })
      }
      /* v8 ignore stop */
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    /* v8 ignore start */
    request.onerror = () => reject(request.error)
    /* v8 ignore stop */
  })
}

// Generic helper to run a single-store transaction.
const tx = (
  storeName: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> =>
  openDb().then((db) => {
    const transaction = db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  })

// ---------- Entries ----------

export const putEntry = async (
  entry: AttendanceEntry | EncryptedEnvelope,
): Promise<void> => {
  const store = await tx(ENTRIES_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.put(entry)
    req.onsuccess = () => resolve()
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

export const getEntry = async (
  id: string,
): Promise<AttendanceEntry | EncryptedEnvelope | undefined> => {
  const store = await tx(ENTRIES_STORE, 'readonly')
  return new Promise((resolve, reject) => {
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result ?? undefined)
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

export const getAllEntries = async (): Promise<
  (AttendanceEntry | EncryptedEnvelope)[]
> => {
  const store = await tx(ENTRIES_STORE, 'readonly')
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

export const deleteEntry = async (id: string): Promise<void> => {
  const store = await tx(ENTRIES_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

export const clearAllEntries = async (): Promise<void> => {
  const store = await tx(ENTRIES_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.clear()
    req.onsuccess = () => resolve()
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

// ---------- Encryption meta ----------

export const getEncryptionMeta = async (): Promise<EncryptionMeta> => {
  const store = await tx(META_STORE, 'readonly')
  return new Promise((resolve, reject) => {
    const req = store.get('encryption')
    req.onsuccess = () => {
      if (req.result) {
        resolve(req.result as EncryptionMeta)
      } else {
        resolve({ enabled: false })
      }
    }
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

export const setEncryptionMeta = async (
  meta: EncryptionMeta,
): Promise<void> => {
  const store = await tx(META_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.put({ key: 'encryption', ...meta })
    req.onsuccess = () => resolve()
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

// ---------- Attendance settings ----------

const DEFAULT_ATTENDANCE: AttendanceSettings = {
  enabled: false,
  weeks: 8,
  percentage: 60,
}

export const getAttendanceSettings = async (): Promise<AttendanceSettings> => {
  const store = await tx(META_STORE, 'readonly')
  return new Promise((resolve, reject) => {
    const req = store.get('attendance')
    req.onsuccess = () => {
      if (req.result) {
        const raw = req.result as AttendanceSettings & { key: string }
        resolve({
          enabled: raw.enabled,
          weeks: raw.weeks,
          percentage: raw.percentage,
        })
      } else {
        resolve({ ...DEFAULT_ATTENDANCE })
      }
    }
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

export const setAttendanceSettings = async (
  settings: AttendanceSettings,
): Promise<void> => {
  const store = await tx(META_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.put({ key: 'attendance', ...settings })
    req.onsuccess = () => resolve()
    /* v8 ignore start */
    req.onerror = () => reject(req.error)
    /* v8 ignore stop */
  })
}

// ---------- Full wipe ----------

export const deleteAllData = async (): Promise<void> => {
  const db = await openDb()
  const storeNames = Array.from(db.objectStoreNames)
  const transaction = db.transaction(storeNames, 'readwrite')
  for (const name of storeNames) {
    transaction.objectStore(name).clear()
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    /* v8 ignore start */
    transaction.onerror = () => reject(transaction.error)
    /* v8 ignore stop */
  })
}
