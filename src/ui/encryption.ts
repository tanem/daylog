// Encryption section of the settings view: enable, disable, and change PIN.

import {
  migrateEntriesToEncrypted,
  changeEncryptionPin,
  disableEncryption,
} from '../encryption'
import { enableEncryption, MIN_PIN_LENGTH, unlock } from '../crypto'
import type { UnlockResult } from '../types'
import { fieldGroup } from './fields'
import { html } from './html'

// Re-export so the UI can reference the same constant.
export { MIN_PIN_LENGTH } from '../crypto'

type Strength = 'weak' | 'fair' | 'strong'

// Assess PIN strength. Advisory only: does not block submission.
export const pinStrength = (pin: string): Strength => {
  const hasLetters = /[a-zA-Z]/.test(pin)
  if (hasLetters && pin.length >= 10) return 'strong'
  if ((hasLetters && pin.length >= 6) || pin.length > 8) return 'fair'
  return 'weak'
}

// Create a strength indicator element and bind it to an input's input event.
const bindStrengthIndicator = (input: HTMLInputElement): HTMLElement => {
  const indicator = html`<p
    class="pin-strength"
    aria-live="polite"
  ></p>` as HTMLElement
  input.addEventListener('input', () => {
    const val = input.value
    if (!val) {
      indicator.textContent = ''
      indicator.className = 'pin-strength'
      return
    }
    const strength = pinStrength(val)
    indicator.textContent = strength.charAt(0).toUpperCase() + strength.slice(1)
    indicator.className = `pin-strength pin-strength-${strength}`
  })
  return indicator
}

