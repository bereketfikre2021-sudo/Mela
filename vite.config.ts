import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    sourcemap: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'Logo.svg',
        'og-image.jpg',
        'robots.txt',
        'favicon/favicon.svg',
        'favicon/favicon.ico',
        'favicon/apple-touch-icon.png',
        'favicon/favicon-96x96.png',
        'favicon/web-app-manifest-192x192.png',
        'favicon/web-app-manifest-512x512.png',
        'fonts/Outfit/*.ttf',
      ],
      manifest: {
        name: 'MELA — Business Management',
        short_name: 'MELA',
        description: 'Ethiopian-first small business management. Sales, inventory, expenses and insights.',
        theme_color: '#123D35',
        background_color: '#F7F7F2',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          {
            src: 'favicon/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'favicon/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'favicon/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: 'og-image.jpg',
            sizes: '1200x630',
            type: 'image/jpeg',
            form_factor: 'wide',
            label: 'MELA dashboard',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,jpg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/auth\/v1\//,
          /^\/rest\/v1\//,
          /^\/admin\//,
        ],
        runtimeCaching: [
          {
            urlPattern: /\/fonts\/Outfit\/.*\.ttf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'outfit-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/favicon\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'favicons',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
})
