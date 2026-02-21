// History view: list of past entries with edit and delete actions.

import type { AttendanceEntry } from '../types'
import { loadAllEntries, removeEntry } from '../entries'
import { el, formatDate } from './helpers'

// Render the history list into the given container.
export const renderHistoryView = async (
  container: HTMLElement,
  onEdit: (entry: AttendanceEntry) => void,
): Promise<void> => {
  const heading = el('h2', {}, 'History')
  const entries = await loadAllEntries()

  if (entries.length === 0) {
    container.replaceChildren(
      heading,
      el('p', { class: 'empty-state' }, 'No entries yet. Log your first day!'),
    )
    return
  }

  entries.sort((a, b) => b.date.localeCompare(a.date))

  const list = el('ul', { class: 'entry-list' })
  for (const entry of entries) {
    list.appendChild(entryItem(entry, onEdit, () => refresh(container, onEdit)))
  }

  container.replaceChildren(heading, list)
}

const entryItem = (
  entry: AttendanceEntry,
  onEdit: (entry: AttendanceEntry) => void,
  onDeleted: () => void,
): HTMLElement => {
  const li = el(
    'li',
    { class: 'entry-item' },
    el(
      'div',
      { class: 'entry-summary' },
      el('span', { class: 'entry-date' }, formatDate(entry.date)),
      el(
        'span',
        { class: `entry-reason entry-reason--${entry.reason}` },
        reasonLabel(entry.reason),
      ),
    ),
  )

  if (entry.notes) {
    li.appendChild(el('p', { class: 'entry-notes' }, entry.notes))
  }

  const actions = el('div', { class: 'entry-actions' })

  const editBtn = el('button', { class: 'btn btn-small' }, 'Edit')
  editBtn.addEventListener('click', () => onEdit(entry))

  const deleteBtn = el(
    'button',
    { class: 'btn btn-small btn-danger' },
    'Delete',
  )
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this entry? This cannot be undone.')) {
      await removeEntry(entry.id)
      onDeleted()
    }
  })

  actions.append(editBtn, deleteBtn)
  li.appendChild(actions)

  return li
}

const reasonLabel = (reason: string): string => {
  const labels: Record<string, string> = {
    office: 'Office',
    wfh: 'WFH',
    leave: 'Leave',
    sick: 'Sick',
    'public-holiday': 'Holiday',
  }
  return labels[reason] ?? reason
}

// Re-render the view after a deletion.
const refresh = (
  container: HTMLElement,
  onEdit: (entry: AttendanceEntry) => void,
): void => {
  renderHistoryView(container, onEdit)
}
