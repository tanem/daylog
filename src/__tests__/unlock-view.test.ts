// Integration tests for unlock-view: PIN entry and session unlock.

import { beforeEach, describe, expect, it, vi } from 'vitest'

let renderUnlockView: typeof import('../ui/unlock-view').renderUnlockView
let enc: typeof import('../crypto')
let db: typeof import('../db')

beforeEach(async () => {
  vi.useRealTimers()
  vi.resetModules()
  renderUnlockView = (await import('../ui/unlock-view')).renderUnlockView
  enc = await import('../crypto')
  db = await import('../db')
})

const getContainer = (): HTMLElement => document.createElement('div')

const submitForm = (container: HTMLElement): void => {
  const form = container.querySelector('form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('renderUnlockView', () => {
  it('renders heading, PIN input, and unlock button', () => {
    const container = getContainer()
    renderUnlockView(container, vi.fn())

    expect(container.querySelector('h2')!.textContent).toBe('Unlock Daylog')
    expect(container.querySelector('#unlock-pin')).toBeTruthy()
    expect(container.textContent).toContain(
      'Your data is encrypted. Enter your PIN to continue.',
    )
  })

  it('shows message when PIN is empty', async () => {
    const container = getContainer()
    renderUnlockView(container, vi.fn())

    submitForm(container)

    await vi.waitFor(() => {
      expect(container.querySelector('.pin-message')!.textContent).toBe(
        'Please enter your PIN.',
      )
    })
  })

  it('shows error when unlock fails (wrong PIN or no encryption)', async () => {
    const container = getContainer()
    renderUnlockView(container, vi.fn())

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'wrong-pin'

    submitForm(container)

    await vi.waitFor(() => {
      expect(container.querySelector('.pin-message')!.textContent).toBe(
        'Could not unlock. Check your PIN.',
      )
    })
  })

  it('calls onUnlocked after successful unlock', async () => {
    // Set up encryption first.
    await enc.enableEncryption('correct-pin')
    enc.lock()

    const container = getContainer()
    const onUnlocked = vi.fn()
    renderUnlockView(container, onUnlocked)

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'correct-pin'

    submitForm(container)

    await vi.waitFor(() => {
      expect(onUnlocked).toHaveBeenCalledOnce()
    })
  })

  it('supports form submission to trigger unlock', async () => {
    await enc.enableEncryption('mypin456')
    enc.lock()

    const container = getContainer()
    const onUnlocked = vi.fn()
    renderUnlockView(container, onUnlocked)

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'mypin456'

    submitForm(container)

    await vi.waitFor(() => {
      expect(onUnlocked).toHaveBeenCalledOnce()
    })
  })

  it('does not unlock without form submission', () => {
    const container = getContainer()
    const onUnlocked = vi.fn()
    renderUnlockView(container, onUnlocked)

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'something'

    // Typing alone should not trigger unlock.
    expect(onUnlocked).not.toHaveBeenCalled()
  })

  it('shows cooldown message and disables input after too many failures', async () => {
    await enc.enableEncryption('correct-pin')
    enc.lock()

    // Pre-populate 5 failed attempts so cooldown is active (skips PBKDF2).
    await db.setFailedAttempts({ count: 5, lastAttemptAt: Date.now() })

    const container = getContainer()
    renderUnlockView(container, vi.fn())

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'another-wrong'

    submitForm(container)

    await vi.waitFor(() => {
      const msg = container.querySelector('.pin-message')!.textContent!
      expect(msg).toMatch(/Too many attempts/)
    })

    // Button and input should be disabled.
    const btn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(pinInput.disabled).toBe(true)
  })

  it('shows wipe message after 15 failures', async () => {
    await enc.enableEncryption('correct-pin')
    enc.lock()

    // Pre-populate 14 failed attempts past cooldown so next failure wipes.
    await db.setFailedAttempts({
      count: 14,
      lastAttemptAt: Date.now() - 31 * 60_000,
    })

    const container = getContainer()
    renderUnlockView(container, vi.fn())

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'final-wrong'

    submitForm(container)

    await vi.waitFor(() => {
      const msg = container.querySelector('.pin-message')!.textContent!
      expect(msg).toBe(
        'All data has been erased after too many failed attempts.',
      )
    })

    // Button and input should be disabled.
    const btn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(pinInput.disabled).toBe(true)
  })

  it('formats wait time in seconds when under a minute', async () => {
    await enc.enableEncryption('correct-pin')
    enc.lock()

    // Pre-populate 5 failed attempts: 30s cooldown → shows seconds.
    await db.setFailedAttempts({ count: 5, lastAttemptAt: Date.now() })

    const container = getContainer()
    renderUnlockView(container, vi.fn())

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'x'
    submitForm(container)

    await vi.waitFor(() => {
      const msg = container.querySelector('.pin-message')!.textContent!
      expect(msg).toMatch(/\d+ seconds/)
    })
  })

  it('formats wait time in minutes when over a minute', async () => {
    await enc.enableEncryption('correct-pin')
    enc.lock()

    // Pre-populate 8 failed attempts: 5-minute cooldown → shows minutes.
    await db.setFailedAttempts({ count: 8, lastAttemptAt: Date.now() })

    const container = getContainer()
    renderUnlockView(container, vi.fn())

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'x'
    submitForm(container)

    await vi.waitFor(() => {
      const msg = container.querySelector('.pin-message')!.textContent!
      expect(msg).toMatch(/\d+ minutes/)
    })
  })

  it('formats wait time as "1 minute" for exactly one minute remaining', async () => {
    await enc.enableEncryption('correct-pin')
    enc.lock()

    // Pre-populate 8 failed attempts with elapsed time leaving exactly ~60s.
    // getCooldownMs(8) = 300_000ms. Elapsed = 240_000 → remaining = 60_000 → "1 minute".
    await db.setFailedAttempts({
      count: 8,
      lastAttemptAt: Date.now() - 240_000,
    })

    const container = getContainer()
    renderUnlockView(container, vi.fn())

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'x'
    submitForm(container)

    await vi.waitFor(() => {
      const msg = container.querySelector('.pin-message')!.textContent!
      expect(msg).toBe('Too many attempts. Try again in 1 minute.')
    })
  })

  it('re-enables form after cooldown expires', async () => {
    const container = getContainer()
    renderUnlockView(container, vi.fn())

    // This test targets the view's setTimeout re-enable logic specifically.
    // Mock unlock to return a cooldown so we can control timing with fake timers
    // (IDB operations are incompatible with fake timers due to fake-indexeddb internals).
    vi.spyOn(enc, 'unlock').mockResolvedValue({
      success: false,
      locked: true,
      retryAfterMs: 30_000,
    })

    vi.useFakeTimers()

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'x'
    submitForm(container)

    // Flush the async onSubmit handler.
    await vi.advanceTimersByTimeAsync(0)

    const btn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(pinInput.disabled).toBe(true)

    // Advance past the scheduled re-enable timeout.
    await vi.advanceTimersByTimeAsync(30_000)

    expect(btn.disabled).toBe(false)
    expect(pinInput.disabled).toBe(false)
    expect(container.querySelector('.pin-message')!.textContent).toBe('')
  })
})
