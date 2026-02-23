// Integration tests for settings-view: export, encryption, and data wipe.

import { beforeEach, describe, expect, it, vi } from 'vitest'

let renderSettingsView: typeof import('../ui/settings-view').renderSettingsView
let entries: typeof import('../entries')
let enc: typeof import('../crypto')
let exportModule: typeof import('../export')
let settings: typeof import('../settings')

beforeEach(async () => {
  vi.resetModules()
  renderSettingsView = (await import('../ui/settings-view')).renderSettingsView
  entries = await import('../entries')
  enc = await import('../crypto')
  exportModule = await import('../export')
  settings = await import('../settings')

  // Stub download since jsdom cannot create blob URLs.
  vi.spyOn(exportModule, 'download').mockImplementation(() => {})
})

const getContainer = (): HTMLElement => document.createElement('div')

describe('renderSettingsView', () => {
  it('renders all sections', async () => {
    const container = getContainer()
    await renderSettingsView(container, vi.fn())

    expect(container.querySelector('h2')!.textContent).toBe('Settings')

    const headings = Array.from(container.querySelectorAll('h3')).map(
      (h) => h.textContent,
    )
    expect(headings).toContain('Export data')
    expect(headings).toContain('Attendance tracking')
    expect(headings).toContain('PIN protection')
    expect(headings).toContain('Danger zone')

    const version = container.querySelector('.settings-version')
    expect(version).not.toBeNull()
    expect(version!.textContent).toMatch(/^v\d/)
  })

  it('exports JSON when button is clicked', async () => {
    await entries.saveEntry({ date: '2026-02-20', reason: 'office' })

    const container = getContainer()
    await renderSettingsView(container, vi.fn())

    const buttons = Array.from(container.querySelectorAll('button'))
    const jsonBtn = buttons.find((b) => b.textContent === 'Export as JSON')!
    jsonBtn.click()

    await vi.waitFor(() => {
      expect(exportModule.download).toHaveBeenCalledOnce()
    })

    const [content, filename, mime] = (
      exportModule.download as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string, string, string]
    expect(mime).toBe('application/json')
    expect(filename).toMatch(/^daylog-export-.*\.json$/)

    const parsed = JSON.parse(content) as unknown[]
    expect(parsed).toHaveLength(1)
  })

  it('exports CSV when button is clicked', async () => {
    await entries.saveEntry({ date: '2026-02-20', reason: 'wfh' })

    const container = getContainer()
    await renderSettingsView(container, vi.fn())

    const buttons = Array.from(container.querySelectorAll('button'))
    const csvBtn = buttons.find((b) => b.textContent === 'Export as CSV')!
    csvBtn.click()

    await vi.waitFor(() => {
      expect(exportModule.download).toHaveBeenCalledOnce()
    })

    const [content, filename, mime] = (
      exportModule.download as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string, string, string]
    expect(mime).toBe('text/csv')
    expect(filename).toMatch(/^daylog-export-.*\.csv$/)
    expect(content).toContain('id,date,reason,notes')
  })

  describe('PIN protection', () => {
    it('shows PIN form when encryption is not enabled', async () => {
      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      expect(container.querySelector('#pin-input')).toBeTruthy()
      expect(container.querySelector('#pin-confirm')).toBeTruthy()
    })

    it('rejects PIN shorter than 4 characters', async () => {
      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const pinInput = container.querySelector('#pin-input') as HTMLInputElement
      const confirmInput = container.querySelector(
        '#pin-confirm',
      ) as HTMLInputElement
      pinInput.value = '12'
      confirmInput.value = '12'

      const enableBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Enable encryption',
      )!
      enableBtn.click()

      await vi.waitFor(() => {
        const msg = container.querySelector('.pin-message')!
        expect(msg.textContent).toBe('PIN must be at least 4 characters.')
      })
    })

    it('rejects mismatched PINs', async () => {
      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const pinInput = container.querySelector('#pin-input') as HTMLInputElement
      const confirmInput = container.querySelector(
        '#pin-confirm',
      ) as HTMLInputElement
      pinInput.value = '1234'
      confirmInput.value = '5678'

      const enableBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Enable encryption',
      )!
      enableBtn.click()

      await vi.waitFor(() => {
        const msg = container.querySelector('.pin-message')!
        expect(msg.textContent).toBe('PINs do not match.')
      })
    })

    it('enables encryption and re-renders to enabled state', async () => {
      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const pinInput = container.querySelector('#pin-input') as HTMLInputElement
      const confirmInput = container.querySelector(
        '#pin-confirm',
      ) as HTMLInputElement
      pinInput.value = 'test1234'
      confirmInput.value = 'test1234'

      const enableBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Enable encryption',
      )!
      enableBtn.click()

      // After enabling, PIN form should be gone and enabled message shown.
      await vi.waitFor(() => {
        expect(container.querySelector('#pin-input')).toBeNull()
        expect(container.textContent).toContain(
          'Encryption is enabled for this device.',
        )
      })
    })

    it('shows enabled state when encryption is already on', async () => {
      await enc.enableEncryption('mypin123')

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      expect(container.querySelector('#pin-input')).toBeNull()
      expect(container.textContent).toContain(
        'Encryption is enabled for this device.',
      )
      expect(container.textContent).toContain(
        'If you forget your PIN, your data cannot be recovered.',
      )
    })

    it('rejects empty PIN', async () => {
      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const pinInput = container.querySelector('#pin-input') as HTMLInputElement
      const confirmInput = container.querySelector(
        '#pin-confirm',
      ) as HTMLInputElement
      pinInput.value = ''
      confirmInput.value = ''

      const enableBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Enable encryption',
      )!
      enableBtn.click()

      await vi.waitFor(() => {
        const msg = container.querySelector('.pin-message')!
        expect(msg.textContent).toBe('PIN must be at least 4 characters.')
      })
    })
  })

  describe('danger zone', () => {
    it('wipes all data and calls onDataWiped when confirmed', async () => {
      await entries.saveEntry({ date: '2026-01-01', reason: 'office' })
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true),
      )

      const container = getContainer()
      const onDataWiped = vi.fn()
      await renderSettingsView(container, onDataWiped)

      const deleteBtn = container.querySelector(
        '.btn-danger',
      ) as HTMLButtonElement
      deleteBtn.click()

      await vi.waitFor(() => {
        expect(onDataWiped).toHaveBeenCalledOnce()
      })

      const all = await entries.loadAllEntries()
      expect(all).toHaveLength(0)
    })

    it('does nothing when confirm is cancelled', async () => {
      await entries.saveEntry({ date: '2026-01-01', reason: 'office' })
      vi.stubGlobal(
        'confirm',
        vi.fn(() => false),
      )

      const container = getContainer()
      const onDataWiped = vi.fn()
      await renderSettingsView(container, onDataWiped)

      const deleteBtn = container.querySelector(
        '.btn-danger',
      ) as HTMLButtonElement
      deleteBtn.click()

      // Small wait to ensure nothing happened.
      await new Promise((r) => setTimeout(r, 50))
      expect(onDataWiped).not.toHaveBeenCalled()

      const all = await entries.loadAllEntries()
      expect(all).toHaveLength(1)
    })
  })

  describe('attendance tracking', () => {
    it('renders toggle and hides fields when disabled', async () => {
      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const toggle = container.querySelector(
        '#attendance-enabled',
      ) as HTMLInputElement
      expect(toggle).toBeTruthy()
      expect(toggle.checked).toBe(false)

      const fields = container.querySelector(
        '.attendance-fields',
      ) as HTMLElement
      expect(fields).toBeTruthy()
      expect(fields.style.display).toBe('none')
    })

    it('shows fields when toggle is checked', async () => {
      await settings.saveAttendanceSettings({
        enabled: true,
        weeks: 8,
        percentage: 60,
      })

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const toggle = container.querySelector(
        '#attendance-enabled',
      ) as HTMLInputElement
      expect(toggle.checked).toBe(true)

      const fields = container.querySelector(
        '.attendance-fields',
      ) as HTMLElement
      expect(fields.style.display).toBe('')
    })

    it('persists settings when toggle is changed', async () => {
      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const toggle = container.querySelector(
        '#attendance-enabled',
      ) as HTMLInputElement
      toggle.checked = true
      toggle.dispatchEvent(new Event('change'))

      await vi.waitFor(async () => {
        const result = await settings.loadAttendanceSettings()
        expect(result.enabled).toBe(true)
      })
    })

    it('persists percentage when changed', async () => {
      await settings.saveAttendanceSettings({
        enabled: true,
        weeks: 8,
        percentage: 60,
      })

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const pctInput = container.querySelector(
        '#attendance-percentage',
      ) as HTMLInputElement
      pctInput.value = '75'
      pctInput.dispatchEvent(new Event('change'))

      await vi.waitFor(async () => {
        const result = await settings.loadAttendanceSettings()
        expect(result.percentage).toBe(75)
      })
    })

    it('persists weeks when changed', async () => {
      await settings.saveAttendanceSettings({
        enabled: true,
        weeks: 8,
        percentage: 60,
      })

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const weeksInput = container.querySelector(
        '#attendance-weeks',
      ) as HTMLInputElement
      weeksInput.value = '4'
      weeksInput.dispatchEvent(new Event('change'))

      await vi.waitFor(async () => {
        const result = await settings.loadAttendanceSettings()
        expect(result.weeks).toBe(4)
      })
    })

    it('clamps percentage to 1-100', async () => {
      await settings.saveAttendanceSettings({
        enabled: true,
        weeks: 8,
        percentage: 60,
      })

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const pctInput = container.querySelector(
        '#attendance-percentage',
      ) as HTMLInputElement
      pctInput.value = '150'
      pctInput.dispatchEvent(new Event('change'))

      await vi.waitFor(async () => {
        const result = await settings.loadAttendanceSettings()
        expect(result.percentage).toBe(100)
      })
    })

    it('clamps weeks to 1-52', async () => {
      await settings.saveAttendanceSettings({
        enabled: true,
        weeks: 8,
        percentage: 60,
      })

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const weeksInput = container.querySelector(
        '#attendance-weeks',
      ) as HTMLInputElement
      weeksInput.value = '0'
      weeksInput.dispatchEvent(new Event('change'))

      await vi.waitFor(async () => {
        const result = await settings.loadAttendanceSettings()
        expect(result.weeks).toBe(1)
      })
    })

    it('toggles field visibility on change', async () => {
      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const toggle = container.querySelector(
        '#attendance-enabled',
      ) as HTMLInputElement
      const fields = container.querySelector(
        '.attendance-fields',
      ) as HTMLElement

      expect(fields.style.display).toBe('none')

      toggle.checked = true
      toggle.dispatchEvent(new Event('change'))
      expect(fields.style.display).toBe('')

      toggle.checked = false
      toggle.dispatchEvent(new Event('change'))
      expect(fields.style.display).toBe('none')
    })

    it('pre-fills inputs with saved settings', async () => {
      await settings.saveAttendanceSettings({
        enabled: true,
        weeks: 12,
        percentage: 80,
      })

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const pctInput = container.querySelector(
        '#attendance-percentage',
      ) as HTMLInputElement
      const weeksInput = container.querySelector(
        '#attendance-weeks',
      ) as HTMLInputElement

      expect(pctInput.value).toBe('80')
      expect(weeksInput.value).toBe('12')
    })

    it('defaults percentage to 60 when input is empty', async () => {
      await settings.saveAttendanceSettings({
        enabled: true,
        weeks: 8,
        percentage: 60,
      })

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const pctInput = container.querySelector(
        '#attendance-percentage',
      ) as HTMLInputElement
      pctInput.value = ''
      pctInput.dispatchEvent(new Event('change'))

      await vi.waitFor(async () => {
        const result = await settings.loadAttendanceSettings()
        expect(result.percentage).toBe(60)
      })
    })

    it('defaults weeks to 8 when input is empty', async () => {
      await settings.saveAttendanceSettings({
        enabled: true,
        weeks: 8,
        percentage: 60,
      })

      const container = getContainer()
      await renderSettingsView(container, vi.fn())

      const weeksInput = container.querySelector(
        '#attendance-weeks',
      ) as HTMLInputElement
      weeksInput.value = ''
      weeksInput.dispatchEvent(new Event('change'))

      await vi.waitFor(async () => {
        const result = await settings.loadAttendanceSettings()
        expect(result.weeks).toBe(8)
      })
    })
  })
})
