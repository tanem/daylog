// Integration tests for main.ts: navigation, view rendering, encryption gate.

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Set up the DOM structure that main.ts expects before importing it.
const setupDOM = (): void => {
  document.body.replaceChildren()
  const app = document.createElement('div')
  app.id = 'app'

  const header = document.createElement('header')
  const nav = document.createElement('nav')
  nav.id = 'main-nav'

  for (const view of ['log', 'history', 'settings']) {
    const btn = document.createElement('button')
    btn.dataset.view = view
    btn.className = `nav-btn${view === 'log' ? ' active' : ''}`
    if (view === 'log') btn.setAttribute('aria-current', 'page')
    btn.textContent = view.charAt(0).toUpperCase() + view.slice(1)
    nav.appendChild(btn)
  }
  header.appendChild(nav)
  app.appendChild(header)

  const main = document.createElement('main')
  main.id = 'main-content'
  main.setAttribute('tabindex', '-1')
  app.appendChild(main)

  document.body.appendChild(app)
}

beforeEach(async () => {
  vi.resetModules()
  setupDOM()
})

const getMain = (): HTMLElement => document.getElementById('main-content')!
const getNavButtons = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.nav-btn'))

describe('main navigation', () => {
  it('boots and renders the log view by default', async () => {
    await import('../main')

    // Allow async navigateTo to settle.
    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Log attendance')
    })
  })

  it('navigates to history view when history button is clicked', async () => {
    await import('../main')
    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')).toBeTruthy()
    })

    const historyBtn = getNavButtons().find(
      (b) => b.dataset.view === 'history',
    )!
    historyBtn.click()

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('History')
    })

    // Active class should be on the history button.
    expect(historyBtn.classList.contains('active')).toBe(true)
    const logBtn = getNavButtons().find((b) => b.dataset.view === 'log')!
    expect(logBtn.classList.contains('active')).toBe(false)
  })

  it('navigates to settings view when settings button is clicked', async () => {
    await import('../main')
    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')).toBeTruthy()
    })

    const settingsBtn = getNavButtons().find(
      (b) => b.dataset.view === 'settings',
    )!
    settingsBtn.click()

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Settings')
    })
  })

  it('shows unlock view when encrypted and locked', async () => {
    // Enable encryption first, then lock.
    const enc = await import('../crypto')
    await enc.enableEncryption('testpin1')
    enc.lock()

    vi.resetModules()
    setupDOM()

    await import('../main')

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Unlock Daylog')
    })
  })

  it('shows target view after unlocking', async () => {
    const enc = await import('../crypto')
    await enc.enableEncryption('testpin2')
    enc.lock()

    vi.resetModules()
    setupDOM()

    await import('../main')

    await vi.waitFor(() => {
      expect(getMain().querySelector('#unlock-pin')).toBeTruthy()
    })

    // Simulate unlock via form submission.
    const pinInput = getMain().querySelector('#unlock-pin') as HTMLInputElement
    pinInput.value = 'testpin2'
    const form = getMain().querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Log attendance')
    })
  })

  it('navigates to history after saving a log entry (onSaved callback)', async () => {
    await import('../main')
    await vi.waitFor(() => {
      expect(getMain().querySelector('form')).toBeTruthy()
    })

    // Submit the log form: the onSaved callback should navigateTo('history').
    const form = getMain().querySelector('form') as HTMLFormElement
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('History')
    })
  })

  it('navigates to log with entry when edit is clicked in history', async () => {
    // Seed an entry so history has something to show.
    const entries = await import('../entries')
    await entries.saveEntry({ date: '2026-02-20', reason: 'office' })

    vi.resetModules()
    setupDOM()

    await import('../main')
    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')).toBeTruthy()
    })

    // Navigate to history.
    const historyBtn = getNavButtons().find(
      (b) => b.dataset.view === 'history',
    )!
    historyBtn.click()

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('History')
    })

    // Click the edit button on the entry.
    const editBtn = getMain().querySelector(
      '.btn.btn-small:not(.btn-danger)',
    ) as HTMLButtonElement
    editBtn.click()

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Edit entry')
    })
  })

  it('navigates to log after wiping data from settings', async () => {
    await import('../main')
    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')).toBeTruthy()
    })

    // Navigate to settings.
    const settingsBtn = getNavButtons().find(
      (b) => b.dataset.view === 'settings',
    )!
    settingsBtn.click()

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Settings')
    })

    // Type "delete" in the confirmation input, then submit the form.
    const confirmInput = getMain().querySelector(
      '#delete-confirm',
    ) as HTMLInputElement
    confirmInput.value = 'delete'

    const deleteForm = confirmInput.closest('form') as HTMLFormElement
    deleteForm.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Log attendance')
    })
  })

  it('shows unlock view when auto-lock triggers', async () => {
    const enc = await import('../crypto')
    await enc.enableEncryption('testpin3')

    vi.resetModules()
    setupDOM()

    // Re-import crypto to unlock the session in the fresh module.
    const freshEnc = await import('../crypto')
    await freshEnc.unlock('testpin3')

    // Import main (boots with encryption enabled and unlocked).
    await import('../main')
    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Log attendance')
    })

    // Simulate auto-lock via visibilitychange.
    Object.defineProperty(document, 'hidden', { value: true, writable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    await vi.waitFor(() => {
      expect(getMain().querySelector('h2')!.textContent).toBe('Unlock Daylog')
    })

    Object.defineProperty(document, 'hidden', { value: false, writable: true })
  })
})
