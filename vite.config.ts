import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // 'prompt': o usuário decide quando aplicar a atualização (toast no app)
        registerType: 'prompt',
        includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'MetricFlow – Instagram Analytics',
          short_name: 'MetricFlow',
          description: 'Dashboard profissional de métricas do Instagram.',
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'any',
          background_color: '#0A0A0A',
          theme_color: '#0A0A0A',
          categories: ['business', 'productivity', 'social'],
          icons: [
            {src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
            {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
            {src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable'},
            {src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
          ],
        },
        workbox: {
          // App shell 100% offline
          globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [
            {
              // Miniaturas dos reels (proxy do Apps Script): abre rápido e funciona offline
              urlPattern: ({url}: {url: URL}) => url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'reel-thumbs',
                expiration: {maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 3},
                cacheableResponse: {statuses: [200]},
              },
            },
          ],
        },
        devOptions: {enabled: false},
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
