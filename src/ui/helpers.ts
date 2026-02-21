// Small helpers shared across UI views.

// Format an ISO date string for display (NZ locale).
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-NZ', {
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
