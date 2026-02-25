// Unit tests for UI helper functions.

import { describe, expect, it, vi } from 'vitest'
import {
  el,
  fieldGroup,
  formatDate,
  isValidDate,
  render,
  todayISO,
} from '../ui/helpers'

describe('el', () => {
  it('creates an element with the given tag', () => {
    const div = el('div')
    expect(div.tagName).toBe('DIV')
  })

  it('sets attributes from the attrs object', () => {
    const input = el('input', { id: 'my-input', type: 'text' })
    expect(input.id).toBe('my-input')
    expect(input.type).toBe('text')
  })

  it('appends string children as text nodes', () => {
    const p = el('p', {}, 'Hello ', 'world')
    expect(p.textContent).toBe('Hello world')
    expect(p.childNodes).toHaveLength(2)
    expect(p.childNodes[0]!.nodeType).toBe(Node.TEXT_NODE)
  })

  it('appends element children', () => {
    const child = el('span', {}, 'inner')
    const parent = el('div', {}, child)
    expect(parent.children).toHaveLength(1)
    expect(parent.children[0]!.tagName).toBe('SPAN')
    expect(parent.textContent).toBe('inner')
  })

  it('handles mixed string and element children', () => {
    const span = el('span', {}, 'bold')
    const p = el('p', {}, 'Hello ', span, ' world')
    expect(p.childNodes).toHaveLength(3)
    expect(p.textContent).toBe('Hello bold world')
  })

  it('works with no attrs (undefined)', () => {
    const div = el('div', undefined, 'text')
    expect(div.textContent).toBe('text')
    expect(div.attributes).toHaveLength(0)
  })
})

describe('render', () => {
  it('replaces container children with new content', () => {
    const container = document.createElement('div')
    container.appendChild(document.createTextNode('old'))

    const newChild = el('p', {}, 'new')
    render(container, newChild)

    expect(container.children).toHaveLength(1)
    expect(container.textContent).toBe('new')
  })

  it('clears container when called with no children', () => {
    const container = document.createElement('div')
    container.appendChild(document.createTextNode('old'))

    render(container)
    expect(container.childNodes).toHaveLength(0)
  })
})

describe('formatDate', () => {
  it('formats an ISO date string in en-NZ locale', () => {
    const result = formatDate('2026-02-22')
    // en-NZ format: "Sun, 22 Feb 2026" (exact format may vary by runtime).
    expect(result).toContain('2026')
    expect(result).toContain('Feb')
    expect(result).toContain('22')
  })
})

describe('fieldGroup', () => {
  it('sets for attribute when input has an id', () => {
    const input = el('input', { id: 'my-field', type: 'text' })
    const group = fieldGroup('My label', input)

    const label = group.querySelector('label')!
    expect(label.textContent).toBe('My label')
    expect(label.getAttribute('for')).toBe('my-field')
    expect(group.classList.contains('field-group')).toBe(true)
    expect(group.contains(input)).toBe(true)
  })

  it('omits for attribute when input has no id', () => {
    const input = el('input', { type: 'text' })
    const group = fieldGroup('No id', input)

    const label = group.querySelector('label')!
    expect(label.getAttribute('for')).toBeNull()
  })
})

describe('todayISO', () => {
  it('returns today in YYYY-MM-DD format', () => {
    const result = todayISO()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('matches the current date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00'))

    const result = todayISO()
    expect(result).toBe('2026-06-15')

    vi.useRealTimers()
  })
})

describe('isValidDate', () => {
  it('accepts a valid date', () => {
    expect(isValidDate('2026-02-20')).toBe(true)
  })

  it('accepts leap day in a leap year', () => {
    expect(isValidDate('2024-02-29')).toBe(true)
  })

  it('rejects wrong format', () => {
    expect(isValidDate('20-02-2026')).toBe(false)
    expect(isValidDate('2026/02/20')).toBe(false)
    expect(isValidDate('not-a-date')).toBe(false)
  })

  it('rejects invalid calendar date (e.g. Feb 30)', () => {
    expect(isValidDate('2026-02-30')).toBe(false)
  })

  it('rejects leap day in a non-leap year', () => {
    expect(isValidDate('2025-02-29')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidDate('')).toBe(false)
  })

  it('rejects a date that matches the pattern but produces NaN', () => {
    expect(isValidDate('0000-00-00')).toBe(false)
  })
})
