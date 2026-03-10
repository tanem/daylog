// Tagged template for building DOM elements via htm.
// Binds htm to a custom h() function that creates real DOM nodes,
// handling events (onclick, onchange, …), boolean properties (checked,
// selected, disabled), and DOM properties (value) transparently.

import htm from 'htm'

// Properties that must be set directly on the element rather than via
// setAttribute, because they hold runtime state.
const DOM_PROPERTIES = new Set(['checked', 'disabled', 'selected', 'value'])

const h = (
  tag: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): HTMLElement => {
  const element = document.createElement(tag)

  if (props) {
    /* v8 ignore start -- v8 cannot reliably track all branches through esbuild-transformed htm output */
    for (const [key, val] of Object.entries(props)) {
      if (key.startsWith('on') && typeof val === 'function') {
        element.addEventListener(
          key.slice(2).toLowerCase(),
          val as EventListener,
        )
      } else if (key === 'style' && typeof val === 'string') {
        // Use CSSOM to avoid CSP style-src violations.
        element.style.cssText = val
      } else if (DOM_PROPERTIES.has(key)) {
        ;(element as unknown as Record<string, unknown>)[key] = val
      } else if (val !== false && val !== null && val !== undefined) {
        element.setAttribute(key, val === true ? '' : String(val))
      }
    }
    /* v8 ignore stop */
  }

  const append = (child: unknown): void => {
    if (
      child === null ||
      child === undefined ||
      child === false ||
      child === true
    ) {
      return
    }
    if (Array.isArray(child)) {
      child.forEach(append)
      return
    }
    if (child instanceof Node) {
      element.appendChild(child)
    } else {
      element.appendChild(document.createTextNode(String(child)))
    }
  }
  children.forEach(append)

  return element
}

// htm returns a single element when the template has one root, or an
// array when there are multiple roots. We expose both possibilities so
// callers can spread arrays into replaceChildren.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const html = htm.bind<any>(h) as (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => HTMLElement | HTMLElement[]

// Normalise an html`` result into an array, so it can be spread into
// replaceChildren regardless of whether the template had one or many roots.
export const htmlList = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): HTMLElement[] => [html(strings, ...values)].flat() as HTMLElement[]
