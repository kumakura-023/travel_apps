import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command, mode }) => {
  // GitHub Pages用のベースパス設定
  const isGitHubPages = mode === 'github-pages' || process.env.GITHUB_ACTIONS === 'true';
  const base = isGitHubPages ? '/travel-planner-map/' : '/';
  
  return {
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'VoyageSketch',
        short_name: 'VoyageSketch',
        description: '旅行計画に特化したマップWebアプリ',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          maps: ['@react-google-maps/api', '@googlemaps/markerclusterer'],
          utils: ['zustand', 'uuid']
        }
      }
    }
  }
  };
});