// Settings view: export data, manage encryption, delete all data.

import { loadAllEntries, wipeAllData } from '../entries'
import { enableEncryption, isEncryptionEnabled, lock } from '../crypto'
import { toJSON, toCSV, download } from '../export'
import { loadAttendanceSettings, saveAttendanceSettings } from '../settings'
import { el } from './helpers'

export const renderSettingsView = async (
  container: HTMLElement,
  onDataWiped: () => void,
): Promise<void> => {
  const heading = el('h2', {}, 'Settings')

  // ---- Export section ----
  const exportHeading = el('h3', {}, 'Export data')

  const exportJsonBtn = el('button', { class: 'btn' }, 'Export as JSON')
  exportJsonBtn.addEventListener('click', async () => {
    const entries = await loadAllEntries()
    const content = toJSON(entries)
    const date = new Date().toISOString().slice(0, 10)
    download(content, `daylog-export-${date}.json`, 'application/json')
  })

  const exportCsvBtn = el('button', { class: 'btn' }, 'Export as CSV')
  exportCsvBtn.addEventListener('click', async () => {
    const entries = await loadAllEntries()
    const content = toCSV(entries)
    const date = new Date().toISOString().slice(0, 10)
    download(content, `daylog-export-${date}.csv`, 'text/csv')
  })

  const exportGroup = el(
    'div',
    { class: 'settings-group' },
    exportHeading,
    el('p', {}, 'Export files are plaintext. Handle them carefully.'),
    el('div', { class: 'btn-row' }, exportJsonBtn, exportCsvBtn),
  )

  // ---- Attendance tracking section ----
  const attHeading = el('h3', {}, 'Attendance tracking')
  const attSettings = await loadAttendanceSettings()

  const attToggle = el('input', {
    id: 'attendance-enabled',
    type: 'checkbox',
  }) as unknown as HTMLInputElement
  attToggle.checked = attSettings.enabled

  const attToggleRow = el(
    'div',
    { class: 'toggle-row' },
    attToggle,
    el('label', { for: 'attendance-enabled' }, 'Enable attendance tracking'),
  )

  const pctInput = el('input', {
    id: 'attendance-percentage',
    max: '100',
    min: '1',
    type: 'number',
    value: String(attSettings.percentage),
  }) as unknown as HTMLInputElement

  const weeksInput = el('input', {
    id: 'attendance-weeks',
    max: '52',
    min: '1',
    type: 'number',
    value: String(attSettings.weeks),
  }) as unknown as HTMLInputElement

  const attFields = el(
    'div',
    { class: 'attendance-fields' },
    fieldGroup('Target %', pctInput),
    fieldGroup('Rolling window (weeks)', weeksInput),
  )
  attFields.style.display = attSettings.enabled ? '' : 'none'

  const saveAttSettings = async (): Promise<void> => {
    const rawPct = parseInt(pctInput.value, 10)
    const rawWeeks = parseInt(weeksInput.value, 10)
    await saveAttendanceSettings({
      enabled: attToggle.checked,
      weeks: Math.max(1, Math.min(52, Number.isNaN(rawWeeks) ? 8 : rawWeeks)),
      percentage: Math.max(
        1,
        Math.min(100, Number.isNaN(rawPct) ? 60 : rawPct),
      ),
    })
  }

  attToggle.addEventListener('change', async () => {
    attFields.style.display = attToggle.checked ? '' : 'none'
    await saveAttSettings()
  })
  pctInput.addEventListener('change', saveAttSettings)
  weeksInput.addEventListener('change', saveAttSettings)

  const attGroup = el(
    'div',
    { class: 'settings-group' },
    attHeading,
    el(
      'p',
      {},
      'Track your rolling office attendance percentage on the log screen.',
    ),
    attToggleRow,
    attFields,
  )

  // ---- Encryption section ----
  const encHeading = el('h3', {}, 'PIN protection')
  const encEnabled = await isEncryptionEnabled()
  let encContent: HTMLElement

  if (encEnabled) {
    encContent = el(
      'div',
      { class: 'settings-group' },
      encHeading,
      el('p', {}, 'Encryption is enabled for this device.'),
      el(
        'p',
        { class: 'warning' },
        'If you forget your PIN, your data cannot be recovered.',
      ),
    )
  } else {
    const pinInput = el('input', {
      autocomplete: 'off',
      id: 'pin-input',
      placeholder: 'Choose a PIN',
      type: 'password',
    })
    const confirmInput = el('input', {
      autocomplete: 'off',
      id: 'pin-confirm',
      placeholder: 'Confirm PIN',
      type: 'password',
    })
    const enableBtn = el('button', { class: 'btn' }, 'Enable encryption')
    const pinMsg = el('p', { class: 'pin-message' })

    enableBtn.addEventListener('click', async () => {
      const pin = (pinInput as HTMLInputElement).value
      const confirm = (confirmInput as HTMLInputElement).value
      if (!pin || pin.length < 4) {
        pinMsg.textContent = 'PIN must be at least 4 characters.'
        return
      }
      if (pin !== confirm) {
        pinMsg.textContent = 'PINs do not match.'
        return
      }
      await enableEncryption(pin)
      pinMsg.textContent = 'Encryption enabled.'
      renderSettingsView(container, onDataWiped)
    })

    encContent = el(
      'div',
      { class: 'settings-group' },
      encHeading,
      el(
        'p',
        {},
        'Optionally protect your data with a PIN. Once enabled, your data is encrypted on this device.',
      ),
      el(
        'p',
        { class: 'warning' },
        'If you forget your PIN, recovery is impossible. Your data will be permanently lost.',
      ),
      el('div', { class: 'pin-form' }, pinInput, confirmInput, enableBtn),
      pinMsg,
    )
  }

  // ---- Danger zone ----
  const dangerHeading = el('h3', {}, 'Danger zone')
  const deleteBtn = el('button', { class: 'btn btn-danger' }, 'Delete all data')
  deleteBtn.addEventListener('click', async () => {
    if (
      confirm(
        'This will permanently delete all your attendance data. This cannot be undone. Continue?',
      )
    ) {
      lock()
      await wipeAllData()
      onDataWiped()
    }
  })

  const dangerGroup = el(
    'div',
    { class: 'settings-group' },
    dangerHeading,
    el('p', {}, 'Permanently remove all data from this device.'),
    deleteBtn,
  )

  container.replaceChildren(
    heading,
    exportGroup,
    attGroup,
    encContent,
    dangerGroup,
  )
}

const fieldGroup = (label: string, input: HTMLElement): HTMLElement => {
  const wrapper = el('div', { class: 'field-group' })
  wrapper.append(el('label', {}, label), input)
  return wrapper
}
