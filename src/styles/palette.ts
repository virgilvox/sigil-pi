// ═══════════════════════════════════════════════════════════════════
// SIGIL PI — shared color system
//
// One vivid, coherent palette for the whole hub. Canvas games read the JS
// helpers here; DOM surfaces read the matching CSS custom properties in
// styles/main.css (kept in sync by hand). The guiding idea: lift the app off
// near-black onto a deep indigo substrate, then let saturated hues carry
// meaning — pitch-class → hue, engine → hue, param-group → hue.
// ═══════════════════════════════════════════════════════════════════

// --- deep substrate (less dark than the old #06060a, with real hue) ---
export const BG = {
  void: '#0a0812',      // deepest — page + viewport base
  deep: '#0f0b1c',      // radial-gradient inner
  panel: '#161228',     // raised panels / hubs
  panelHi: '#1e1836',   // hover / active panels
  seam: 'rgba(190,178,235,0.16)', // hairline borders (violet-tinted)
  ink: '#0a0812'
} as const

// --- neutral text (warm bone, unchanged identity) ---
export const INK = {
  bright: '#f4f1ea',
  primary: '#d8d3e4',   // faint violet lift vs the old flat tan
  dim: 'rgba(216,211,228,0.5)',
  faint: 'rgba(216,211,228,0.3)'
} as const

/**
 * Radial background for a circular canvas stage — a subtly hued vignette so the
 * disc reads as lit glass, not a black hole. Pass an optional accent hue to
 * tint the wash toward the active engine/instrument.
 */
export function stageGradient(
  ctx: CanvasRenderingContext2D, cx = 360, cy = 360, r = 360, accent?: string
): CanvasGradient {
  const g = ctx.createRadialGradient(cx, cy - 30, 30, cx, cy, r)
  // mostly deep substrate with a faint wash of the engine/family accent
  g.addColorStop(0, accent ? mix(BG.deep, accent, 0.16) : BG.deep)
  g.addColorStop(0.5, BG.void)
  g.addColorStop(1, '#050409')
  return g
}

// ── pitch-class → hue ────────────────────────────────────────────────
// Same note is always the same color across every synth surface. Spread the
// 12 classes around the wheel by the circle of fifths so scale neighbours get
// perceptually distinct hues (not near-identical chromatic steps).
const COF_HUE = [0, 210, 60, 270, 120, 330, 180, 30, 240, 90, 300, 150]

export function pcHue(midi: number): number {
  return COF_HUE[((midi % 12) + 12) % 12]
}

/**
 * Color for a playable note. Octave lifts lightness a touch; `lit` blows it out
 * to a hot, saturated glow for active keys; `root` gets full chroma.
 */
export function noteColor(
  midi: number, opts: { lit?: boolean; root?: boolean; oct?: number } = {}
): string {
  const h = pcHue(midi)
  const octLift = Math.max(-2, Math.min(2, opts.oct ?? 0)) * 4
  if (opts.lit) return `hsl(${h} 95% ${64 + octLift}%)`
  const s = opts.root ? 70 : 52
  const l = (opts.root ? 60 : 52) + octLift
  return `hsl(${h} ${s}% ${l}%)`
}
export function noteGlow(midi: number): string {
  return `hsl(${pcHue(midi)} 100% 62%)`
}

// ── engine → signature hue ───────────────────────────────────────────
// Every synth/drum engine gets a stable accent so BENCH, the engine ring, and
// preset chips all agree on "this is an FM sound".
export const ENGINE_COLOR: Record<string, string> = {
  va:        '#ffb347', // amber — classic subtractive
  fm:        '#ff5ca8', // magenta — bell/metallic
  additive:  '#3ad6e6', // cyan — partials
  wavetable: '#b47cff', // violet — scanning
  pluck:     '#5fe08a', // green — string pluck
  string:    '#4cc7c0', // teal — bowed
  tube:      '#ff8a4c', // orange — reed/wind
  modal:     '#5c9bff', // blue — struck resonator
  westcoast: '#ff6b5c', // red-orange — buchla
  formant:   '#ff7fd0', // rose — vocal
  harmonic:  '#c8e64c', // yellow-green — flute/brass
  // percussion — warmer, punchier
  kick:      '#ff5c5c',
  snare:     '#ffd24c',
  hat:       '#8fe0ff',
  clap:      '#ffa04c',
  tom:       '#e07cff',
  noise:     '#c0c8d8'
}
export function engineColor(id: string): string {
  return ENGINE_COLOR[id] ?? '#b9b3d0'
}

