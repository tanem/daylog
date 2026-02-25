// Application entry point.

import type { AttendanceEntry } from './types'
import { isEncryptionEnabled, isUnlocked } from './crypto'
import { startAutoLock, resetAutoLock } from './auto-lock'
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
    const isActive = btn.dataset.view === view
    btn.classList.toggle('active', isActive)
    if (isActive) {
      btn.setAttribute('aria-current', 'page')
    } else {
      btn.removeAttribute('aria-current')
    }
  })

  // If encryption is enabled but the session is locked, show unlock first.
  const encrypted = await isEncryptionEnabled()
  if (encrypted && !isUnlocked()) {
    renderUnlockView(mainContent, () => {
      resetAutoLock()
      navigateTo(view)
    })
    focusHeading()
    return
  }

  // Reset the auto-lock timer on each navigation.
  if (encrypted) resetAutoLock()

  if (view === 'log') {
    await renderLogView(mainContent, () => navigateTo('history'), editEntry)
  } else if (view === 'history') {
    await renderHistoryView(mainContent, (entry) => navigateTo('log', entry))
  } else {
    await renderSettingsView(mainContent, () => navigateTo('log'))
  }

  focusHeading()
}

// Move focus to the view heading so screen readers announce the new view.
const focusHeading = (): void => {
  const h = mainContent.querySelector('h2')
  /* v8 ignore start */
  if (!h) return
  /* v8 ignore stop */
  h.setAttribute('tabindex', '-1')
  h.focus()
}

// Wire up nav buttons.
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view as View
    navigateTo(view)
  })
})

// Boot.
startAutoLock(() => navigateTo(currentView))
navigateTo(currentView)
