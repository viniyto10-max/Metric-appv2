# MetricFlow – Instagram Analytics (PWA)

Dashboard de métricas do Instagram, agora instalável como app no **Android** e **iOS**,
com tela cheia, ícone na tela inicial, funcionamento offline e atualização automática.

## Rodar localmente

```bash
npm install
npm run dev        # desenvolvimento (http://localhost:3000)
npm run build      # gera /dist com service worker + manifest
npm run preview    # serve o build para testar o PWA (http://localhost:4173)
```

> O service worker só é ativado no **build** (`npm run build && npm run preview`).

## Publicar (obrigatório HTTPS)

PWA só instala em HTTPS. Opções gratuitas: **Vercel**, **Netlify**, **Cloudflare Pages**.
Configuração: build `npm run build`, pasta de saída `dist`.

Se publicar em subpasta (ex.: GitHub Pages `usuario.github.io/repo/`), defina `base: '/repo/'`
no `vite.config.ts` e ajuste `start_url`/`scope` do manifest para o mesmo caminho.

## Como instalar

- **Android (Chrome/Edge):** aparece o banner "Instalar MetricFlow" (ou menu ⋮ → *Instalar app*).
- **iPhone/iPad (Safari):** Compartilhar → *Adicionar à Tela de Início*.
  (o iOS não tem prompt automático; o app mostra o passo a passo).

## O que foi adicionado

| Arquivo | Função |
|---|---|
| `vite.config.ts` | `vite-plugin-pwa`: manifest, service worker (Workbox), cache do app e das miniaturas |
| `index.html` | meta tags Android/iOS, `viewport-fit=cover`, ícones |
| `public/icons/*` | ícones 192/512, *maskable* (Android) e `apple-touch-icon` (iOS) |
| `src/index.css` | safe-areas (notch), sem zoom em inputs no iOS, sem highlight de toque |
| `src/hooks/usePWA.ts` | instalação, status online/offline, aviso de nova versão |
| `src/components/PWAPrompts.tsx` | banners de instalação (Android/iOS), offline e atualização |
| `src/components/Splash.tsx` | tela de carregamento / erro com "Tentar novamente" |
| `src/App.tsx` | cache local do CSV (abre instantâneo e offline), layout responsivo |

## Trocar o ícone

Substitua os PNGs em `public/icons/` mantendo nomes e tamanhos
(`icon-192`, `icon-512`, `maskable-192`, `maskable-512`, `apple-touch-icon` 180×180, `favicon-32`).
Os *maskable* devem ter o desenho dentro dos 80% centrais.
