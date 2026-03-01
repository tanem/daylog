// Accessible form field builder.

// Shorthand for creating an element with attributes and string children.
const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
  ...children: string[]
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag)
  for (const [key, val] of Object.entries(attrs)) {
    element.setAttribute(key, val)
  }
  for (const child of children) {
    element.appendChild(document.createTextNode(child))
  }
  return element
}

// Wrap a labelled input in a field group div.
// Links the label to the input via its id attribute for accessibility.
export const fieldGroup = (label: string, input: HTMLElement): HTMLElement => {
  const wrapper = el('div', { class: 'field-group' })
  const labelAttrs: Record<string, string> = {}
  const inputId = input.getAttribute('id')
  /* v8 ignore start */
  if (inputId) {
    labelAttrs.for = inputId
  }
  /* v8 ignore stop */
  wrapper.append(el('label', labelAttrs, label), input)
  return wrapper
}
