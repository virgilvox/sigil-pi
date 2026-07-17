// ═══════════════════════════════════════════════════════════════════
// Media scanning for the VIDEOS / IMAGES apps. Scans (and the server serves)
// straight from public/videos and public/images — the source of truth — so
// dropping a file in and refreshing makes it appear with no rebuild. Media is
// gitignored (it's device-local content, often large), so a fresh checkout
// starts empty and the owner fills these folders.
// ═══════════════════════════════════════════════════════════════════
import { readdir } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Base dir holding the `videos/` and `images/` folders. Overridable so the Pi
 *  can point at an external drive of media without touching the checkout. */
export function mediaBase() {
  return process.env.SIGIL_MEDIA || join(ROOT, 'public')
}

const EXTS = {
  videos: new Set(['.mp4', '.webm', '.ogv', '.ogg', '.m4v', '.mov', '.mkv']),
  images: new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.svg'])
}

export function isMediaKind(kind) {
  return kind === 'videos' || kind === 'images'
}

/**
 * Scan public/<kind> for playable/viewable files, newest-friendly natural sort.
 * Case-insensitive extension match (handles .MP4/.MOV), skips dotfiles/.DS_Store.
 * Returns [{ name, url, ext }] — url is what a <video>/<img> src points at.
 */
export async function scanMedia(kind) {
  if (!isMediaKind(kind)) return []
  const dir = join(mediaBase(), kind)
  const exts = EXTS[kind]
  let files
  try {
    files = await readdir(dir)
  } catch {
    return [] // folder missing → empty gallery, not an error
  }
  return files
    .filter(f => !f.startsWith('.') && exts.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map(name => ({ name, url: `/${kind}/${encodeURIComponent(name)}`, ext: extname(name).slice(1).toLowerCase() }))
}
