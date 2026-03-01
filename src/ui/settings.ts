// Settings view: composes section modules into the settings page.

import { isEncryptionEnabled } from '../crypto'
import { buildExportSection } from './export'
import { buildAttendanceSection } from './attendance'
import { buildEncryptionEnabled, buildEncryptionDisabled } from './encryption'
import { buildDangerSection } from './danger'
import { html } from './html'

export const renderSettingsView = async (
  container: HTMLElement,
  onDataWiped: () => void,
): Promise<void> => {
  const encEnabled = await isEncryptionEnabled()

  const rerender = (): void => {
    renderSettingsView(container, onDataWiped)
  }

  const encSection = encEnabled
    ? buildEncryptionEnabled(rerender)
    : buildEncryptionDisabled(rerender)

  container.replaceChildren(
    html`<h2>Settings</h2>` as HTMLElement,
    buildExportSection(encEnabled),
    await buildAttendanceSection(),
    encSection,
    buildDangerSection(onDataWiped),
    html`<p class="settings-version">v${__APP_VERSION__}</p>` as HTMLElement,
  )
}
