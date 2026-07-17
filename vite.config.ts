import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, join } from 'path'
import { createReadStream, existsSync } from 'fs'
import { scanDropins, dropinsDir } from './server/scan.mjs'
import { scanMedia } from './server/media.mjs'

// Dev-only parity with server/index.mjs: expose the same drop-in + media
// endpoints so `npm run dev` behaves like the production kiosk (drop a file,
// refresh, appears). Vite's built-in publicDir handler serves the media files
// themselves (with Range), so only the listing endpoints are needed here.
function dropinsDevPlugin(): Plugin {
  return {
    name: 'sigil-dropins-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/games', async (_req, res) => {
        const games = await scanDropins()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(games))
      })
      server.middlewares.use('/api/media/videos', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(await scanMedia('videos')))
      })
      server.middlewares.use('/api/media/images', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(await scanMedia('images')))
      })
      server.middlewares.use('/dropins', (req, res, next) => {
        const rel = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '')
        if (!rel || rel.includes('..') || !/\.html?$/i.test(rel)) return next()
        const file = join(dropinsDir(), rel)
        if (!existsSync(file)) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        createReadStream(file).pipe(res)
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), dropinsDevPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'sigil': [
            './src/components/sigil/SigilGame.vue',
            './src/stores/sigil.ts'
          ],
          'junk-mage': [
            './src/components/junk-mage/JunkMageGame.vue',
            './src/stores/junk-mage.ts'
          ],
          'null-arcana': [
            './src/components/null-arcana/NullArcanaGame.vue',
            './src/stores/null-arcana.ts'
          ]
        }
      }
    }
  }
})