// Format a failed unlock result as a user-facing message.
const unlockErrorMessage = (result: UnlockResult, fallback: string): string => {
  if (result.wiped) {
    return 'All data has been erased after too many failed attempts.'
  }
  if (result.locked && result.retryAfterMs) {
    const seconds = Math.ceil(result.retryAfterMs / 1000)
    const wait =
      seconds < 60 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`
    return `Too many attempts. Try again in ${wait}.`
  }
  return fallback
}

// Rendered when encryption is already enabled.
export const buildEncryptionEnabled = (rerender: () => void): HTMLElement => {
  // Change PIN form.
  const changePinMsg = html`<p
    class="pin-message"
    aria-live="assertive"
  ></p>` as HTMLElement
  const currentPinInput = html`<input
    autocomplete="off"
    id="current-pin"
    type="password"
  />` as HTMLInputElement
  const newPinInput = html`<input
    autocomplete="off"
    id="new-pin"
    type="password"
  />` as HTMLInputElement
  const confirmNewPinInput = html`<input
    autocomplete="off"
    id="confirm-new-pin"
    type="password"
  />` as HTMLInputElement

  const onChangePin = async (e: Event): Promise<void> => {
    e.preventDefault()
    changePinMsg.classList.remove('pin-message-success')
    const currentPin = currentPinInput.value
    const newPin = newPinInput.value
    const confirmNew = confirmNewPinInput.value
    if (!currentPin) {
      changePinMsg.textContent = 'Enter your current PIN.'
      return
    }
    const result = await unlock(currentPin)
    if (!result.success) {
      changePinMsg.textContent = unlockErrorMessage(
        result,
        'Current PIN is incorrect.',
      )
      return
    }
    if (!newPin || newPin.length < MIN_PIN_LENGTH) {
      changePinMsg.textContent = `New PIN must be at least ${MIN_PIN_LENGTH} characters.`
      return
    }
    if (newPin !== confirmNew) {
      changePinMsg.textContent = 'New PINs do not match.'
      return
    }
    try {
      await changeEncryptionPin(newPin)
      changePinMsg.textContent = 'PIN changed successfully.'
      changePinMsg.classList.add('pin-message-success')
      currentPinInput.value = ''
      newPinInput.value = ''
      confirmNewPinInput.value = ''
    } catch {
      /* v8 ignore start */
      changePinMsg.textContent = 'Failed to change PIN. Please try again.'
      /* v8 ignore stop */
    }
  }

  // Disable encryption form.
  const disableMsg = html`<p
    class="pin-message"
    aria-live="assertive"
  ></p>` as HTMLElement
  const disablePinInput = html`<input
    autocomplete="off"
    id="disable-pin"
    type="password"
  />` as HTMLInputElement

  const onDisable = async (e: Event): Promise<void> => {
    e.preventDefault()
    const pin = disablePinInput.value
    if (!pin) {
      disableMsg.textContent = 'Enter your PIN to disable encryption.'
      return
    }
    const result = await unlock(pin)
    if (!result.success) {
      disableMsg.textContent = unlockErrorMessage(result, 'PIN is incorrect.')
      return
    }
    try {
      await disableEncryption()
      disableMsg.textContent = ''
      rerender()
    } catch {
      /* v8 ignore start */
      disableMsg.textContent = 'Failed to disable encryption. Please try again.'
      /* v8 ignore stop */
    }
  }

  return html`
    <div class="settings-group">
      <h3>PIN protection</h3>
      <p>Encryption is enabled for this device.</p>
      <p class="warning">
        If you forget your PIN, your data cannot be recovered.
      </p>
      <h4>Change PIN</h4>
      <form class="pin-form" onsubmit=${onChangePin}>
        ${fieldGroup('Current PIN', currentPinInput)}
        ${fieldGroup('New PIN', newPinInput)}
        ${bindStrengthIndicator(newPinInput)}
        ${fieldGroup('Confirm new PIN', confirmNewPinInput)}
        <button class="btn" type="submit">Change PIN</button>
        ${changePinMsg}
      </form>
      <h4>Disable encryption</h4>
      <p>
        Disabling encryption will decrypt all entries and store them as
        plaintext.
      </p>
      <form class="pin-form" onsubmit=${onDisable}>
        ${fieldGroup('PIN', disablePinInput)}
        <button class="btn btn-danger" type="submit">Disable encryption</button>
        ${disableMsg}
      </form>
    </div>
  ` as HTMLElement
}

// Rendered when encryption is not yet enabled.
export const buildEncryptionDisabled = (rerender: () => void): HTMLElement => {
  const pinInput = html`
    <input
      autocomplete="off"
      aria-describedby="pin-hint"
      id="pin-input"
      type="password"
    />
  ` as HTMLInputElement
  const confirmInput = html`
    <input autocomplete="off" id="pin-confirm" type="password" />
  ` as HTMLInputElement
  const pinMsg = html`<p
    class="pin-message"
    aria-live="assertive"
  ></p>` as HTMLElement

  const onEnable = async (e: Event): Promise<void> => {
    e.preventDefault()
    const pin = pinInput.value
    const confirmPin = confirmInput.value
    if (!pin || pin.length < MIN_PIN_LENGTH) {
      pinMsg.textContent = `PIN must be at least ${MIN_PIN_LENGTH} characters.`
      return
    }
    if (pin !== confirmPin) {
      pinMsg.textContent = 'PINs do not match.'
      return
    }
    try {
      await enableEncryption(pin)
      await migrateEntriesToEncrypted()
      pinMsg.textContent = 'Encryption enabled.'
      pinMsg.classList.add('pin-message-success')
      rerender()
    } catch {
      /* v8 ignore start */
      pinMsg.textContent = 'Failed to enable encryption. Please try again.'
      /* v8 ignore stop */
    }
  }

  return html`
    <div class="settings-group">
      <h3>PIN protection</h3>
      <p>
        Optionally protect your data with a PIN. Once enabled, your data is
        encrypted on this device.
      </p>
      <p class="pin-hint" id="pin-hint">
        Longer PINs are stronger. Letters and numbers are both fine.
      </p>
      <p class="warning">
        If you forget your PIN, recovery is impossible. Your data will be
        permanently lost. After 15 failed unlock attempts, all data is erased.
      </p>
      <form class="pin-form" onsubmit=${onEnable}>
        ${fieldGroup('PIN', pinInput)} ${bindStrengthIndicator(pinInput)}
        ${fieldGroup('Confirm PIN', confirmInput)}
        <button class="btn" type="submit">Enable encryption</button>
        ${pinMsg}
      </form>
    </div>
  ` as HTMLElement
}
