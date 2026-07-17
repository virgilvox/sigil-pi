// ═══════════════════════════════════════════════════════════════════
// DROP-IN GAME SCANNER  (shared by server/index.mjs and the Vite dev plugin)
//
// Scans a folder of single-file HTML games and turns each into a catalog entry.
// Metadata is optional: a game is just an .html file. Authors can override the
// derived defaults with tags anywhere in the <head>:
//
//   <title>My Game</title>
//   <meta name="sigil:name" content="MY GAME">
//   <meta name="sigil:color" content="#ff00aa">
//   <meta name="sigil:description" content="ARCADE">
//   <meta name="sigil:order" content="120">
//
// No rebuild required — drop a file in the folder and refresh the kiosk.
// ═══════════════════════════════════════════════════════════════════

import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const REPO_DROPINS = join(dirname(fileURLToPath(import.meta.url)), '..', 'dropins')

/**
 * Resolve the drop-in directory, in priority order:
 *   1. $SIGIL_DROPINS   (set explicitly on the Pi by setup.sh → ~/sigil-games)
 *   2. repo-local ./dropins  (present in a checkout → dev works with no config)
 *   3. ~/sigil-games    (final default)
 */
export function dropinsDir() {
  if (process.env.SIGIL_DROPINS) return process.env.SIGIL_DROPINS
  if (existsSync(REPO_DROPINS)) return REPO_DROPINS
  return join(homedir(), 'sigil-games')
}

/** Palette used to give un-tagged drop-ins a stable, distinct accent color. */
const FALLBACK_COLORS = [
  '#e85a3c', '#4a9fff', '#00ff88', '#ff00ff', '#ffa500',
  '#ffcc00', '#00ffc8', '#ffd700', '#b47cff', '#ff5c8a'
]

/** Deterministic color pick from an id so a game keeps its color across scans. */
function colorFor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length]
}

function metaTag(html, name) {
  // Tolerant of attribute order and single/double quotes.
  const re = new RegExp(
    `<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'
  )
  const alt = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'
  )
  const m = html.match(re) || html.match(alt)
  return m ? m[1].trim() : ''
}

function titleFrom(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i)
  return m ? m[1].trim() : ''
}

/** Turn "junk-mage-circular (4).html" into a clean id + display name. */
function deriveNames(filename) {
  const stem = basename(filename, extname(filename))
    .replace(/\s*\(\d+\)\s*$/, '') // strip "(4)" copy suffixes
    .trim()
  const id = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const name = stem.replace(/[-_]+/g, ' ').trim().toUpperCase()
  return { id: id || 'game', name: name || 'GAME' }
}

/**
 * Scan the drop-in directory and return an array of DropinManifestEntry.
 * Never throws — a missing/unreadable folder yields an empty list.
 */
export async function scanDropins(dir = dropinsDir()) {
  if (!existsSync(dir)) return []
  let files
  try {
    files = await readdir(dir)
  } catch {
    return []
  }

  const entries = []
  const seen = new Set()
  for (const file of files.sort()) {
    if (!/\.html?$/i.test(file)) continue
    if (file.startsWith('.')) continue

    const { id: baseId, name: baseName } = deriveNames(file)
    let html = ''
    try {
      html = await readFile(join(dir, file), 'utf8')
    } catch {
      // Unreadable file — skip it rather than failing the whole scan.
      continue
    }

    let id = metaTag(html, 'sigil:id') || baseId
    if (seen.has(id)) id = `${id}-${seen.size}`
    seen.add(id)

    const orderRaw = metaTag(html, 'sigil:order')
    entries.push({
      id,
      name: (metaTag(html, 'sigil:name') || titleFrom(html) || baseName).toUpperCase(),
      file,
      color: metaTag(html, 'sigil:color') || colorFor(id),
      description: (metaTag(html, 'sigil:description') || 'DROP-IN').toUpperCase(),
      order: orderRaw ? Number(orderRaw) : 1000,
      icon: metaTag(html, 'sigil:icon') || undefined
    })
  }
  return entries
}
