import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync('package.json', 'utf-8')) as {
  version: string
}

// Inject the CSP meta tag only in production builds. Vite's dev server uses
// inline styles (HMR) and blob workers (live-reload) that a strict CSP blocks.
const cspPlugin = (): Plugin => ({
  name: 'inject-csp',
  transformIndexHtml: {
    order: 'pre',
    handler: (html, ctx) => {
      if (ctx.server) return html
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "img-src 'self' blob:",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "worker-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
      return html.replace(
        '<!--csp-meta-->',
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      )
    },
  },
})

// Base path for GitHub Pages. Only applied during builds so the dev server
// (used by Playwright in CI) always serves source files at '/src/...'.
export default defineConfig(({ command }) => {
  const base =
    command === 'build' && process.env.GITHUB_ACTIONS ? '/daylog/' : '/'

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [
      cspPlugin(),
      VitePWA({
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          background_color: '#1a1a2e',
          description:
            'Track your hybrid work attendance. All data stays on your device.',
          display: 'standalone',
          icons: [
            {
              sizes: '192x192',
              src: 'pwa-192x192.png',
              type: 'image/png',
            },
            {
              sizes: '512x512',
              src: 'pwa-512x512.png',
              type: 'image/png',
            },
            {
              purpose: 'any maskable',
              sizes: '512x512',
              src: 'pwa-512x512.png',
              type: 'image/png',
            },
          ],
          name: 'Daylog',
          scope: base,
          short_name: 'Daylog',
          start_url: base,
          theme_color: '#1a1a2e',
        },
        registerType: 'autoUpdate',
      }),
    ],
  }
})
