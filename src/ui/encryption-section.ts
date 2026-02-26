// Encryption section of the settings view: enable, disable, and change PIN.

import {
  migrateEntriesToEncrypted,
  changeEncryptionPin,
  disableEncryption,
} from '../encryption'
import { enableEncryption, unlock } from '../crypto'
import { fieldGroup } from './field-group'
import { html } from './html'

export const MIN_PIN_LENGTH = 6

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
    const valid = await unlock(currentPin)
    if (!valid) {
      changePinMsg.textContent = 'Current PIN is incorrect.'
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
    const valid = await unlock(pin)
    if (!valid) {
      disableMsg.textContent = 'PIN is incorrect.'
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
        permanently lost.
      </p>
      <form class="pin-form" onsubmit=${onEnable}>
        ${fieldGroup('PIN', pinInput)}
        ${fieldGroup('Confirm PIN', confirmInput)}
        <button class="btn" type="submit">Enable encryption</button>
        ${pinMsg}
      </form>
    </div>
  ` as HTMLElement
}
