// ═══════════════════════════════════════════════════════════════════
// SIGIL PI RUNTIME SERVER  (zero dependencies — Node built-ins only)
//
// Serves the built SPA and exposes drop-in games so new HTML apps register
// without a rebuild. Run under systemd with Restart=always for crash recovery.
//
//   node server/index.mjs           # serves ./dist on 127.0.0.1:8080
//   PORT=9000 node server/index.mjs
//   SIGIL_DROPINS=/home/pi/sigil-games node server/index.mjs
//
// Routes:
//   GET /api/games      → JSON array of drop-in games (fresh scan each call)
//   GET /dropins/<file> → raw drop-in HTML (loaded in a sandboxed iframe)
//   GET /*              → static file from dist, SPA fallback to index.html
// ═══════════════════════════════════════════════════════════════════

import { createServer } from 'node:http'
import { stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { scanDropins, dropinsDir } from './scan.mjs'
import { scanMedia, mediaBase } from './media.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = process.env.SIGIL_DIST || join(ROOT, 'dist')
const PORT = Number(process.env.PORT) || 8080
const HOST = process.env.HOST || '127.0.0.1'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska'
}

function mimeFor(path) {
  return MIME[extname(path).toLowerCase()] || 'application/octet-stream'
}

/** Resolve a URL path to a file inside `base`, blocking path traversal. */
async function resolveInside(base, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '')
  const full = join(base, clean)
  if (!full.startsWith(base)) return null
  try {
    const s = await stat(full)
    if (s.isDirectory()) return null
    return full
  } catch {
    return null
  }
}

// Stream a file, honoring HTTP Range so large videos seek/stream instead of
// buffering whole (and so Chromium's <video> is happy — it demands 206s).
async function sendFile(req, res, path, status = 200) {
  const info = await stat(path)
  const type = mimeFor(path)
  const cache = path.includes(`${'/'}assets/`) ? 'public, max-age=31536000, immutable' : 'no-cache'
  const range = req.headers.range
  if (range && /^bytes=/.test(range)) {
    const m = /bytes=(\d*)-(\d*)/.exec(range) || []
    let start = m[1] ? parseInt(m[1], 10) : 0
    let end = m[2] ? parseInt(m[2], 10) : info.size - 1
    if (isNaN(start) || start < 0) start = 0
    if (isNaN(end) || end >= info.size) end = info.size - 1
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` })
      return res.end()
    }
    res.writeHead(206, {
      'Content-Type': type,
      'Content-Range': `bytes ${start}-${end}/${info.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Cache-Control': cache
    })
    return createReadStream(path, { start, end }).pipe(res)
  }
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': info.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': cache
  })
  createReadStream(path).pipe(res)
}

function sendJson(res, obj, status = 200) {
  const body = JSON.stringify(obj)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' })
  res.end(body)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const path = url.pathname

    // Drop-in catalog — fresh scan so newly dropped files show on refresh.
    if (path === '/api/games') {
      const games = await scanDropins()
      return sendJson(res, games)
    }

    // Media catalog for the VIDEOS / IMAGES apps — fresh scan of public/<kind>.
    if (path === '/api/media/videos' || path === '/api/media/images') {
      const items = await scanMedia(path.slice('/api/media/'.length))
      return sendJson(res, items)
    }

    // Raw drop-in HTML, served from the drop-in folder (not dist).
    if (path.startsWith('/dropins/')) {
      const file = await resolveInside(dropinsDir(), path.slice('/dropins/'.length))
      if (!file) return sendJson(res, { error: 'not found' }, 404)
      return sendFile(req, res, file)
    }

    // Media files, served (with Range) from public/videos & public/images — the
    // source of truth — so newly dropped media plays without a rebuild. Note the
    // trailing slash: bare /videos and /images fall through to the SPA routes.
    const media = /^\/(videos|images)\/(.+)$/.exec(path)
    if (media) {
      const file = await resolveInside(join(mediaBase(), media[1]), media[2])
      if (!file) return sendJson(res, { error: 'not found' }, 404)
      return sendFile(req, res, file)
    }

    // Static assets from dist.
    const asset = await resolveInside(DIST, path === '/' ? '/index.html' : path)
    if (asset) return sendFile(req, res, asset)

    // SPA fallback: anything else renders the Vue app (client-side routing).
    const indexHtml = join(DIST, 'index.html')
    return sendFile(req, res, indexHtml)
  } catch (err) {
    console.error('[sigil-server]', err)
    if (!res.headersSent) res.writeHead(500)
    res.end('Internal Server Error')
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[sigil-server] serving ${DIST}`)
  console.log(`[sigil-server] drop-ins from ${dropinsDir()}`)
  console.log(`[sigil-server] http://${HOST}:${PORT}`)
})
