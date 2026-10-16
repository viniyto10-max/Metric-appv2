import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const THEME = '#0A0A0A';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          id: '/',
          name: 'MetricFlow · Instagram Analytics',
          short_name: 'MetricFlow',
          description: 'Painel profissional de análise de métricas do Instagram.',
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'any',
          background_color: THEME,
          theme_color: THEME,
          categories: ['business', 'productivity', 'social'],
          icons: [
            { src: '/icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell offline (JS/CSS/HTML/ícones). Splash screens do iOS ficam fora do precache (são grandes e o iOS só as lê na instalação).
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          globIgnores: ['splash/**', 'icons/icon-source.svg'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Planilha publicada (CSV): sempre tenta a rede, usa o cache se estiver offline/lento
              urlPattern: ({ url }) =>
                url.hostname === 'docs.google.com' ||
                (url.hostname.endsWith('.googleusercontent.com') && url.hostname !== 'script.googleusercontent.com'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'sheet-data',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Proxy das miniaturas dos reels (Apps Script)
              urlPattern: ({ url }) =>
                url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'reel-thumbs',
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 7, purgeOnQuotaError: true },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