// ── instrument family → hue ──────────────────────────────────────────
export const FAMILY_COLOR: Record<string, string> = {
  guitars: '#5fe08a',
  strings: '#4cc7c0',
  winds:   '#c8e64c',
  brass:   '#ffb347',
  keys:    '#ff5ca8',
  mallets: '#b47cff',
  voices:  '#ff7fd0',
  synth:   '#3ad6e6',
  drums:   '#ff6b5c',
  percussion: '#ff6b5c'
}
export function familyColor(fam: string): string {
  return FAMILY_COLOR[fam] ?? '#b9b3d0'
}

// ── param group → hue ────────────────────────────────────────────────
// Knobs are color-coded by what they DO so a dense param wheel is legible at a
// glance. Group is inferred from the param name (see paramGroup).
export const GROUP_COLOR: Record<string, string> = {
  pitch:  '#7ca8ff', // tune / freq / detune / harmonic ratios
  tone:   '#c8e64c', // timbre / bright / shape / wave / material
  filter: '#ffb347', // cutoff / resonance / filter env
  env:    '#5fe08a', // attack / decay / sustain / release
  mod:    '#b47cff', // lfo / vib / drift / mod depth
  level:  '#d8d3e4', // gain / level / pan / mix
  fx:     '#ff7fd0', // send / space / drive
  space:  '#4cc7c0'  // width / body / pos
}
export function groupColor(group: string): string {
  return GROUP_COLOR[group] ?? INK.primary
}

/** Heuristic bucket for a param name → a group key in GROUP_COLOR. */
export function paramGroup(name: string): keyof typeof GROUP_COLOR {
  const n = name.toLowerCase()
  if (/pan|gain|level|mix|volume|amp\b|out/.test(n)) return 'level'
  if (/cut|reson|q\b|filt|hpf|lpf/.test(n)) return 'filter'
  if (/att|dec|sus|rel|env|hold|adsr/.test(n)) return 'env'
  if (/lfo|vib|trem|drift|mod|wobble|chorus|flutter/.test(n)) return 'mod'
  if (/tune|freq|detune|pitch|ratio|harm|partial|octave|semi|coarse|fine|glide|bend/.test(n)) return 'pitch'
  if (/send|space|reverb|delay|verb|room|drive|dist|crush|sat/.test(n)) return 'fx'
  if (/body|width|pos|spread|size|pol|stereo/.test(n)) return 'space'
  return 'tone'
}

// ── SEQ track palette — vivid, evenly spread ─────────────────────────
export const TRACK_COLORS = [
  '#ff5c5c', '#ffb347', '#ffe14c', '#5fe08a',
  '#3ad6e6', '#5c9bff', '#b47cff', '#ff5ca8'
] as const

// ── small color utils ────────────────────────────────────────────────
/** Blend two hex/hsl-safe colors — only handles #rrggbb inputs; a-> b by t. */
export function mix(a: string, b: string, t: number): string {
  const pa = hexRgb(a), pb = hexRgb(b)
  if (!pa || !pb) return a
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `rgb(${r},${g},${bl})`
}
export function withAlpha(color: string, a: number): string {
  // hsl(H S% L%) → hsl(H S% L% / a)  (CSS Color 4, supported by canvas)
  if (color.startsWith('hsl(')) return color.replace(/^hsl\(([^)]+)\)$/, `hsl($1 / ${a})`)
  if (color.startsWith('rgb(')) return color.replace(/^rgb\(([^)]+)\)$/, `rgba($1, ${a})`)
  const p = hexRgb(color)
  return p ? `rgba(${p[0]},${p[1]},${p[2]},${a})` : color
}
function hexRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
