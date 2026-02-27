// Integration tests for the data layer: entries.ts, encryption.ts, db.ts, crypto.ts.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AttendanceEntry } from '../types'

// We need fresh modules per-test to reset the cached dbInstance in db.ts
// and sessionKey in crypto.ts.
let db: typeof import('../db')
let entries: typeof import('../entries')
let encryption: typeof import('../encryption')
let enc: typeof import('../crypto')

beforeEach(async () => {
  vi.resetModules()
  db = await import('../db')
  entries = await import('../entries')
  encryption = await import('../encryption')
  enc = await import('../crypto')
})

describe('entries (plaintext)', () => {
  it('saves and loads an entry', async () => {
    const saved = await entries.saveEntry({
      date: '2026-02-20',
      reason: 'office',
    })

    expect(saved.id).toBeTruthy()
    expect(saved.date).toBe('2026-02-20')
    expect(saved.reason).toBe('office')

    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(1)
    expect(all[0]).toEqual(saved)
  })

  it('preserves an existing id when provided', async () => {
    const saved = await entries.saveEntry({
      date: '2026-02-21',
      id: 'custom-id',
      reason: 'wfh',
    })

    expect(saved.id).toBe('custom-id')
    const all = await entries.loadAllEntries()
    expect(all[0]!.id).toBe('custom-id')
  })

  it('saves optional notes', async () => {
    const saved = await entries.saveEntry({
      date: '2026-01-10',
      notes: 'Team standup',
      reason: 'office',
    })

    const all = await entries.loadAllEntries()
    expect(all[0]!.notes).toBe('Team standup')
    expect(saved.notes).toBe('Team standup')
  })

  it('removes an entry', async () => {
    const saved = await entries.saveEntry({
      date: '2026-02-01',
      reason: 'leave',
    })

    await entries.removeEntry(saved.id)
    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(0)
  })

  it('wipes all data', async () => {
    await entries.saveEntry({ date: '2026-01-01', reason: 'office' })
    await entries.saveEntry({ date: '2026-01-02', reason: 'wfh' })

    await entries.wipeAllData()
    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(0)
  })
})

describe('db direct operations', () => {
  it('putEntry and getEntry round-trip', async () => {
    const entry: AttendanceEntry = {
      date: '2026-03-01',
      id: 'db-test-1',
      reason: 'sick',
    }
    await db.putEntry(entry)
    const result = await db.getEntry('db-test-1')
    expect(result).toEqual(entry)
  })

  it('getEntry returns undefined for missing id', async () => {
    const result = await db.getEntry('nonexistent')
    expect(result).toBeUndefined()
  })

  it('getAllEntries returns all stored entries', async () => {
    await db.putEntry({ date: '2026-03-01', id: 'a', reason: 'office' })
    await db.putEntry({ date: '2026-03-02', id: 'b', reason: 'wfh' })
    const all = await db.getAllEntries()
    expect(all).toHaveLength(2)
  })

  it('deleteEntry removes a specific entry', async () => {
    await db.putEntry({ date: '2026-03-01', id: 'del-1', reason: 'leave' })
    await db.deleteEntry('del-1')
    const result = await db.getEntry('del-1')
    expect(result).toBeUndefined()
  })

  it('clearAllEntries empties the store', async () => {
    await db.putEntry({ date: '2026-03-01', id: 'c1', reason: 'office' })
    await db.clearAllEntries()
    const all = await db.getAllEntries()
    expect(all).toHaveLength(0)
  })

  it('getEncryptionMeta returns disabled by default', async () => {
    const meta = await db.getEncryptionMeta()
    expect(meta.enabled).toBe(false)
  })

  it('setEncryptionMeta persists and retrieves meta', async () => {
    const salt = new Uint8Array([1, 2, 3, 4])
    await db.setEncryptionMeta({ enabled: true, salt })
    const meta = await db.getEncryptionMeta()
    expect(meta.enabled).toBe(true)
    expect(meta.salt).toBeTruthy()
  })

  it('deleteAllData clears all stores', async () => {
    await db.putEntry({ date: '2026-03-01', id: 'x', reason: 'wfh' })
    await db.setEncryptionMeta({
      enabled: true,
      salt: new Uint8Array([1, 2]),
    })
    await db.deleteAllData()
    const allEntries = await db.getAllEntries()
    const meta = await db.getEncryptionMeta()
    expect(allEntries).toHaveLength(0)
    expect(meta.enabled).toBe(false)
  })
})

