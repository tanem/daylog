// IndexedDB access layer. Zero wrapper libraries.

import type { AttendanceEntry, EncryptedEnvelope, EncryptionMeta } from './types'

const DB_NAME = 'daylog'
const DB_VERSION = 1
const ENTRIES_STORE = 'entries'
const META_STORE = 'meta'

let dbInstance: IDBDatabase | null = null

// Open (or create) the database and return a reference.
function openDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
        db.createObjectStore(ENTRIES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onerror = () => reject(request.error)
  })
}

// Generic helper to run a single-store transaction.
function tx(
  storeName: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  return openDb().then((db) => {
    const transaction = db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  })
}

// ---------- Entries ----------

export async function putEntry(
  entry: AttendanceEntry | EncryptedEnvelope,
): Promise<void> {
  const store = await tx(ENTRIES_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.put(entry)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getEntry(
  id: string,
): Promise<AttendanceEntry | EncryptedEnvelope | undefined> {
  const store = await tx(ENTRIES_STORE, 'readonly')
  return new Promise((resolve, reject) => {
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result ?? undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllEntries(): Promise<
  (AttendanceEntry | EncryptedEnvelope)[]
> {
  const store = await tx(ENTRIES_STORE, 'readonly')
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteEntry(id: string): Promise<void> {
  const store = await tx(ENTRIES_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function clearAllEntries(): Promise<void> {
  const store = await tx(ENTRIES_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ---------- Encryption meta ----------

export async function getEncryptionMeta(): Promise<EncryptionMeta> {
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
    req.onerror = () => reject(req.error)
  })
}

export async function setEncryptionMeta(
  meta: EncryptionMeta,
): Promise<void> {
  const store = await tx(META_STORE, 'readwrite')
  return new Promise((resolve, reject) => {
    const req = store.put({ key: 'encryption', ...meta })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ---------- Full wipe ----------

export async function deleteAllData(): Promise<void> {
  const db = await openDb()
  const storeNames = Array.from(db.objectStoreNames)
  const transaction = db.transaction(storeNames, 'readwrite')
  for (const name of storeNames) {
    transaction.objectStore(name).clear()
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
