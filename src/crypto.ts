// Optional PIN-based encryption using Web Crypto API.
// PBKDF2 for key derivation, AES-GCM for encryption.

import type {
  AttendanceEntry,
  EncryptedEnvelope,
  EncryptionMeta,
} from './types'
import { getEncryptionMeta, setEncryptionMeta } from './db'

const PBKDF2_ITERATIONS = 600_000
const SALT_LENGTH = 16
const IV_LENGTH = 12

// Session-scoped key. Never persisted.
let sessionKey: CryptoKey | null = null

// Derive an AES-GCM key from a PIN and salt.
const deriveKey = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Enable encryption: generate a salt, derive the key, persist meta.
export const enableEncryption = async (pin: string): Promise<void> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  sessionKey = await deriveKey(pin, salt)
  const meta: EncryptionMeta = { enabled: true, salt }
  await setEncryptionMeta(meta)
}

// Unlock an existing encrypted store with the given PIN.
// Returns true if the key was derived successfully.
export const unlock = async (pin: string): Promise<boolean> => {
  const meta = await getEncryptionMeta()
  if (!meta.enabled || !meta.salt) return false
  sessionKey = await deriveKey(pin, meta.salt)
  return true
}

// Lock the session (clear the key from memory).
export const lock = (): void => {
  sessionKey = null
}

export const isUnlocked = (): boolean => sessionKey !== null

export const isEncryptionEnabled = async (): Promise<boolean> => {
  const meta = await getEncryptionMeta()
  return meta.enabled
}

// Encrypt an entry, returning an envelope suitable for IndexedDB.
export const encryptEntry = async (
  entry: AttendanceEntry,
): Promise<EncryptedEnvelope> => {
  if (!sessionKey) throw new Error('Session is locked.')
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(JSON.stringify(entry))
  const ciphertext = await crypto.subtle.encrypt(
    { iv, name: 'AES-GCM' },
    sessionKey,
    encoded,
  )
  return { id: entry.id, iv, ciphertext }
}

// Decrypt an envelope back into an AttendanceEntry.
export const decryptEntry = async (
  envelope: EncryptedEnvelope,
): Promise<AttendanceEntry> => {
  if (!sessionKey) throw new Error('Session is locked.')
  const plaintext = await crypto.subtle.decrypt(
    { iv: envelope.iv as BufferSource, name: 'AES-GCM' },
    sessionKey,
    envelope.ciphertext,
  )
  const json = new TextDecoder().decode(plaintext)
  return JSON.parse(json) as AttendanceEntry
}
