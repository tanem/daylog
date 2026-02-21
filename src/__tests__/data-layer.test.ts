// Integration tests for the data layer: entries.ts, db.ts, crypto.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AttendanceEntry } from '../types'

// We need fresh modules per-test to reset the cached dbInstance in db.ts
// and sessionKey in crypto.ts.
let db: typeof import('../db')
let entries: typeof import('../entries')
let enc: typeof import('../crypto')

beforeEach(async () => {
  vi.resetModules()
  db = await import('../db')
  entries = await import('../entries')
  enc = await import('../crypto')
})

afterEach(() => {
  enc.lock()
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
    expect(ok).toBe(true)
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

  it('unlock returns false when encryption is not enabled', async () => {
    const result = await enc.unlock('anypin')
    expect(result).toBe(false)
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
})
