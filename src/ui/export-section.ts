// Export section of the settings view: JSON and CSV export buttons.

import { loadAllEntries } from '../entries'
import { toJSON, toCSV, download } from '../export'
import { html } from './html'

const CONFIRM_TIMEOUT_MS = 3000

export const buildExportSection = (encEnabled: boolean): HTMLElement => {
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

  // Two-step confirmation for export when encryption is enabled.
  const confirmExport = (
    btn: HTMLButtonElement,
    originalText: string,
    formatter: (entries: Awaited<ReturnType<typeof loadAllEntries>>) => string,
    ext: string,
    mime: string,
  ): void => {
    let confirmed = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    const reset = (): void => {
      confirmed = false
      btn.textContent = originalText
      btn.classList.remove('btn-danger')
      /* v8 ignore start */
      if (timerId !== null) {
        clearTimeout(timerId)
        timerId = null
      }
      /* v8 ignore stop */
    }

    btn.addEventListener('click', () => {
      if (!encEnabled) {
        doExport(formatter, ext, mime)
        return
      }
      if (confirmed) {
        reset()
        doExport(formatter, ext, mime)
        return
      }
      confirmed = true
      btn.textContent = 'Confirm: download plaintext file?'
      btn.classList.add('btn-danger')
      timerId = setTimeout(reset, CONFIRM_TIMEOUT_MS)
    })
  }

  const exportWarning = encEnabled
    ? 'Exports are plaintext even when encryption is enabled. Handle them carefully.'
    : 'Export files are plaintext. Handle them carefully.'

  const jsonBtn = html`<button class="btn">
    Export as JSON
  </button>` as HTMLButtonElement
  const csvBtn = html`<button class="btn">
    Export as CSV
  </button>` as HTMLButtonElement

  confirmExport(jsonBtn, 'Export as JSON', toJSON, 'json', 'application/json')
  confirmExport(csvBtn, 'Export as CSV', toCSV, 'csv', 'text/csv')

  return html`
    <div class="settings-group">
      <h3>Export data</h3>
      <p>${exportWarning}</p>
      <div class="btn-row">${jsonBtn} ${csvBtn}</div>
    </div>
  ` as HTMLElement
}
