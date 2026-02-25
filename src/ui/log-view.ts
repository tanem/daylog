// Log view: form to add or edit an attendance entry.

import type { AttendanceEntry, Reason } from '../types'
import { calculateAttendance } from '../attendance'
import { loadAllEntries, saveEntry } from '../entries'
import { loadAttendanceSettings } from '../settings'
import { el, fieldGroup, isValidDate, todayISO } from './helpers'

const REASONS: { label: string; value: Reason }[] = [
  { label: 'Office', value: 'office' },
  { label: 'Working from home', value: 'wfh' },
  { label: 'Leave', value: 'leave' },
  { label: 'Sick', value: 'sick' },
  { label: 'Public holiday', value: 'public-holiday' },
]

const DEFAULT_PLACEHOLDER = 'Optional notes…'
const WFH_PLACEHOLDER = 'Reason for working from home…'

// Build the attendance stats banner element.
const buildBanner = (
  percentage: number,
  attended: number,
  total: number,
  target: number,
  weeks: number,
): HTMLElement => {
  const ok = percentage >= target
  const pctEl = el(
    'div',
    {
      class: `attendance-percentage ${ok ? 'attendance-ok' : 'attendance-below'}`,
    },
    `${percentage}%`,
  )
  const detailEl = el(
    'div',
    { class: 'attendance-detail' },
    `${attended} of ${total} days in office (last ${weeks} weeks, target ${target}%)`,
  )
  return el(
    'div',
    {
      class: 'attendance-banner',
      role: 'status',
      'aria-label': 'Attendance summary',
    },
    pctEl,
    detailEl,
  )
}

// Render the log form into the given container.
// If `existing` is provided, pre-fill the form for editing.
export const renderLogView = async (
  container: HTMLElement,
  onSaved: () => void,
  existing?: AttendanceEntry,
): Promise<void> => {
  const heading = el('h2', {}, existing ? 'Edit entry' : 'Log attendance')

  const dateInput = el('input', {
    id: 'entry-date',
    type: 'date',
    value: existing?.date ?? todayISO(),
  })

  const reasonSelect = el('select', { id: 'entry-reason' })
  for (const r of REASONS) {
    const opt = el('option', { value: r.value }, r.label)
    if (existing?.reason === r.value) {
      opt.selected = true
    }
    reasonSelect.appendChild(opt)
  }

  const initialReason = existing?.reason ?? 'office'
  const notesInput = el('textarea', {
    id: 'entry-notes',
    placeholder:
      initialReason === 'wfh' ? WFH_PLACEHOLDER : DEFAULT_PLACEHOLDER,
    rows: '3',
  })
  if (existing?.notes) {
    notesInput.value = existing.notes
  }

  reasonSelect.addEventListener('change', () => {
    notesInput.placeholder =
      reasonSelect.value === 'wfh' ? WFH_PLACEHOLDER : DEFAULT_PLACEHOLDER
  })

  const submitBtn = el(
    'button',
    { class: 'btn btn-primary', type: 'submit' },
    existing ? 'Update' : 'Save',
  )

  const formMsg = el('p', { class: 'form-message', 'aria-live': 'assertive' })

  const form = el('form', { class: 'log-form' })
  form.append(
    fieldGroup('Date', dateInput),
    fieldGroup('Reason', reasonSelect),
    fieldGroup('Notes', notesInput),
    submitBtn,
    formMsg,
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const date = dateInput.value
    if (!isValidDate(date)) {
      formMsg.textContent = 'Please enter a valid date.'
      return
    }
    formMsg.textContent = ''
    const reason = reasonSelect.value as Reason
    const notes = notesInput.value.trim() || undefined

    await saveEntry({
      id: existing?.id,
      date,
      reason,
      notes,
    })

    onSaved()
  })

  // Attendance banner (only when tracking is enabled).
  const settings = await loadAttendanceSettings()
  const children: HTMLElement[] = [heading]

  if (settings.enabled) {
    const allEntries = await loadAllEntries()
    const stats = calculateAttendance(allEntries, settings)
    children.push(
      buildBanner(
        stats.percentage,
        stats.attended,
        stats.total,
        stats.target,
        settings.weeks,
      ),
    )
  }

  children.push(form)
  container.replaceChildren(...children)
}
