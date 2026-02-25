// Optional PIN-based encryption using Web Crypto API.
// PBKDF2 for key derivation, AES-GCM for encryption.
// A verification tag (encrypted sentinel) lets unlock() reject wrong PINs.

import type {
  AttendanceEntry,
  EncryptedEnvelope,
  EncryptionMeta,
} from './types'
import { getEncryptionMeta, setEncryptionMeta } from './db'

const PBKDF2_ITERATIONS = 600_000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const VERIFICATION_SENTINEL = 'daylog-pin-check'

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

// Encrypt the sentinel string with the given key, returning iv + ciphertext.
const createVerificationTag = async (
  key: CryptoKey,
): Promise<{ iv: Uint8Array; tag: ArrayBuffer }> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(VERIFICATION_SENTINEL)
  const tag = await crypto.subtle.encrypt({ iv, name: 'AES-GCM' }, key, encoded)
  return { iv, tag }
}

// Enable encryption: generate a salt, derive the key, create verification tag, persist meta.
export const enableEncryption = async (pin: string): Promise<void> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  sessionKey = await deriveKey(pin, salt)
  const { iv, tag } = await createVerificationTag(sessionKey)
  const meta: EncryptionMeta = {
    enabled: true,
    salt,
    verificationIv: iv,
    verificationTag: tag,
  }
  await setEncryptionMeta(meta)
}

// Unlock an existing encrypted store with the given PIN.
// Verifies the PIN by decrypting the verification tag. Returns false on wrong PIN.
export const unlock = async (pin: string): Promise<boolean> => {
  const meta = await getEncryptionMeta()
  if (!meta.enabled || !meta.salt) return false
  const key = await deriveKey(pin, meta.salt)

  // Verify the PIN against the stored verification tag.
  if (meta.verificationIv && meta.verificationTag) {
    try {
      const plaintext = await crypto.subtle.decrypt(
        { iv: meta.verificationIv as BufferSource, name: 'AES-GCM' },
        key,
        meta.verificationTag,
      )
      const text = new TextDecoder().decode(plaintext)
      /* v8 ignore start */
      // AES-GCM guarantees authenticity: if decryption succeeds the plaintext is correct.
      // This guard is pure defence-in-depth and cannot be reached in practice.
      if (text !== VERIFICATION_SENTINEL) return false
      /* v8 ignore stop */
    } catch {
      // AES-GCM authentication failure: wrong PIN.
      return false
    }
  }

  sessionKey = key
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

// Change the encryption PIN. Session must be unlocked.
// Generates a new salt and key, updates the verification tag.
// Callers must re-encrypt entries separately before calling this.
export const changePin = async (newPin: string): Promise<void> => {
  if (!sessionKey) throw new Error('Session is locked.')
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  sessionKey = await deriveKey(newPin, salt)
  const { iv, tag } = await createVerificationTag(sessionKey)
  const meta: EncryptionMeta = {
    enabled: true,
    salt,
    verificationIv: iv,
    verificationTag: tag,
  }
  await setEncryptionMeta(meta)
}

// Clear encryption metadata and lock the session.
export const clearEncryptionMeta = async (): Promise<void> => {
  sessionKey = null
  await setEncryptionMeta({ enabled: false })
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
