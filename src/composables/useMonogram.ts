// Glyph shown inside a menu node. An explicit `icon` wins; otherwise a 1–2 char
// monogram derived from the app name so nodes read at a glance.

export function monogram(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  const w = words[0] ?? ''
  // Fall back to '?' for empty / symbol-only names so a node never shows blank.
  return w.slice(0, 2).toUpperCase() || '?'
}

export function nodeGlyph(g: { name: string; icon?: string }): string {
  return g.icon?.trim() || monogram(g.name)
}
