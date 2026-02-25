// PIN unlock screen shown when encryption is enabled.

import { unlock } from '../crypto'
import { el, fieldGroup } from './helpers'

export const renderUnlockView = (
  container: HTMLElement,
  onUnlocked: () => void,
): void => {
  const heading = el('h2', {}, 'Unlock Daylog')
  const pinInput = el('input', {
    autocomplete: 'off',
    id: 'unlock-pin',
    type: 'password',
  })
  const msg = el('p', { class: 'pin-message', 'aria-live': 'assertive' })
  const btn = el(
    'button',
    { class: 'btn btn-primary', type: 'submit' },
    'Unlock',
  )

  const form = el('form', { class: 'pin-form' })
  form.append(fieldGroup('PIN', pinInput), btn, msg)

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const pin = (pinInput as HTMLInputElement).value
    if (!pin) {
      msg.textContent = 'Please enter your PIN.'
      return
    }
    const ok = await unlock(pin)
    if (ok) {
      onUnlocked()
    } else {
      msg.textContent = 'Could not unlock. Check your PIN.'
    }
  })

  container.replaceChildren(
    heading,
    el('p', {}, 'Your data is encrypted. Enter your PIN to continue.'),
    form,
  )
}
