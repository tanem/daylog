// Data model for attendance entries.

export type Reason = 'office' | 'wfh' | 'leave' | 'sick' | 'public-holiday'

export const REASON_LABELS: Record<Reason, { label: string; short: string }> = {
  office: { label: 'Office', short: 'Office' },
  wfh: { label: 'Working from home', short: 'WFH' },
  leave: { label: 'Leave', short: 'Leave' },
  sick: { label: 'Sick', short: 'Sick' },
  'public-holiday': { label: 'Public holiday', short: 'Holiday' },
}

export interface AttendanceEntry {
  id: string
  date: string // ISO date e.g. "2026-02-22".
  reason: Reason
  notes?: string
}

export interface EncryptedEnvelope {
  id: string
  iv: Uint8Array
  ciphertext: ArrayBuffer
}

export interface AttendanceSettings {
  enabled: boolean
  weeks: number
  percentage: number
}

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

// Brute-force attempt tracking, persisted in IndexedDB.
export interface FailedAttempts {
  count: number
  lastAttemptAt: number
}

export interface UnlockResult {
  success: boolean
  locked?: boolean
  retryAfterMs?: number
  wiped?: boolean
}

export type ThemePreference = 'auto' | 'light' | 'dark'
