import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // SW gestionado por el plugin, con actualización automática
      registerType: 'autoUpdate',
      // Solo una fuente de truth para el manifest (NO usar public/manifest.json)
      includeAssets: [
        'icons/favicon.ico',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png'
      ],
      manifest: {
        name: 'Lucía Proyectos',
        short_name: 'LProyectos',
        description: 'Gestión de proyectos con calendario y PWA',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#111111',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Asegura cacheo de assets generados por Vite
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
        // Nota: no es necesario navigateFallback si añades public/_redirects en Netlify
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
