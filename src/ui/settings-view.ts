// Settings view: export data, manage encryption, delete all data.

import {
  loadAllEntries,
  wipeAllData,
  migrateEntriesToEncrypted,
  changeEncryptionPin,
  disableEncryption,
} from '../entries'
import { enableEncryption, isEncryptionEnabled, lock, unlock } from '../crypto'
import { toJSON, toCSV, download } from '../export'
import { loadAttendanceSettings, saveAttendanceSettings } from '../settings'
import { el, fieldGroup } from './helpers'

const MIN_PIN_LENGTH = 6

export const renderSettingsView = async (
  container: HTMLElement,
  onDataWiped: () => void,
): Promise<void> => {
  const heading = el('h2', {}, 'Settings')

  // ---- Export section ----
  const exportHeading = el('h3', {}, 'Export data')
  const encEnabled = await isEncryptionEnabled()

  const doExport = async (
    formatter: (entries: Awaited<ReturnType<typeof loadAllEntries>>) => string,
    ext: string,
    mime: string,
  ): Promise<void> => {
    const allEntries = await loadAllEntries()
    const content = formatter(allEntries)
    const date = new Date().toISOString().slice(0, 10)
    download(content, `daylog-export-${date}.${ext}`, mime)
  }

  const exportJsonBtn = el('button', { class: 'btn' }, 'Export as JSON')
  exportJsonBtn.addEventListener('click', () =>
    doExport(toJSON, 'json', 'application/json'),
  )

  const exportCsvBtn = el('button', { class: 'btn' }, 'Export as CSV')
  exportCsvBtn.addEventListener('click', () =>
    doExport(toCSV, 'csv', 'text/csv'),
  )

  const exportWarning = encEnabled
    ? 'Exports are plaintext even when encryption is enabled. Handle them carefully.'
    : 'Export files are plaintext. Handle them carefully.'

  const exportGroup = el(
    'div',
    { class: 'settings-group' },
    exportHeading,
    el('p', {}, exportWarning),
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
  let encContent: HTMLElement

  if (encEnabled) {
    // ---- Change PIN form ----
    const changePinMsg = el('p', {
      class: 'pin-message',
      'aria-live': 'assertive',
    })
    const currentPinInput = el('input', {
      autocomplete: 'off',
      id: 'current-pin',
      type: 'password',
    })
    const newPinInput = el('input', {
      autocomplete: 'off',
      id: 'new-pin',
      type: 'password',
    })
    const confirmNewPinInput = el('input', {
      autocomplete: 'off',
      id: 'confirm-new-pin',
      type: 'password',
    })
    const changePinBtn = el(
      'button',
      { class: 'btn', type: 'submit' },
      'Change PIN',
    )

    const changePinForm = el('form', { class: 'pin-form' })
    changePinForm.append(
      fieldGroup('Current PIN', currentPinInput),
      fieldGroup('New PIN', newPinInput),
      fieldGroup('Confirm new PIN', confirmNewPinInput),
      changePinBtn,
      changePinMsg,
    )

    changePinForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      changePinMsg.classList.remove('pin-message-success')
      const currentPin = (currentPinInput as HTMLInputElement).value
      const newPin = (newPinInput as HTMLInputElement).value
      const confirmNew = (confirmNewPinInput as HTMLInputElement).value
      if (!currentPin) {
        changePinMsg.textContent = 'Enter your current PIN.'
        return
      }
      const valid = await unlock(currentPin)
      if (!valid) {
        changePinMsg.textContent = 'Current PIN is incorrect.'
        return
      }
      if (!newPin || newPin.length < MIN_PIN_LENGTH) {
        changePinMsg.textContent = `New PIN must be at least ${MIN_PIN_LENGTH} characters.`
        return
      }
      if (newPin !== confirmNew) {
        changePinMsg.textContent = 'New PINs do not match.'
        return
      }
      await changeEncryptionPin(newPin)
      changePinMsg.textContent = 'PIN changed successfully.'
      changePinMsg.classList.add('pin-message-success')
      ;(currentPinInput as HTMLInputElement).value = ''
      ;(newPinInput as HTMLInputElement).value = ''
      ;(confirmNewPinInput as HTMLInputElement).value = ''
    })

    // ---- Disable encryption ----
    const disableMsg = el('p', {
      class: 'pin-message',
      'aria-live': 'assertive',
    })
    const disablePinInput = el('input', {
      autocomplete: 'off',
      id: 'disable-pin',
      type: 'password',
    })
    const disableBtn = el(
      'button',
      { class: 'btn btn-danger', type: 'submit' },
      'Disable encryption',
    )

    const disableForm = el('form', { class: 'pin-form' })
    disableForm.append(
      fieldGroup('PIN', disablePinInput),
      disableBtn,
      disableMsg,
    )

    disableForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const pin = (disablePinInput as HTMLInputElement).value
      if (!pin) {
        disableMsg.textContent = 'Enter your PIN to disable encryption.'
        return
      }
      const valid = await unlock(pin)
      if (!valid) {
        disableMsg.textContent = 'PIN is incorrect.'
        return
      }
      await disableEncryption()
      disableMsg.textContent = ''
      renderSettingsView(container, onDataWiped)
    })

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
      el('h4', {}, 'Change PIN'),
      changePinForm,
      el('h4', {}, 'Disable encryption'),
      el(
        'p',
        {},
        'Disabling encryption will decrypt all entries and store them as plaintext.',
      ),
      disableForm,
    )
  } else {
    const pinInput = el('input', {
      autocomplete: 'off',
      'aria-describedby': 'pin-hint',
      id: 'pin-input',
      type: 'password',
    })
    const confirmInput = el('input', {
      autocomplete: 'off',
      id: 'pin-confirm',
      type: 'password',
    })
    const enableBtn = el(
      'button',
      { class: 'btn', type: 'submit' },
      'Enable encryption',
    )
    const pinMsg = el('p', {
      class: 'pin-message',
      'aria-live': 'assertive',
    })

    const enableForm = el('form', { class: 'pin-form' })
    enableForm.append(
      fieldGroup('PIN', pinInput),
      fieldGroup('Confirm PIN', confirmInput),
      enableBtn,
      pinMsg,
    )

    enableForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const pin = (pinInput as HTMLInputElement).value
      const confirmPin = (confirmInput as HTMLInputElement).value
      if (!pin || pin.length < MIN_PIN_LENGTH) {
        pinMsg.textContent = `PIN must be at least ${MIN_PIN_LENGTH} characters.`
        return
      }
      if (pin !== confirmPin) {
        pinMsg.textContent = 'PINs do not match.'
        return
      }
      await enableEncryption(pin)
      await migrateEntriesToEncrypted()
      pinMsg.textContent = 'Encryption enabled.'
      pinMsg.classList.add('pin-message-success')
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
        { class: 'pin-hint', id: 'pin-hint' },
        'Longer PINs are stronger. Letters and numbers are both fine.',
      ),
      el(
        'p',
        { class: 'warning' },
        'If you forget your PIN, recovery is impossible. Your data will be permanently lost.',
      ),
      enableForm,
    )
  }

  // ---- Danger zone ----
  const dangerHeading = el('h3', {}, 'Danger zone')
  const deleteConfirmInput = el('input', {
    autocomplete: 'off',
    id: 'delete-confirm',
    type: 'text',
  })
  const deleteBtn = el(
    'button',
    { class: 'btn btn-danger', type: 'submit' },
    'Delete all data',
  )
  const deleteMsg = el('p', {
    class: 'pin-message',
    'aria-live': 'assertive',
  })

  const deleteForm = el('form', { class: 'pin-form' })
  deleteForm.append(
    fieldGroup('Type "delete" to confirm', deleteConfirmInput),
    deleteBtn,
    deleteMsg,
  )

  deleteForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const value = (deleteConfirmInput as HTMLInputElement).value
      .trim()
      .toLowerCase()
    if (value !== 'delete') {
      deleteMsg.textContent = 'Type "delete" to confirm.'
      return
    }
    lock()
    await wipeAllData()
    onDataWiped()
  })

  const dangerGroup = el(
    'div',
    { class: 'settings-group' },
    dangerHeading,
    el('p', {}, 'Permanently remove all data from this device.'),
    deleteForm,
  )

  const versionLabel = el(
    'p',
    { class: 'settings-version' },
    `v${__APP_VERSION__}`,
  )

  container.replaceChildren(
    heading,
    exportGroup,
    attGroup,
    encContent,
    dangerGroup,
    versionLabel,
  )
}
