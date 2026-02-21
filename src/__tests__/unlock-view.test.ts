// Integration tests for unlock-view: PIN entry and session unlock.

import { beforeEach, describe, expect, it, vi } from 'vitest'

let renderUnlockView: typeof import('../ui/unlock-view').renderUnlockView
let enc: typeof import('../crypto')

beforeEach(async () => {
  vi.resetModules()
  renderUnlockView = (await import('../ui/unlock-view')).renderUnlockView
  enc = await import('../crypto')
})

const getContainer = (): HTMLElement => document.createElement('div')

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

    const btn = container.querySelector('.btn.btn-primary') as HTMLButtonElement
    btn.click()

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

    const btn = container.querySelector('.btn.btn-primary') as HTMLButtonElement
    btn.click()

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

    const btn = container.querySelector('.btn.btn-primary') as HTMLButtonElement
    btn.click()

    await vi.waitFor(() => {
      expect(onUnlocked).toHaveBeenCalledOnce()
    })
  })

  it('supports Enter key to trigger unlock', async () => {
    await enc.enableEncryption('mypin456')
    enc.lock()

    const container = getContainer()
    const onUnlocked = vi.fn()
    renderUnlockView(container, onUnlocked)

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'mypin456'

    pinInput.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }),
    )

    await vi.waitFor(() => {
      expect(onUnlocked).toHaveBeenCalledOnce()
    })
  })

  it('does not trigger unlock on non-Enter key', () => {
    const container = getContainer()
    const onUnlocked = vi.fn()
    renderUnlockView(container, onUnlocked)

    const pinInput = container.querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'something'

    pinInput.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'a' }),
    )

    // onUnlocked should not have been called (no Enter).
    // The button click handler might fire but that is a separate path.
    expect(onUnlocked).not.toHaveBeenCalled()
  })
})
