// PIN unlock screen shown when encryption is enabled.

import { unlock } from '../crypto'
import { el } from './helpers'

export function renderUnlockView(
  container: HTMLElement,
  onUnlocked: () => void,
): void {
  const heading = el('h2', {}, 'Unlock Daylog')
  const pinInput = el('input', {
    type: 'password',
    id: 'unlock-pin',
    placeholder: 'Enter your PIN',
    autocomplete: 'off',
  })
  const msg = el('p', { class: 'pin-message' })
  const btn = el('button', { class: 'btn btn-primary' }, 'Unlock')

  btn.addEventListener('click', async () => {
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

  // Allow pressing Enter to unlock.
  pinInput.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      btn.click()
    }
  })

  container.replaceChildren(
    heading,
    el('p', {}, 'Your data is encrypted. Enter your PIN to continue.'),
    el('div', { class: 'pin-form' }, pinInput, btn),
    msg,
  )
}
