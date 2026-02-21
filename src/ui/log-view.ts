// Log view: form to add or edit an attendance entry.

import type { AttendanceEntry, Reason } from '../types'
import { saveEntry } from '../entries'
import { el, todayISO, nowTimeValue, toISODateTime } from './helpers'

const REASONS: { value: Reason; label: string }[] = [
  { value: 'office', label: 'Office' },
  { value: 'wfh', label: 'Working from home' },
  { value: 'leave', label: 'Leave' },
  { value: 'sick', label: 'Sick' },
]

// Render the log form into the given container.
// If `existing` is provided, pre-fill the form for editing.
export function renderLogView(
  container: HTMLElement,
  onSaved: () => void,
  existing?: AttendanceEntry,
): void {
  const heading = el('h2', {}, existing ? 'Edit entry' : 'Log attendance')

  const dateInput = el('input', {
    type: 'date',
    id: 'entry-date',
    value: existing?.date ?? todayISO(),
  })

  const arrivedInput = el('input', {
    type: 'time',
    id: 'entry-arrived',
    value: existing ? existing.arrivedAt.slice(11, 16) : nowTimeValue(),
  })

  const leftInput = el('input', {
    type: 'time',
    id: 'entry-left',
    value: existing?.leftAt ? existing.leftAt.slice(11, 16) : '',
  })

  const reasonSelect = el('select', { id: 'entry-reason' })
  for (const r of REASONS) {
    const opt = el('option', { value: r.value }, r.label)
    if (existing?.reason === r.value) {
      opt.selected = true
    }
    reasonSelect.appendChild(opt)
  }

  const notesInput = el('textarea', {
    id: 'entry-notes',
    rows: '3',
    placeholder: 'Optional notes…',
  })
  if (existing?.notes) {
    notesInput.value = existing.notes
  }

  const submitBtn = el(
    'button',
    { type: 'submit', class: 'btn btn-primary' },
    existing ? 'Update' : 'Save',
  )

  const form = el('form', { class: 'log-form' })
  form.append(
    fieldGroup('Date', dateInput),
    fieldGroup('Arrived', arrivedInput),
    fieldGroup('Left', leftInput),
    fieldGroup('Reason', reasonSelect),
    fieldGroup('Notes', notesInput),
    submitBtn,
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const date = dateInput.value
    const arrivedAt = toISODateTime(date, arrivedInput.value)
    const leftVal = leftInput.value
    const leftAt = leftVal ? toISODateTime(date, leftVal) : undefined
    const reason = reasonSelect.value as Reason
    const notes = notesInput.value.trim() || undefined

    await saveEntry({
      id: existing?.id,
      date,
      arrivedAt,
      leftAt,
      reason,
      notes,
    })

    onSaved()
  })

  container.replaceChildren(heading, form)
}

function fieldGroup(label: string, input: HTMLElement): HTMLElement {
  const wrapper = el('div', { class: 'field-group' })
  wrapper.append(el('label', {}, label), input)
  return wrapper
}
