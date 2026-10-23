import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { terrainTiles } from './terrainTiles.mjs';

export default defineConfig({
  base: '/ascent/',
  plugins: [
    terrainTiles(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ascent Flight',
        short_name: 'Flight',
        description: 'A space flight game.',
        theme_color: '#070a1f',
        background_color: '#070a1f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/ascent/', scope: '/ascent/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'] }, // webp: the race art in public/races
    }),
  ],
});
