// Date parsing, formatting, and validation utilities.

// Format a Date as YYYY-MM-DD using local time.
export const toISODate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayISO = (): string => toISODate(new Date())

export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

export const isValidDate = (dateStr: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return false
  // Verify parsed components match input (catches e.g. Feb 30 → Mar 2).
  const [y, m, day] = dateStr.split('-').map(Number) as [number, number, number]
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day
}
