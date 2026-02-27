// PIN unlock screen shown when encryption is enabled.

import { unlock } from '../crypto'
import type { UnlockResult } from '../types'
import { fieldGroup } from './field-group'
import { html, htmlList } from './html'

// Format a millisecond duration as a human-readable string.
const formatWait = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? '1 minute' : `${minutes} minutes`
}

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
  const submitBtn = html`<button class="btn btn-primary" type="submit">
    Unlock
  </button>` as HTMLButtonElement

  const showResult = (result: UnlockResult): void => {
    if (result.wiped) {
      msg.textContent =
        'All data has been erased after too many failed attempts.'
      submitBtn.disabled = true
      pinInput.disabled = true
      return
    }
    if (result.locked && result.retryAfterMs) {
      msg.textContent = `Too many attempts. Try again in ${formatWait(result.retryAfterMs)}.`
      submitBtn.disabled = true
      pinInput.disabled = true
      // Re-enable after the cooldown expires.
      setTimeout(() => {
        submitBtn.disabled = false
        pinInput.disabled = false
        msg.textContent = ''
        pinInput.focus()
      }, result.retryAfterMs)
      return
    }
    msg.textContent = 'Could not unlock. Check your PIN.'
  }

  const onSubmit = async (e: Event): Promise<void> => {
    e.preventDefault()
    const pin = pinInput.value
    if (!pin) {
      msg.textContent = 'Please enter your PIN.'
      return
    }
    try {
      const result = await unlock(pin)
      if (result.success) {
        onUnlocked()
      } else {
        showResult(result)
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
      ${submitBtn}
      ${msg}
    </form>
  `,
  )
}
