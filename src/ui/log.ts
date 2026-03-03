// Log view: form to add or edit an attendance entry.

import type { AttendanceEntry, Reason } from '../types'
import { REASON_LABELS } from '../types'
import { calculateAttendance } from '../attendance'
import { loadAllEntries, saveEntry } from '../entries'
import { loadAttendanceSettings } from '../settings'
import { isValidDate, todayISO } from '../dates'
import { fieldGroup } from './fields'
import { html } from './html'

const DEFAULT_PLACEHOLDER = 'Optional notes…'
const WFH_PLACEHOLDER = 'Reason for working from home…'

const buildBanner = (
  percentage: number,
  attended: number,
  total: number,
  target: number,
  weeks: number,
): HTMLElement => {
  const ok = percentage >= target
  return html`
    <div
      class="attendance-banner"
      role="status"
      aria-label="Attendance summary"
    >
      <div
        class="attendance-percentage ${ok
          ? 'attendance-ok'
          : 'attendance-below'}"
      >
        ${percentage}%
      </div>
      <div class="attendance-detail">
        ${`${attended} of ${total} days in office (last ${weeks} weeks, target ${target}%)`}
      </div>
    </div>
  ` as HTMLElement
}

// If `existing` is provided, pre-fill the form for editing.
export const renderLogView = async (
  container: HTMLElement,
  onSaved: () => void,
  existing?: AttendanceEntry,
): Promise<void> => {
  const heading = existing ? 'Edit entry' : 'Log attendance'

  const dateInput = html`
    <input id="entry-date" type="date" value=${existing?.date ?? todayISO()} />
  ` as HTMLInputElement

  const reasonSelect = html`
    <select id="entry-reason">
      ${Object.entries(REASON_LABELS).map(
        ([value, { label }]) =>
          html`<option value=${value} selected=${existing?.reason === value}>
            ${label}
          </option>`,
      )}
    </select>
  ` as HTMLSelectElement

  const initialReason = existing?.reason ?? 'office'
  const notesInput = html`
    <textarea
      id="entry-notes"
      placeholder=${initialReason === 'wfh'
        ? WFH_PLACEHOLDER
        : DEFAULT_PLACEHOLDER}
      rows="3"
    />
  ` as HTMLTextAreaElement
  if (existing?.notes) {
    notesInput.value = existing.notes
  }

  reasonSelect.addEventListener('change', () => {
    notesInput.placeholder =
      reasonSelect.value === 'wfh' ? WFH_PLACEHOLDER : DEFAULT_PLACEHOLDER
  })

  const formMsg = html`<p
    class="form-message"
    aria-live="assertive"
  ></p>` as HTMLElement

  const onSubmit = async (e: Event): Promise<void> => {
    e.preventDefault()
    const date = dateInput.value
    if (!isValidDate(date)) {
      formMsg.textContent = 'Please enter a valid date.'
      return
    }
    formMsg.textContent = ''
    const reason = reasonSelect.value as Reason
    const notes = notesInput.value.trim() || undefined

    try {
      await saveEntry({
        id: existing?.id,
        date,
        reason,
        notes,
      })
      onSaved()
    } catch {
      /* v8 ignore start */
      formMsg.textContent = 'Failed to save entry. Please try again.'
      /* v8 ignore stop */
    }
  }

  const settings = await loadAttendanceSettings()
  const children: (HTMLElement | string)[] = []

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

  container.replaceChildren(
    html`<h2>${heading}</h2>` as HTMLElement,
    ...children,
    html`
      <form class="log-form" onsubmit=${onSubmit}>
        ${fieldGroup('Date', dateInput)} ${fieldGroup('Reason', reasonSelect)}
        ${fieldGroup('Notes', notesInput)}
        <button class="btn btn-primary" type="submit">
          ${existing ? 'Update' : 'Save'}
        </button>
        ${formMsg}
      </form>
    ` as HTMLElement,
  )
}
