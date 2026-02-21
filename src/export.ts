// Export attendance records as JSON or CSV.

import type { AttendanceEntry } from './types'

// Export entries as a formatted JSON string.
export function toJSON(entries: AttendanceEntry[]): string {
  return JSON.stringify(entries, null, 2)
}

// Export entries as CSV with a header row.
export function toCSV(entries: AttendanceEntry[]): string {
  const header = 'id,date,arrivedAt,leftAt,reason,notes'
  const rows = entries.map((e) => {
    const fields = [
      e.id,
      e.date,
      e.arrivedAt,
      e.leftAt ?? '',
      e.reason,
      // Escape double quotes and wrap in quotes if notes contain commas.
      csvField(e.notes ?? ''),
    ]
    return fields.join(',')
  })
  return [header, ...rows].join('\n')
}

// Wrap a field in double quotes if it contains commas, quotes, or newlines.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// Trigger a file download in the browser.
export function download(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
