import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Vite production configuration for https://mela.pro.et
 *
 * SPA routing on direct refresh:
 *   - Workbox navigateFallback handles offline/PWA navigation.
 *   - Deploy-target fallback files are in public/:
 *       _redirects  → Netlify / Cloudflare Pages
 *       404.html    → GitHub Pages (copies index.html)
 *     For other hosts (VPS / Nginx) add: try_files $uri /index.html
 */
export default defineConfig({
  build: { sourcemap: false },
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
        'favicon/web-app-manifest-512x512.png',
        'fonts/Outfit/*.ttf',
      ],
      manifest: {
        name: 'MELA — Business Management',
        short_name: 'MELA',
        description: 'Ethiopian-first small business management. Sales, inventory, expenses and insights in one place.',
        theme_color: '#123D35',
        background_color: '#F7F7F2',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        icons: [
          { src: 'favicon/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache all build assets including Outfit TTF fonts served from /fonts/
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
        // SPA fallback: serve index.html for any navigation request that isn't
        // a static asset so that React Router handles the route on the client.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          // Don't intercept API calls or Supabase auth redirects
          /^\/auth\/v1\//,
          /^\/rest\/v1\//,
        ],
        runtimeCaching: [
          {
            // Cache the Outfit font files served from /fonts/ with a
            // stale-while-revalidate strategy so the PWA works offline.
            urlPattern: /\/fonts\/Outfit\/.*\.ttf$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'outfit-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
