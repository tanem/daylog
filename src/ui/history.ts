// History view: list of past entries with edit and delete actions.

import type { AttendanceEntry } from '../types'
import { REASON_LABELS } from '../types'
import { loadAllEntries, removeEntry } from '../entries'
import { formatDate } from '../dates'
import { html, htmlList } from './html'

export const renderHistoryView = async (
  container: HTMLElement,
  onEdit: (entry: AttendanceEntry) => void,
): Promise<void> => {
  const entries = await loadAllEntries()

  if (entries.length === 0) {
    container.replaceChildren(
      ...htmlList`
      <h2>History</h2>
      <p class="empty-state">No entries yet. Log your first day!</p>
    `,
    )
    return
  }

  entries.sort((a, b) => b.date.localeCompare(a.date))

  container.replaceChildren(
    html`<h2>History</h2>` as HTMLElement,
    html`
      <ul class="entry-list">
        ${entries.map((entry) =>
          entryItem(entry, onEdit, () => refresh(container, onEdit)),
        )}
      </ul>
    ` as HTMLElement,
  )
}

const entryItem = (
  entry: AttendanceEntry,
  onEdit: (entry: AttendanceEntry) => void,
  onDeleted: () => void,
): HTMLElement => {
  const dateLabel = formatDate(entry.date)

  // Action buttons need references for the delete confirmation swap.
  const actions = html`<div class="entry-actions"></div>` as HTMLElement

  const editBtn = html`
    <button
      class="btn btn-small"
      aria-label="Edit entry for ${dateLabel}"
      onclick=${() => onEdit(entry)}
    >
      Edit
    </button>
  ` as HTMLElement

  const deleteBtn = html`
    <button
      class="btn btn-small btn-danger"
      aria-label="Delete entry for ${dateLabel}"
      onclick=${() => showConfirm()}
    >
      Delete
    </button>
  ` as HTMLElement

  const showConfirm = (): void => {
    const confirmBtn = html`
      <button class="btn btn-small btn-danger" onclick=${onConfirm}>
        Confirm
      </button>
    ` as HTMLElement
    const cancelBtn = html`
      <button class="btn btn-small" onclick=${resetActions}>Cancel</button>
    ` as HTMLElement
    actions.replaceChildren(
      html`<span class="confirm-prompt">Delete?</span>` as HTMLElement,
      confirmBtn,
      cancelBtn,
    )
    confirmBtn.focus()
  }

  const onConfirm = async (): Promise<void> => {
    try {
      await removeEntry(entry.id)
      onDeleted()
    } catch {
      /* v8 ignore start */
      resetActions()
      /* v8 ignore stop */
    }
  }

  const resetActions = (): void => {
    actions.replaceChildren(editBtn, deleteBtn)
  }

  resetActions()

  return html`
    <li class="entry-item">
      <div class="entry-summary">
        <span class="entry-date">${dateLabel}</span>
        <span class="entry-reason entry-reason--${entry.reason}">
          ${reasonLabel(entry.reason)}
        </span>
      </div>
      ${entry.notes ? html`<p class="entry-notes">${entry.notes}</p>` : null}
      ${actions}
    </li>
  ` as HTMLElement
}

const reasonLabel = (reason: string): string =>
  /* v8 ignore next -- defensive fallback for unknown reason values */
  REASON_LABELS[reason as keyof typeof REASON_LABELS]?.short ?? reason

const refresh = async (
  container: HTMLElement,
  onEdit: (entry: AttendanceEntry) => void,
): Promise<void> => {
  await renderHistoryView(container, onEdit)
  // Focus the heading so screen readers announce the updated view.
  const h = container.querySelector('h2')
  /* v8 ignore start */
  if (!h) return
  /* v8 ignore stop */
  h.setAttribute('tabindex', '-1')
  h.focus()
}
