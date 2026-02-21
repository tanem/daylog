import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Base path for GitHub Pages. Set to '/' if using a custom domain.
const base = process.env.GITHUB_ACTIONS ? '/daylog/' : '/'

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Daylog',
        short_name: 'Daylog',
        description:
          'Track your hybrid work attendance. All data stays on your device.',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
