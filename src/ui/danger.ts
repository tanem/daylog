// Danger zone section of the settings view: delete all data.

import { wipeAllData } from '../entries'
import { lock } from '../crypto'
import { fieldGroup } from './fields'
import { html } from './html'

export const buildDangerSection = (onDataWiped: () => void): HTMLElement => {
  const deleteConfirmInput = html`
    <input autocomplete="off" id="delete-confirm" type="text" />
  ` as HTMLInputElement
  const deleteMsg = html`<p
    class="pin-message"
    aria-live="assertive"
  ></p>` as HTMLElement

  const onDelete = async (e: Event): Promise<void> => {
    e.preventDefault()
    const value = deleteConfirmInput.value.trim().toLowerCase()
    if (value !== 'delete') {
      deleteMsg.textContent = 'Type "delete" to confirm.'
      return
    }
    try {
      lock()
      await wipeAllData()
      onDataWiped()
    } catch {
      /* v8 ignore start */
      deleteMsg.textContent = 'Failed to delete data. Please try again.'
      /* v8 ignore stop */
    }
  }

  return html`
    <div class="settings-group">
      <h3>Danger zone</h3>
      <p>Permanently remove all data from this device.</p>
      <form class="pin-form" onsubmit=${onDelete}>
        ${fieldGroup('Type "delete" to confirm', deleteConfirmInput)}
        <button class="btn btn-danger" type="submit">Delete all data</button>
        ${deleteMsg}
      </form>
    </div>
  ` as HTMLElement
}
