// Data model for attendance entries.

export type Reason = 'office' | 'wfh' | 'leave' | 'sick' | 'public-holiday'

export interface AttendanceEntry {
  id: string
  date: string // ISO date e.g. "2026-02-22".
  reason: Reason
  notes?: string
}

// Shape stored in IndexedDB when encryption is enabled.
export interface EncryptedEnvelope {
  id: string
  iv: Uint8Array
  ciphertext: ArrayBuffer
}

// Attendance tracking settings stored in IndexedDB.
export interface AttendanceSettings {
  enabled: boolean
  weeks: number
  percentage: number
}

// Result of an attendance percentage calculation.
export interface AttendanceStats {
  attended: number
  total: number
  percentage: number
  target: number
}

// Encryption metadata stored once in IndexedDB.
export interface EncryptionMeta {
  enabled: boolean
  salt?: Uint8Array
  verificationIv?: Uint8Array
  verificationTag?: ArrayBuffer
}
