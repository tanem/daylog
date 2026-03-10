// Theme application: reads preference, applies to DOM, listens for OS changes.

import type { ThemePreference } from './types'
import { loadThemePreference, saveThemePreference } from './settings'

const THEME_META_COLORS: Record<'light' | 'dark', string> = {
  light: '#f4f5f7',
  dark: '#1a1a2e',
}

const CYCLE_ORDER: ThemePreference[] = ['auto', 'light', 'dark']

const LABELS: Record<ThemePreference, string> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark',
}

let current: ThemePreference = 'auto'
let toggleButton: HTMLButtonElement | null = null

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

// Resolve the effective theme (light or dark) from the current preference.
const resolvedTheme = (): 'light' | 'dark' => {
  if (current === 'auto') return mediaQuery.matches ? 'dark' : 'light'
  return current
}

const applyTheme = (): void => {
  document.documentElement.dataset.theme = current
  const resolved = resolvedTheme()
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_META_COLORS[resolved])
}

// Build an SVG element using the SVG namespace.
const SVG_NS = 'http://www.w3.org/2000/svg'

const svgEl = (
  tag: string,
  attrs: Record<string, string>,
  ...children: SVGElement[]
): SVGElement => {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  for (const child of children) el.appendChild(child)
  return el
}

// Sun icon: circle with rays.
const sunIcon = (): SVGElement =>
  svgEl(
    'svg',
    {
      width: '18',
      height: '18',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    svgEl('circle', { cx: '12', cy: '12', r: '5' }),
    svgEl('line', { x1: '12', y1: '1', x2: '12', y2: '3' }),
    svgEl('line', { x1: '12', y1: '21', x2: '12', y2: '23' }),
    svgEl('line', { x1: '4.22', y1: '4.22', x2: '5.64', y2: '5.64' }),
    svgEl('line', { x1: '18.36', y1: '18.36', x2: '19.78', y2: '19.78' }),
    svgEl('line', { x1: '1', y1: '12', x2: '3', y2: '12' }),
    svgEl('line', { x1: '21', y1: '12', x2: '23', y2: '12' }),
    svgEl('line', { x1: '4.22', y1: '19.78', x2: '5.64', y2: '18.36' }),
    svgEl('line', { x1: '18.36', y1: '5.64', x2: '19.78', y2: '4.22' }),
  )

// Moon icon: crescent shape.
const moonIcon = (): SVGElement =>
  svgEl(
    'svg',
    {
      width: '18',
      height: '18',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    svgEl('path', {
      d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
    }),
  )

// Auto icon: half-circle (split sun/moon).
const autoIcon = (): SVGElement =>
  svgEl(
    'svg',
    {
      width: '18',
      height: '18',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    },
    svgEl('circle', { cx: '12', cy: '12', r: '9' }),
    svgEl('path', {
      d: 'M12 3a9 9 0 0 1 0 18',
      fill: 'currentColor',
    }),
  )

const ICONS: Record<ThemePreference, () => SVGElement> = {
  auto: autoIcon,
  light: sunIcon,
  dark: moonIcon,
}

const updateButtonLabel = (): void => {
  if (!toggleButton) return
  toggleButton.replaceChildren(ICONS[current]())
  toggleButton.setAttribute(
    'aria-label',
    `Theme: ${LABELS[current]}. Click to change.`,
  )
}

// Cycle through auto → light → dark → auto.
const cycleTheme = async (): Promise<void> => {
  const idx = CYCLE_ORDER.indexOf(current)
  current = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length]
  applyTheme()
  updateButtonLabel()
  await saveThemePreference(current)
}

// Initialise the theme toggle button in the header.
export const initThemeToggle = (button: HTMLButtonElement): void => {
  toggleButton = button
  updateButtonLabel()
  button.addEventListener('click', () => {
    cycleTheme()
  })
}

// Load saved preference and apply. Call before first render.
export const initTheme = async (): Promise<void> => {
  current = await loadThemePreference()
  applyTheme()

  mediaQuery.addEventListener('change', () => {
    if (current === 'auto') applyTheme()
  })
}
