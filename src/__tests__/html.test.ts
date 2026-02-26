// Tests for the htm-based html tagged template.

import { describe, expect, it } from 'vitest'
import { html, htmlList } from '../ui/html'

describe('html', () => {
  it('creates a single element', () => {
    const div = html`<div class="test">hello</div>` as HTMLElement
    expect(div.tagName).toBe('DIV')
    expect(div.className).toBe('test')
    expect(div.textContent).toBe('hello')
  })

  it('sets boolean HTML attributes with val === true', () => {
    const div = html`<div hidden=${true}></div>` as HTMLElement
    expect(div.hasAttribute('hidden')).toBe(true)
    expect(div.getAttribute('hidden')).toBe('')
  })

  it('omits attributes when value is false', () => {
    const div = html`<div hidden=${false}></div>` as HTMLElement
    expect(div.hasAttribute('hidden')).toBe(false)
  })

  it('sets DOM properties directly (checked, value, etc.)', () => {
    const input = html`<input
      type="checkbox"
      checked=${true}
    />` as HTMLInputElement
    expect(input.checked).toBe(true)
  })

  it('attaches event listeners for on* attributes', () => {
    let clicked = false
    const btn = html`<button
      onclick=${() => {
        clicked = true
      }}
    >
      Click
    </button>` as HTMLElement
    btn.click()
    expect(clicked).toBe(true)
  })

  it('interpolates child elements', () => {
    const child = html`<span>inner</span>` as HTMLElement
    const parent = html`<div>${child}</div>` as HTMLElement
    expect(parent.children).toHaveLength(1)
    expect(parent.textContent).toBe('inner')
  })

  it('handles arrays of children', () => {
    const items = ['a', 'b', 'c']
    const ul = html`<ul>
      ${items.map((i) => html`<li>${i}</li>`)}
    </ul>` as HTMLElement
    expect(ul.children).toHaveLength(3)
    expect(ul.textContent).toBe('abc')
  })

  it('skips null, undefined, and boolean children', () => {
    const div = html`<div>
      ${null}${undefined}${true}${false}text
    </div>` as HTMLElement
    expect(div.textContent).toBe('text')
  })
})

describe('htmlList', () => {
  it('returns an array for a single-root template', () => {
    const result = htmlList`<div>one</div>`
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('returns an array for a multi-root template', () => {
    const result = htmlList`<p>one</p><p>two</p>`
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
  })
})
