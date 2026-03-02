// Auto-lock: locks the encryption session after inactivity or when the app is backgrounded.

import { isUnlocked, lock } from './crypto'

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000

let timeoutId: ReturnType<typeof setTimeout> | null = null
let onLockCallback: (() => void) | null = null

const triggerLock = (): void => {
  if (!isUnlocked()) return
  lock()
  onLockCallback?.()
}

const resetTimer = (): void => {
  if (timeoutId !== null) clearTimeout(timeoutId)
  if (!isUnlocked()) return
  timeoutId = setTimeout(triggerLock, INACTIVITY_TIMEOUT_MS)
}

const handleVisibilityChange = (): void => {
  if (document.hidden) {
    triggerLock()
  }
}

const USER_EVENTS: (keyof DocumentEventMap)[] = [
  'click',
  'keydown',
  'scroll',
  'touchstart',
]

// Start monitoring for inactivity and visibility changes.
// The onLock callback fires when the session is auto-locked.
export const startAutoLock = (onLock: () => void): void => {
  onLockCallback = onLock
  resetTimer()
  for (const event of USER_EVENTS) {
    document.addEventListener(event, resetTimer, { passive: true })
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

// Stop monitoring. Called during teardown or when encryption is disabled.
export const stopAutoLock = (): void => {
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  for (const event of USER_EVENTS) {
    document.removeEventListener(event, resetTimer)
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  onLockCallback = null
}

// Reset the inactivity timer (call after unlock or navigation).
export const resetAutoLock = (): void => {
  resetTimer()
}
