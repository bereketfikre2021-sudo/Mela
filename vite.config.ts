import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PWA manifest + Workbox service worker foundation.
// Fonts are self-hosted (via @fontsource) so they cache for offline use.
// PWA/install icons live under public/favicon/.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'Logo.svg',
        'favicon/favicon.svg',
        'favicon/favicon.ico',
        'favicon/apple-touch-icon.png',
        'favicon/favicon-96x96.png',
        'favicon/web-app-manifest-192x192.png',
        'favicon/web-app-manifest-512x512.png'
      ],
      manifest: {
        name: 'MELA',
        short_name: 'MELA',
        description: 'Ethiopian-first small business management',
        theme_color: '#123D35',
        background_color: '#F7F7F2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        icons: [
          { src: 'favicon/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      }
    })
  ]
})
