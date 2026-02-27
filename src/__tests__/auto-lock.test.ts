// Tests for auto-lock: inactivity timeout and visibility-based locking.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let autoLock: typeof import('../auto-lock')
let enc: typeof import('../crypto')

beforeEach(async () => {
  vi.useRealTimers()
  vi.resetModules()
  autoLock = await import('../auto-lock')
  enc = await import('../crypto')
})

afterEach(() => {
  autoLock.stopAutoLock()
})

const FIVE_MINUTES = 5 * 60 * 1000

// Helper: enable encryption then switch to fake timers.
const setupUnlocked = async (): Promise<void> => {
  await enc.enableEncryption('testpin1')
  vi.useFakeTimers()
}

describe('startAutoLock', () => {
  it('calls onLock after inactivity timeout when unlocked', async () => {
    await setupUnlocked()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    vi.advanceTimersByTime(FIVE_MINUTES)

    expect(onLock).toHaveBeenCalledOnce()
    expect(enc.isUnlocked()).toBe(false)
  })

  it('does not call onLock if session is already locked', () => {
    vi.useFakeTimers()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    vi.advanceTimersByTime(FIVE_MINUTES)

    expect(onLock).not.toHaveBeenCalled()
  })

  it('does not double-lock if session was already locked before timer fires', async () => {
    await setupUnlocked()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    // Lock the session manually before the timer fires (simulates
    // visibilitychange locking first, then the inactivity timer expiring).
    enc.lock()
    vi.advanceTimersByTime(FIVE_MINUTES)

    // onLock should not be called because isUnlocked() returns false.
    expect(onLock).not.toHaveBeenCalled()
  })

  it('resets the timer on user events', async () => {
    await setupUnlocked()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    // Advance partway, then trigger a user event to reset.
    vi.advanceTimersByTime(FIVE_MINUTES - 1000)
    document.dispatchEvent(new Event('click'))
    vi.advanceTimersByTime(FIVE_MINUTES - 1000)

    // Should still be unlocked because the timer was reset.
    expect(onLock).not.toHaveBeenCalled()
    expect(enc.isUnlocked()).toBe(true)

    // Now let the full timeout elapse.
    vi.advanceTimersByTime(1000)
    expect(onLock).toHaveBeenCalledOnce()
  })

  it('locks immediately when page becomes hidden', async () => {
    await setupUnlocked()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    Object.defineProperty(document, 'hidden', { value: true, writable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(onLock).toHaveBeenCalledOnce()
    expect(enc.isUnlocked()).toBe(false)

    // Restore.
    Object.defineProperty(document, 'hidden', { value: false, writable: true })
  })

  it('does not lock on visibilitychange when page is visible', async () => {
    await setupUnlocked()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    Object.defineProperty(document, 'hidden', { value: false, writable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(onLock).not.toHaveBeenCalled()
    expect(enc.isUnlocked()).toBe(true)
  })
})

describe('stopAutoLock', () => {
  it('cancels the inactivity timer', async () => {
    await setupUnlocked()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    autoLock.stopAutoLock()
    vi.advanceTimersByTime(FIVE_MINUTES)

    expect(onLock).not.toHaveBeenCalled()
  })

  it('removes all event listeners', async () => {
    await setupUnlocked()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)
    autoLock.stopAutoLock()

    // After stopping, user events should not restart the timer.
    document.dispatchEvent(new Event('click'))
    vi.advanceTimersByTime(FIVE_MINUTES)

    expect(onLock).not.toHaveBeenCalled()
  })
})

describe('resetAutoLock', () => {
  it('restarts the inactivity timer', async () => {
    await setupUnlocked()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    vi.advanceTimersByTime(FIVE_MINUTES - 1000)
    autoLock.resetAutoLock()

    // Old timer should be cancelled.
    vi.advanceTimersByTime(1000)
    expect(onLock).not.toHaveBeenCalled()

    // Full timeout from reset should fire.
    vi.advanceTimersByTime(FIVE_MINUTES - 1000)
    expect(onLock).toHaveBeenCalledOnce()
  })

  it('does nothing when session is locked', () => {
    vi.useFakeTimers()
    const onLock = vi.fn()
    autoLock.startAutoLock(onLock)

    // Session is not unlocked, so resetAutoLock should skip setting timer.
    autoLock.resetAutoLock()
    vi.advanceTimersByTime(FIVE_MINUTES)

    expect(onLock).not.toHaveBeenCalled()
  })
})
