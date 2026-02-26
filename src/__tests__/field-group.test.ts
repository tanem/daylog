// Tests for the fieldGroup accessible form builder.

import { describe, expect, it } from 'vitest'
import { fieldGroup } from '../ui/field-group'

describe('fieldGroup', () => {
  it('omits for attribute when input has no id', () => {
    const input = document.createElement('input')
    input.type = 'text'
    const group = fieldGroup('No id', input)

    const label = group.querySelector('label')!
    expect(label.getAttribute('for')).toBeNull()
  })
})