describe('encryption round-trip', () => {
  const PIN = 'test1234'

  it('enableEncryption sets meta and unlocks session', async () => {
    await enc.enableEncryption(PIN)
    expect(enc.isUnlocked()).toBe(true)

    const enabled = await enc.isEncryptionEnabled()
    expect(enabled).toBe(true)
  })

  it('saves and loads entries through encryption', async () => {
    await enc.enableEncryption(PIN)

    const saved = await entries.saveEntry({
      date: '2026-02-20',
      notes: 'Encrypted note',
      reason: 'office',
    })

    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(1)
    expect(all[0]!.date).toBe('2026-02-20')
    expect(all[0]!.notes).toBe('Encrypted note')
    expect(all[0]!.id).toBe(saved.id)
  })

  it('stored data is actually encrypted (not plaintext)', async () => {
    await enc.enableEncryption(PIN)
    await entries.saveEntry({ date: '2026-02-20', reason: 'office' })

    // Read raw from DB: should have ciphertext, not date/reason fields.
    const raw = await db.getAllEntries()
    expect(raw).toHaveLength(1)
    expect('ciphertext' in raw[0]!).toBe(true)
    expect('date' in raw[0]!).toBe(false)
  })

  it('lock and unlock cycle works', async () => {
    await enc.enableEncryption(PIN)
    await entries.saveEntry({ date: '2026-02-22', reason: 'wfh' })

    enc.lock()
    expect(enc.isUnlocked()).toBe(false)

    const ok = await enc.unlock(PIN)
    expect(ok.success).toBe(true)
    expect(enc.isUnlocked()).toBe(true)

    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(1)
    expect(all[0]!.reason).toBe('wfh')
  })

  it('encrypt throws when session is locked', async () => {
    await enc.enableEncryption(PIN)
    enc.lock()

    await expect(
      enc.encryptEntry({
        date: '2026-01-01',
        id: 'x',
        reason: 'office',
      }),
    ).rejects.toThrow('Session is locked.')
  })

  it('decrypt throws when session is locked', async () => {
    await enc.enableEncryption(PIN)
    const envelope = await enc.encryptEntry({
      date: '2026-01-01',
      id: 'x',
      reason: 'office',
    })
    enc.lock()

    await expect(enc.decryptEntry(envelope)).rejects.toThrow(
      'Session is locked.',
    )
  })

  it('unlock returns unsuccessful when encryption is not enabled', async () => {
    const result = await enc.unlock('anypin')
    expect(result.success).toBe(false)
  })

  it('loadAllEntries handles mixed encrypted and plaintext items', async () => {
    // First save a plaintext entry.
    await db.putEntry({
      date: '2026-01-01',
      id: 'plain-1',
      reason: 'leave',
    } as AttendanceEntry)

    // Then enable encryption and save an encrypted entry.
    await enc.enableEncryption(PIN)
    await entries.saveEntry({ date: '2026-01-02', reason: 'office' })

    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(2)

    const dates = all.map((e) => e.date).sort()
    expect(dates).toEqual(['2026-01-01', '2026-01-02'])
  })

  it('unlock returns unsuccessful for wrong PIN', async () => {
    await enc.enableEncryption(PIN)
    enc.lock()

    const result = await enc.unlock('wrongpin')
    expect(result.success).toBe(false)
    expect(enc.isUnlocked()).toBe(false)
  })

  it('unlock rejects legacy meta without verification tag', async () => {
    // Simulate legacy meta: enabled with salt but no verificationIv/verificationTag.
    const salt = new Uint8Array(16)
    crypto.getRandomValues(salt)
    await db.setEncryptionMeta({ enabled: true, salt })

    const result = await enc.unlock(PIN)
    expect(result.success).toBe(false)
    expect(enc.isUnlocked()).toBe(false)
  })

  it('migrateEntriesToEncrypted encrypts existing plaintext entries', async () => {
    // Save plaintext entries first.
    await db.putEntry({
      date: '2026-01-01',
      id: 'plain-1',
      reason: 'office',
    } as AttendanceEntry)
    await db.putEntry({
      date: '2026-01-02',
      id: 'plain-2',
      reason: 'wfh',
    } as AttendanceEntry)

    // Enable encryption and migrate.
    await enc.enableEncryption(PIN)
    await encryption.migrateEntriesToEncrypted()

    // Raw DB entries should now be encrypted.
    const raw = await db.getAllEntries()
    expect(raw).toHaveLength(2)
    for (const item of raw) {
      expect('ciphertext' in item).toBe(true)
    }

    // Entries are still loadable.
    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(2)
  })

  it('migrateEntriesToEncrypted skips already-encrypted entries', async () => {
    // Enable encryption and save an encrypted entry first.
    await enc.enableEncryption(PIN)
    await entries.saveEntry({ date: '2026-01-01', reason: 'office' })

    // Manually insert a plaintext entry into the DB.
    await db.putEntry({
      date: '2026-01-02',
      id: 'plain-1',
      reason: 'wfh',
    } as AttendanceEntry)

    await encryption.migrateEntriesToEncrypted()

    // Both entries should be encrypted.
    const raw = await db.getAllEntries()
    expect(raw).toHaveLength(2)
    for (const item of raw) {
      expect('ciphertext' in item).toBe(true)
    }

    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(2)
  })

  it('changeEncryptionPin re-encrypts entries with new key', async () => {
    await enc.enableEncryption(PIN)
    await entries.saveEntry({ date: '2026-02-20', reason: 'office' })

    const newPin = 'newpin456'
    await encryption.changeEncryptionPin(newPin)

    // Old PIN should no longer work.
    enc.lock()
    const oldResult = await enc.unlock(PIN)
    expect(oldResult.success).toBe(false)

    // New PIN should work.
    const newResult = await enc.unlock(newPin)
    expect(newResult.success).toBe(true)

    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(1)
    expect(all[0]!.date).toBe('2026-02-20')
  })

  it('disableEncryption decrypts all entries and clears meta', async () => {
    await enc.enableEncryption(PIN)
    await entries.saveEntry({ date: '2026-02-20', reason: 'office' })

    await encryption.disableEncryption()

    // Encryption should be disabled.
    const enabled = await enc.isEncryptionEnabled()
    expect(enabled).toBe(false)

    // Session should be locked.
    expect(enc.isUnlocked()).toBe(false)

    // Entries should be readable as plaintext.
    const all = await entries.loadAllEntries()
    expect(all).toHaveLength(1)
    expect(all[0]!.date).toBe('2026-02-20')

    // Raw DB entries should be plaintext (no ciphertext).
    const raw = await db.getAllEntries()
    expect('ciphertext' in raw[0]!).toBe(false)
  })

  it('changePin throws when session is locked', async () => {
    await enc.enableEncryption(PIN)
    enc.lock()

    await expect(enc.changePin('newpin')).rejects.toThrow('Session is locked.')
  })
})

