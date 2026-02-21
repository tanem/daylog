// Unit tests for UI helper functions.

import { describe, expect, it, vi } from 'vitest'
import { el, formatDate, render, todayISO } from '../ui/helpers'

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
