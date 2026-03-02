// Export attendance records as JSON or CSV.

import type { AttendanceEntry } from './types'

export const toJSON = (entries: AttendanceEntry[]): string =>
  JSON.stringify(entries, null, 2)

export const toCSV = (entries: AttendanceEntry[]): string => {
  const header = 'id,date,reason,notes'
  const rows = entries.map((e) => {
    const fields = [e.id, e.date, e.reason, csvField(e.notes ?? '')]
    return fields.join(',')
  })
  return [header, ...rows].join('\n')
}

const csvField = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

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
