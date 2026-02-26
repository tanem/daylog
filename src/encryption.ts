// Encryption lifecycle: enable/disable encryption, change PIN, migrate entries.

import { loadAllEntries, saveEntry } from './entries'
import * as enc from './crypto'

// Encrypt any plaintext entries still in the store.
// Called after enableEncryption to migrate existing data.
export const migrateEntriesToEncrypted = async (): Promise<void> => {
  const all = await loadAllEntries()
  for (const entry of all) {
    await saveEntry(entry)
  }
}

// Change the encryption PIN. Session must be unlocked with the current PIN.
// Decrypts all entries with the old key, re-keys, then re-encrypts everything.
export const changeEncryptionPin = async (newPin: string): Promise<void> => {
  const plainEntries = await loadAllEntries()
  await enc.changePin(newPin)
  for (const entry of plainEntries) {
    await saveEntry(entry)
  }
}

// Disable encryption: decrypt all entries and store as plaintext, then clear meta.
export const disableEncryption = async (): Promise<void> => {
  const plainEntries = await loadAllEntries()
  await enc.clearEncryptionMeta()
  for (const entry of plainEntries) {
    await saveEntry(entry)
  }
}
