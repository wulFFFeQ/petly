import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

/** Avoid sticky browser cache for curated breed JPGs during local breed curation. */
function breedsNoCachePlugin(): Plugin {
  return {
    name: 'breeds-no-cache',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/breeds/')) {
          res.setHeader('Cache-Control', 'no-store, max-age=0')
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/petly/' : '/',
  plugins: [react(), tailwindcss(), breedsNoCachePlugin()],
})
