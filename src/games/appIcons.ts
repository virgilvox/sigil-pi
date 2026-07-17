// Sigil-style line-art icons for the app selector, in the same visual language as
// the Null Arcana sigils (viewBox 0 0 100 100, currentColor stroke, no fill).
// The bare markup below inherits stroke/fill from the wrapping <g> in AppGlyph.vue,
// so a node's accent color flows through automatically. Keyed by app id.

export const APP_ICONS: Record<string, string> = {
  // dueling magic circle
  'sigil-lite': '<circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="12"/><path d="M50 8 L50 20 M50 80 L50 92 M8 50 L20 50 M80 50 L92 50"/>',
  // magic circle + extra (audio) ring
  'sigil-full': '<circle cx="50" cy="50" r="33"/><circle cx="50" cy="50" r="21"/><circle cx="50" cy="50" r="9"/><path d="M50 4 L50 17 M50 83 L50 96 M4 50 L17 50 M83 50 L96 50"/>',
  // hex chassis + salvaged bolt
  'junk-mage': '<path d="M50 12 L82 30 L82 70 L50 88 L18 70 L18 30 Z"/><path d="M55 30 L42 52 L55 52 L45 72"/>',
  // oracle card with an eye
  'null-arcana': '<rect x="30" y="15" width="40" height="70" rx="5"/><circle cx="50" cy="50" r="11"/><circle cx="50" cy="50" r="2.5" fill="currentColor"/><path d="M50 32 L50 24 M50 68 L50 76"/>',
  // signal waveform
  'null-synth': '<path d="M10 50 Q22 20 34 50 Q46 80 58 50 Q70 20 82 50 L92 50"/>',
  // orrery — sun, orbits, planets
  'orrery': '<circle cx="50" cy="50" r="7" fill="currentColor"/><circle cx="50" cy="50" r="22"/><circle cx="50" cy="50" r="36"/><circle cx="72" cy="50" r="4" fill="currentColor"/><circle cx="30" cy="36" r="3.5" fill="currentColor"/>',
  // oscilloscope screen + trace
  'synth-lab': '<rect x="16" y="28" width="68" height="44" rx="6"/><path d="M24 50 Q34 33 44 50 Q54 67 64 50 Q70 42 76 50"/>',
  // generative ensemble — concentric track rings with note nodes
  'composer': '<circle cx="50" cy="50" r="12"/><circle cx="50" cy="50" r="26"/><circle cx="50" cy="50" r="40"/><circle cx="50" cy="24" r="4" fill="currentColor"/><circle cx="76" cy="50" r="4" fill="currentColor"/><circle cx="32" cy="68" r="3.5" fill="currentColor"/><circle cx="50" cy="62" r="3" fill="currentColor"/>',
  // carrom board with striker + corner pockets
  'carrom': '<rect x="20" y="20" width="60" height="60" rx="3"/><circle cx="50" cy="50" r="8"/><circle cx="27" cy="27" r="4.5"/><circle cx="73" cy="27" r="4.5"/><circle cx="27" cy="73" r="4.5"/><circle cx="73" cy="73" r="4.5"/>',
  // spinning prize wheel + hub
  'prize-wheel': '<circle cx="50" cy="50" r="31"/><path d="M50 19 L50 81 M19 50 L81 50 M28 28 L72 72 M72 28 L28 72"/><circle cx="50" cy="50" r="5" fill="currentColor"/>',
  // robot head
  'robot-face': '<rect x="24" y="30" width="52" height="42" rx="7"/><circle cx="39" cy="50" r="5"/><circle cx="61" cy="50" r="5"/><path d="M41 63 L59 63 M50 30 L50 20 M50 20 L44 15 M50 20 L56 15"/>',
  // rune sigil in a diamond
  'sigil-engine': '<path d="M50 15 L75 50 L50 85 L25 50 Z"/><path d="M50 31 L50 69 M33 50 L67 50"/><circle cx="50" cy="50" r="7"/>'
}

// Monochrome control glyphs for the app-switcher hub + tabs (currentColor stroke).
export const CONTROL_ICONS: Record<string, string> = {
  home: '<path d="M18 50 L50 22 L82 50 M28 44 L28 80 L72 80 L72 44"/>',
  soundOn: '<path d="M20 40 L34 40 L50 24 L50 76 L34 60 L20 60 Z"/><path d="M62 38 Q72 50 62 62 M71 30 Q86 50 71 70"/>',
  soundOff: '<path d="M20 40 L34 40 L50 24 L50 76 L34 60 L20 60 Z"/><path d="M62 40 L84 60 M84 40 L62 60"/>',
  crt: '<rect x="16" y="24" width="68" height="46" rx="6"/><path d="M40 82 L60 82 M50 70 L50 82 M24 32 L76 32"/>',
  gear: '<circle cx="50" cy="50" r="13"/><path d="M50 18 L50 30 M50 70 L50 82 M18 50 L30 50 M70 50 L82 50 M27 27 L36 36 M64 64 L73 73 M73 27 L64 36 M36 64 L27 73"/>',
  play: '<path d="M36 28 L74 50 L36 72 Z"/>',
  pause: '<path d="M40 28 L40 72 M60 28 L60 72"/>'
}
