// Export attendance records as JSON or CSV.

import type { AttendanceEntry } from './types'

// Export entries as a formatted JSON string.
export const toJSON = (entries: AttendanceEntry[]): string =>
  JSON.stringify(entries, null, 2)

// Export entries as CSV with a header row.
export const toCSV = (entries: AttendanceEntry[]): string => {
  const header = 'id,date,reason,notes'
  const rows = entries.map((e) => {
    const fields = [e.id, e.date, e.reason, csvField(e.notes ?? '')]
    return fields.join(',')
  })
  return [header, ...rows].join('\n')
}

// Wrap a field in double quotes if it contains commas, quotes, or newlines.
const csvField = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// Trigger a file download in the browser.
// jsdom does not support blob URLs, so this is mocked in tests.
/* v8 ignore start */
export const download = (
  content: string,
  filename: string,
  mimeType: string,
): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Defer revocation to the next event loop tick so the browser finishes
  // initiating the download before the blob URL is invalidated.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
/* v8 ignore stop */
