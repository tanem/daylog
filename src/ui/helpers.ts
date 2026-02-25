// Small helpers shared across UI views.

// Format an ISO date string for display (NZ locale).
export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

// Return today's date in ISO format (YYYY-MM-DD).
export const todayISO = (): string => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Clear a container and append new content.
export const render = (container: HTMLElement, ...children: Node[]): void => {
  container.replaceChildren(...children)
}

// Shorthand for creating an element with optional attributes and children.
export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] => {
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

// Wrap a labelled input in a field group div.
// Links the label to the input via its id attribute for accessibility.
export const fieldGroup = (label: string, input: HTMLElement): HTMLElement => {
  const wrapper = el('div', { class: 'field-group' })
  const labelAttrs: Record<string, string> = {}
  const inputId = input.getAttribute('id')
  if (inputId) {
    labelAttrs.for = inputId
  }
  wrapper.append(el('label', labelAttrs, label), input)
  return wrapper
}

// Validate that a string is a real YYYY-MM-DD calendar date.
export const isValidDate = (dateStr: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return false
  // Verify parsed components match input (catches e.g. Feb 30 → Mar 2).
  const [y, m, day] = dateStr.split('-').map(Number) as [number, number, number]
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day
}
