// Mediator between the UI and the storage/crypto layers.
// Handles encrypting, decrypting, and migrating entries transparently.

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

// Encrypt any plaintext entries still in the store.
// Called after enableEncryption to migrate existing data.
export const migrateEntriesToEncrypted = async (): Promise<void> => {
  const raw = await db.getAllEntries()
  for (const item of raw) {
    if (!('ciphertext' in item)) {
      const envelope = await enc.encryptEntry(item as AttendanceEntry)
      await db.putEntry(envelope)
    }
  }
}

// Change the encryption PIN. Session must be unlocked with the current PIN.
// Decrypts all entries with the old key, re-keys, then re-encrypts everything.
export const changeEncryptionPin = async (newPin: string): Promise<void> => {
  const plainEntries = await loadAllEntries()
  await enc.changePin(newPin)
  for (const entry of plainEntries) {
    const envelope = await enc.encryptEntry(entry)
    await db.putEntry(envelope)
  }
}

// Disable encryption: decrypt all entries and store as plaintext, then clear meta.
export const disableEncryption = async (): Promise<void> => {
  const plainEntries = await loadAllEntries()
  await enc.clearEncryptionMeta()
  for (const entry of plainEntries) {
    await db.putEntry(entry)
  }
}
