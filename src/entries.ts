// Entry CRUD mediator between the UI and the storage/crypto layers.

import type { AttendanceEntry, EncryptedEnvelope } from './types'
import * as db from './db'
import * as enc from './crypto'

// Generate a unique ID for a new entry.
const newId = (): string => crypto.randomUUID()

// Save a new or existing entry. Encrypts if encryption is enabled.
export const saveEntry = async (
  entry: Omit<AttendanceEntry, 'id'> & { id?: string },
): Promise<AttendanceEntry> => {
  const full: AttendanceEntry = { ...entry, id: entry.id ?? newId() }
  const encrypted = await enc.isEncryptionEnabled()
  if (encrypted) {
    const envelope = await enc.encryptEntry(full)
    await db.putEntry(envelope)
  } else {
    await db.putEntry(full)
  }
  return full
}

// Retrieve all entries, decrypting if necessary.
export const loadAllEntries = async (): Promise<AttendanceEntry[]> => {
  const raw = await db.getAllEntries()
  const encrypted = await enc.isEncryptionEnabled()
  if (!encrypted) {
    return raw as AttendanceEntry[]
  }
  const results: AttendanceEntry[] = []
  for (const item of raw) {
    // Encrypted items have a ciphertext property.
    if ('ciphertext' in item) {
      results.push(await enc.decryptEntry(item as EncryptedEnvelope))
    } else {
      results.push(item as AttendanceEntry)
    }
  }
  return results
}

export const removeEntry = async (id: string): Promise<void> => {
  await db.deleteEntry(id)
}

export const wipeAllData = async (): Promise<void> => {
  await db.deleteAllData()
}
