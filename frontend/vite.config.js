import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ── Plausible analytics injection plugin ────────────────────────────────────────
// Inserts the <script> tag only when VITE_PLAUSIBLE_DOMAIN is set at build time.
function plausiblePlugin(domain) {
  if (!domain) return null;
  const tag = `<script defer data-domain="${domain}" src="https://plausible.io/js/script.js"></script>`;
  return {
    name: 'vite-plugin-plausible',
    transformIndexHtml(html) {
      return html.replace('</head>', `  ${tag}\n  </head>`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [
    plausiblePlugin(env.VITE_PLAUSIBLE_DOMAIN),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker runs in injectManifest mode so we control caching
      strategies: 'generateSW',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Case Breaker',
        short_name: 'Case Breaker',
        description: 'Master German grammatical cases with fast-paced drills.',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'de',
        categories: ['education', 'games'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Play Now',
            short_name: 'Play',
            url: '/',
            description: 'Jump into a German case drill',
          },
          {
            name: 'Shop Resources',
            short_name: 'Shop',
            url: '/shop',
            description: 'Browse grammar resources',
          },
        ],
      },
      workbox: {
        // Cache the app shell + game assets for offline play
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // API: network-first, fallback to cache for products
            urlPattern: ({ url }) => url.pathname.startsWith('/products'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-products-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 24h
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  }
})
