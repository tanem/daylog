// Data model for attendance entries.

export type Reason = 'office' | 'wfh' | 'leave' | 'sick'

export interface AttendanceEntry {
  id: string
  date: string // ISO date e.g. "2026-02-22".
  arrivedAt: string // ISO datetime.
  leftAt?: string // ISO datetime.
  reason: Reason
  notes?: string
}

// Shape stored in IndexedDB when encryption is enabled.
export interface EncryptedEnvelope {
  id: string
  iv: Uint8Array
  ciphertext: ArrayBuffer
}

// Encryption metadata stored once in IndexedDB.
export interface EncryptionMeta {
  enabled: boolean
  salt?: Uint8Array
}
