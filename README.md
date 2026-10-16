# MetricFlow · Instagram Analytics (PWA)

Painel de métricas do Instagram que lê uma planilha Google publicada em CSV.
Funciona como aplicativo instalável (PWA) no **Android** e no **iOS/iPadOS**, com ícone próprio, tela de abertura e funcionamento offline com os últimos dados carregados.

## Rodar localmente

Pré-requisito: Node.js 20+

```bash
npm install
npm run dev        # desenvolvimento (http://localhost:3000)
npm run build      # gera a versão final em /dist
npm run preview    # testa a versão final (http://localhost:4173) — o service worker só roda aqui/produção
```

## Publicar

Publique a pasta `dist/` em qualquer hospedagem estática **com HTTPS** (obrigatório para PWA):
Vercel, Netlify, Firebase Hosting, Cloudflare Pages, GitHub Pages etc.

- Vercel/Netlify: comando de build `npm run build`, pasta de saída `dist`.
- O app foi configurado para rodar na raiz do domínio (`/`).

## Instalar no celular

**Android (Chrome):** abra o site → menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").

**iPhone/iPad (Safari):** abra o site → botão **Compartilhar** → **Adicionar à Tela de Início**.

## O que o PWA inclui

| Item | Onde |
|---|---|
| Manifest (nome, cores, ícones, modo standalone) | gerado pelo `vite-plugin-pwa` em `vite.config.ts` |
| Service worker (app offline + cache da planilha e miniaturas) | gerado no build (`dist/sw.js`) |
| Ícones Android (normal e *maskable*) | `public/icons/` |
| Ícone iOS (`apple-touch-icon`) | `public/apple-touch-icon.png` |
| Telas de abertura do iOS (iPhone SE ao iPhone 16 Pro Max, iPads) | `public/splash/` |
| Favicons | `public/favicon.ico`, `public/favicon.svg` |
| Áreas seguras (notch / Dynamic Island / barra inferior) | `src/index.css` (`.app-shell`) |

O app se atualiza sozinho quando uma nova versão é publicada.

## Dados

A URL da planilha (CSV) e do proxy de imagens ficam em `src/constants.ts`.
O último CSV carregado é guardado no aparelho; sem internet, o painel abre com esses dados.

## Trocar o ícone

O desenho do ícone está em `scripts/generate-icons.mjs` (SVG). Para regerar todos os tamanhos:

```bash
npm i -D playwright-core
npx playwright-core install chromium   # se não tiver Chromium
node scripts/generate-icons.mjs public
```
