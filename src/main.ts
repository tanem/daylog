// Application entry point.

import type { AttendanceEntry } from './types'
import { isEncryptionEnabled, isUnlocked } from './crypto'
import { renderLogView } from './ui/log-view'
import { renderHistoryView } from './ui/history-view'
import { renderSettingsView } from './ui/settings-view'
import { renderUnlockView } from './ui/unlock-view'
import './style.css'

type View = 'log' | 'history' | 'settings'

const mainContent = document.getElementById('main-content')!
const navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-btn')

let currentView: View = 'log'

// Navigate to a view by name.
const navigateTo = async (
  view: View,
  editEntry?: AttendanceEntry,
): Promise<void> => {
  currentView = view

  // Update nav state.
  navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view)
  })

  // If encryption is enabled but the session is locked, show unlock first.
  const encrypted = await isEncryptionEnabled()
  if (encrypted && !isUnlocked()) {
    renderUnlockView(mainContent, () => navigateTo(view))
    return
  }

  if (view === 'log') {
    await renderLogView(mainContent, () => navigateTo('history'), editEntry)
  } else if (view === 'history') {
    await renderHistoryView(mainContent, (entry) => navigateTo('log', entry))
  } else {
    await renderSettingsView(mainContent, () => navigateTo('log'))
  }
}

// Wire up nav buttons.
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view as View
    navigateTo(view)
  })
})

// Boot.
navigateTo(currentView)
