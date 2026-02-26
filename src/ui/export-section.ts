// Export section of the settings view: JSON and CSV export buttons.

import { loadAllEntries } from '../entries'
import { toJSON, toCSV, download } from '../export'
import { html } from './html'

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

  const exportWarning = encEnabled
    ? 'Exports are plaintext even when encryption is enabled. Handle them carefully.'
    : 'Export files are plaintext. Handle them carefully.'

  return html`
    <div class="settings-group">
      <h3>Export data</h3>
      <p>${exportWarning}</p>
      <div class="btn-row">
        <button
          class="btn"
          onclick=${() => doExport(toJSON, 'json', 'application/json')}
        >
          Export as JSON
        </button>
        <button class="btn" onclick=${() => doExport(toCSV, 'csv', 'text/csv')}>
          Export as CSV
        </button>
      </div>
    </div>
  ` as HTMLElement
}
