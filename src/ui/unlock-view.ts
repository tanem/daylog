// PIN unlock screen shown when encryption is enabled.

import { unlock } from '../crypto'
import { fieldGroup } from './field-group'
import { html, htmlList } from './html'

export const renderUnlockView = (
  container: HTMLElement,
  onUnlocked: () => void,
): void => {
  const pinInput = html`<input
    autocomplete="off"
    id="unlock-pin"
    type="password"
  />` as HTMLInputElement
  const msg = html`<p
    class="pin-message"
    aria-live="assertive"
  ></p>` as HTMLElement

  const onSubmit = async (e: Event): Promise<void> => {
    e.preventDefault()
    const pin = pinInput.value
    if (!pin) {
      msg.textContent = 'Please enter your PIN.'
      return
    }
    try {
      const ok = await unlock(pin)
      if (ok) {
        onUnlocked()
      } else {
        msg.textContent = 'Could not unlock. Check your PIN.'
      }
    } catch {
      /* v8 ignore start */
      msg.textContent = 'An error occurred. Please try again.'
      /* v8 ignore stop */
    }
  }

  container.replaceChildren(
    ...htmlList`
    <h2>Unlock Daylog</h2>
    <p>Your data is encrypted. Enter your PIN to continue.</p>
    <form class="pin-form" onsubmit=${onSubmit}>
      ${fieldGroup('PIN', pinInput)}
      <button class="btn btn-primary" type="submit">Unlock</button>
      ${msg}
    </form>
  `,
  )
}
