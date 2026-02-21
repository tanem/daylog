// Settings view: export data, manage encryption, delete all data.

import { loadAllEntries, wipeAllData } from '../entries'
import { enableEncryption, isEncryptionEnabled, lock } from '../crypto'
import { toJSON, toCSV, download } from '../export'
import { el } from './helpers'

export async function renderSettingsView(
  container: HTMLElement,
  onDataWiped: () => void,
): Promise<void> {
  const heading = el('h2', {}, 'Settings')

  // ---- Export section ----
  const exportHeading = el('h3', {}, 'Export data')

  const exportJsonBtn = el(
    'button',
    { class: 'btn' },
    'Export as JSON',
  )
  exportJsonBtn.addEventListener('click', async () => {
    const entries = await loadAllEntries()
    const content = toJSON(entries)
    const date = new Date().toISOString().slice(0, 10)
    download(content, `daylog-export-${date}.json`, 'application/json')
  })

  const exportCsvBtn = el(
    'button',
    { class: 'btn' },
    'Export as CSV',
  )
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
    el(
      'p',
      {},
      'Export files are plaintext. Handle them carefully.',
    ),
    el('div', { class: 'btn-row' }, exportJsonBtn, exportCsvBtn),
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
      type: 'password',
      id: 'pin-input',
      placeholder: 'Choose a PIN',
      autocomplete: 'off',
    })
    const confirmInput = el('input', {
      type: 'password',
      id: 'pin-confirm',
      placeholder: 'Confirm PIN',
      autocomplete: 'off',
    })
    const enableBtn = el(
      'button',
      { class: 'btn' },
      'Enable encryption',
    )
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
      // Re-render to reflect the new state.
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
  const deleteBtn = el(
    'button',
    { class: 'btn btn-danger' },
    'Delete all data',
  )
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
    el(
      'p',
      {},
      'Permanently remove all data from this device.',
    ),
    deleteBtn,
  )

  container.replaceChildren(heading, exportGroup, encContent, dangerGroup)
}
