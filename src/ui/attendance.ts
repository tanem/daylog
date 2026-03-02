// Attendance tracking section of the settings view.

import { loadAttendanceSettings, saveAttendanceSettings } from '../settings'
import { fieldGroup } from './fields'
import { html } from './html'

export const buildAttendanceSection = async (): Promise<HTMLElement> => {
  const attSettings = await loadAttendanceSettings()

  const attToggle = html`
    <input
      id="attendance-enabled"
      type="checkbox"
      checked=${attSettings.enabled}
    />
  ` as HTMLInputElement

  const pctInput = html`
    <input
      id="attendance-percentage"
      max="100"
      min="1"
      type="number"
      value=${String(attSettings.percentage)}
    />
  ` as HTMLInputElement

  const weeksInput = html`
    <input
      id="attendance-weeks"
      max="52"
      min="1"
      type="number"
      value=${String(attSettings.weeks)}
    />
  ` as HTMLInputElement

  const attFields = html`
    <div class="attendance-fields">
      ${fieldGroup('Target %', pctInput)}
      ${fieldGroup('Rolling window (weeks)', weeksInput)}
    </div>
  ` as HTMLElement
  attFields.style.display = attSettings.enabled ? '' : 'none'

  const saveSettings = async (): Promise<void> => {
    const rawPct = parseInt(pctInput.value, 10)
    const rawWeeks = parseInt(weeksInput.value, 10)
    await saveAttendanceSettings({
      enabled: attToggle.checked,
      weeks: Math.max(1, Math.min(52, Number.isNaN(rawWeeks) ? 8 : rawWeeks)),
      percentage: Math.max(
        1,
        Math.min(100, Number.isNaN(rawPct) ? 60 : rawPct),
      ),
    })
  }

  attToggle.addEventListener('change', async () => {
    attFields.style.display = attToggle.checked ? '' : 'none'
    await saveSettings()
  })
  pctInput.addEventListener('change', saveSettings)
  weeksInput.addEventListener('change', saveSettings)

  return html`
    <div class="settings-group">
      <h3>Attendance tracking</h3>
      <p>Track your rolling office attendance percentage on the log screen.</p>
      <div class="toggle-row">
        ${attToggle}
        <label for="attendance-enabled">Enable attendance tracking</label>
      </div>
      ${attFields}
    </div>
  ` as HTMLElement
}
