// Encryption lifecycle: enable/disable encryption, change PIN, migrate entries.
// All multi-entry operations use atomicRekey for crash safety.

import { loadAllEntries, prepareEntry } from './entries'
import * as enc from './crypto'
import { atomicRekey } from './db'

// Encrypt any plaintext entries still in the store.
// Called after enableEncryption to migrate existing data.
export const migrateEntriesToEncrypted = async (): Promise<void> => {
  const all = await loadAllEntries()
  const prepared = await Promise.all(all.map(prepareEntry))
  await atomicRekey(prepared)
}

// Change the encryption PIN. Session must be unlocked with the current PIN.
// Decrypts all entries with the old key, derives a new key, re-encrypts
// everything, then writes entries + new meta in a single transaction.
export const changeEncryptionPin = async (newPin: string): Promise<void> => {
  const plainEntries = await loadAllEntries()
  const meta = await enc.changePin(newPin)
  try {
    const prepared = await Promise.all(plainEntries.map(prepareEntry))
    await atomicRekey(prepared, meta)
  } catch (err) {
    // changePin already set the in-memory key to the new derivation, but the
    // persisted data still uses the old key. Lock the session so the user
    // must re-unlock with their old (still-valid) PIN.
    enc.lock()
    throw err
  }
}

// Disable encryption: decrypt all entries, then write them as plaintext + clear
// meta in a single transaction.
export const disableEncryption = async (): Promise<void> => {
  const plainEntries = await loadAllEntries()
  enc.lock()
  await atomicRekey(plainEntries, { enabled: false })
}
