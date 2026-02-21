// Small helpers shared across UI views.

// Format an ISO date string for display (NZ locale).
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NZ', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Format an ISO datetime string to time only.
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NZ', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Return today's date in ISO format (YYYY-MM-DD).
export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Return current local time as HH:MM for an input[type=time] default.
export function nowTimeValue(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Combine a date (YYYY-MM-DD) and time (HH:MM) into an ISO datetime string.
export function toISODateTime(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString()
}

// Clear a container and append new content.
export function render(container: HTMLElement, ...children: Node[]): void {
  container.replaceChildren(...children)
}

// Shorthand for creating an element with optional attributes and children.
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      element.setAttribute(key, val)
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child))
    } else {
      element.appendChild(child)
    }
  }
  return element
}
