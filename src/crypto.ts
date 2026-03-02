// Optional PIN-based encryption using Web Crypto API.
// PBKDF2 for key derivation, AES-GCM for encryption.
// A verification tag (encrypted sentinel) lets unlock() reject wrong PINs.

import type {
  AttendanceEntry,
  EncryptedEnvelope,
  EncryptionMeta,
  UnlockResult,
} from './types'
import {
  clearFailedAttempts,
  deleteAllData,
  getEncryptionMeta,
  getFailedAttempts,
  setEncryptionMeta,
  setFailedAttempts,
} from './db'

const PBKDF2_ITERATIONS = 600_000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const VERIFICATION_SENTINEL = 'daylog-pin-check'
const MAX_ATTEMPTS = 15
export const MIN_PIN_LENGTH = 6

// Cooldown durations (ms) by attempt count.
// Attempts 1-4: no delay. 5-7: 30s. 8-10: 5min. 11-14: 30min. 15: wipe.
const getCooldownMs = (attempts: number): number => {
  if (attempts < 5) return 0
  if (attempts < 8) return 30_000
  if (attempts < 11) return 5 * 60_000
  return 30 * 60_000
}

// Session-scoped key. Never persisted.
let sessionKey: CryptoKey | null = null

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

const createVerificationTag = async (
  key: CryptoKey,
): Promise<{ iv: Uint8Array; tag: ArrayBuffer }> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(VERIFICATION_SENTINEL)
  const tag = await crypto.subtle.encrypt({ iv, name: 'AES-GCM' }, key, encoded)
  return { iv, tag }
}

export const enableEncryption = async (pin: string): Promise<void> => {
  if (pin.length < MIN_PIN_LENGTH) throw new Error('PIN too short.')
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

// Enforces exponential backoff after repeated failures and wipes data at MAX_ATTEMPTS.
export const unlock = async (pin: string): Promise<UnlockResult> => {
  const meta = await getEncryptionMeta()
  if (!meta.enabled || !meta.salt) return { success: false }
  if (!meta.verificationIv || !meta.verificationTag) return { success: false }

  const attempts = await getFailedAttempts()
  const cooldown = getCooldownMs(attempts.count)
  if (cooldown > 0) {
    const elapsed = Date.now() - attempts.lastAttemptAt
    if (elapsed < cooldown) {
      return { success: false, locked: true, retryAfterMs: cooldown - elapsed }
    }
  }

  const key = await deriveKey(pin, meta.salt)

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
    if (text !== VERIFICATION_SENTINEL) return { success: false }
    /* v8 ignore stop */
  } catch {
    // AES-GCM authentication failure: wrong PIN.
    const newCount = attempts.count + 1
    if (newCount >= MAX_ATTEMPTS) {
      sessionKey = null
      await deleteAllData()
      return { success: false, wiped: true }
    }
    await setFailedAttempts({ count: newCount, lastAttemptAt: Date.now() })
    const nextCooldown = getCooldownMs(newCount)
    if (nextCooldown > 0) {
      return { success: false, locked: true, retryAfterMs: nextCooldown }
    }
    return { success: false }
  }

  await clearFailedAttempts()
  sessionKey = key
  return { success: true }
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

// Returns the new meta for the caller to persist atomically with re-encrypted entries.
export const changePin = async (newPin: string): Promise<EncryptionMeta> => {
  if (!sessionKey) throw new Error('Session is locked.')
  if (newPin.length < MIN_PIN_LENGTH) throw new Error('PIN too short.')
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  sessionKey = await deriveKey(newPin, salt)
  const { iv, tag } = await createVerificationTag(sessionKey)
  return {
    enabled: true,
    salt,
    verificationIv: iv,
    verificationTag: tag,
  }
}

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