// These tests exercise the real PBKDF2 derivation (600k iterations) per unlock
// call. Each call takes ~150-300ms, so tests looping multiple failures are
// intentionally slow: this validates the full crypto integration rather than
// mocking it away.
describe('brute-force protection', () => {
  const PIN = 'test1234'

  it('allows first 4 failed attempts without delay', async () => {
    await enc.enableEncryption(PIN)
    enc.lock()

    for (let i = 0; i < 4; i++) {
      const result = await enc.unlock('wrong')
      expect(result.success).toBe(false)
      expect(result.locked).toBeUndefined()
      expect(result.retryAfterMs).toBeUndefined()
    }
  })

  it('returns cooldown after 5 failures', async () => {
    await enc.enableEncryption(PIN)
    enc.lock()

    for (let i = 0; i < 5; i++) {
      await enc.unlock('wrong')
    }

    // The 5th failure should return a cooldown.
    const result = await enc.unlock('wrong')
    expect(result.success).toBe(false)
    expect(result.locked).toBe(true)
    expect(result.retryAfterMs).toBeGreaterThan(0)
    expect(result.retryAfterMs).toBeLessThanOrEqual(30_000)
  })

  it('resets counter on successful unlock', async () => {
    await enc.enableEncryption(PIN)
    enc.lock()

    // Fail 4 times.
    for (let i = 0; i < 4; i++) {
      await enc.unlock('wrong')
    }

    // Succeed.
    const ok = await enc.unlock(PIN)
    expect(ok.success).toBe(true)

    // Fail again: should be treated as first failure (no cooldown).
    enc.lock()
    const result = await enc.unlock('wrong')
    expect(result.success).toBe(false)
    expect(result.locked).toBeUndefined()
  })

  it('wipes data after 15 failures', async () => {
    await enc.enableEncryption(PIN)
    await entries.saveEntry({ date: '2026-01-01', reason: 'office' })
    enc.lock()

    // Use vi.spyOn to advance Date.now past cooldowns.
    let fakeNow = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => fakeNow)

    for (let i = 0; i < 14; i++) {
      await enc.unlock('wrong')
      // Advance past any cooldown.
      fakeNow += 31 * 60_000
    }

    // 15th failure should wipe.
    const result = await enc.unlock('wrong')
    expect(result.success).toBe(false)
    expect(result.wiped).toBe(true)

    // All data should be gone.
    const allEntries = await db.getAllEntries()
    expect(allEntries).toHaveLength(0)
    const meta = await db.getEncryptionMeta()
    expect(meta.enabled).toBe(false)
  })

  it('persists failed attempts across module reloads', async () => {
    await enc.enableEncryption(PIN)
    enc.lock()

    // Fail 4 times.
    for (let i = 0; i < 4; i++) {
      await enc.unlock('wrong')
    }

    // Reload modules (simulates app restart).
    vi.resetModules()
    const freshEnc = await import('../crypto')
    const freshDb = await import('../db')

    // 5th failure should trigger cooldown even after reload.
    const result = await freshEnc.unlock('wrong')
    expect(result.success).toBe(false)

    // Verify counter was persisted.
    const attempts = await freshDb.getFailedAttempts()
    expect(attempts.count).toBe(5)

    // Clean up: re-import for afterEach to work.
    enc = freshEnc
    db = freshDb
  })

  it('prepareEntry encrypts when encryption is enabled', async () => {
    await enc.enableEncryption(PIN)
    const saved = await entries.saveEntry({ date: '2026-02-01', reason: 'wfh' })
    const prepared = await entries.prepareEntry(saved)
    expect('ciphertext' in prepared).toBe(true)
  })

  it('prepareEntry returns plaintext when encryption is disabled', async () => {
    const saved = await entries.saveEntry({ date: '2026-02-01', reason: 'wfh' })
    const prepared = await entries.prepareEntry(saved)
    expect('date' in prepared).toBe(true)
    expect('ciphertext' in prepared).toBe(false)
  })
})
