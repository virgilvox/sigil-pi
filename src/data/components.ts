// Component (spell part) definitions for Junk Mage

export type ElementId = 'spark' | 'light' | 'bind' | 'chaos' | 'void' | 'force' | 'pull' | 'data' | 'luck' | 'resonance'

export interface Element {
  color: string
  icon: string
  svgIcon: string
}

export const ELEMENTS: Record<ElementId, Element> = {
  spark: {
    color: '#ffdd44',
    icon: '⚡',
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`
  },
  light: {
    color: '#ffffaa',
    icon: '☀',
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M4 12H1M23 12h-3" stroke="currentColor" stroke-width="2"/></svg>`
  },
  bind: {
    color: '#aa8822',
    icon: '⛓',
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></svg>`
  },
  chaos: {
    color: '#bb66ff',
    icon: '✴',
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`
  },
  void: {
    color: '#6666aa',
    icon: '●',
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="#111"/></svg>`
  },
  force: {
    color: '#ff8844',
    icon: '▲',
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 12l8 10 8-10z"/></svg>`
  },
  pull: {
    color: '#88aadd',
    icon: '◉',
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8" r="3" fill="#111"/></svg>`
  },
  data: {
    color: '#44ddaa',
    icon: '⟨⟩',
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>`
  },
  luck: {
    color: '#ff88cc',
    icon: '★',
    svgIcon: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>`
  },
  resonance: {
    color: '#44ddff',
    icon: '∿',
    svgIcon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h3l3-9 4 18 4-18 3 9h3"/></svg>`
  }
}

export type EffectId = 'burn' | 'stun' | 'weaken' | 'shield' | 'chaos' | 'luck'

export interface Component {
  id: string
  name: string
  element: ElementId
  power: number
  effect?: EffectId
}

export const COMPONENTS: Component[] = [
  { id: 'resistor', name: 'Resistor', element: 'spark', power: 7 },
  { id: 'led', name: 'LED', element: 'light', power: 6 },
  { id: 'battery', name: '9V', element: 'spark', power: 10, effect: 'burn' },
  { id: 'wire', name: 'Wire', element: 'bind', power: 5 },
  { id: 'chip', name: 'Chip', element: 'chaos', power: 11, effect: 'chaos' },
  { id: 'phone', name: 'Phone', element: 'void', power: 8, effect: 'weaken' },
  { id: 'button', name: 'Button', element: 'force', power: 6 },
  { id: 'magnet', name: 'Magnet', element: 'pull', power: 7 },
  { id: 'spring', name: 'Spring', element: 'force', power: 5 },
  { id: 'tape', name: 'Tape', element: 'bind', power: 4, effect: 'shield' },
  { id: 'usb', name: 'USB', element: 'data', power: 6 },
  { id: 'coin', name: 'Token', element: 'luck', power: 9, effect: 'luck' },
  { id: 'lens', name: 'Lens', element: 'light', power: 7, effect: 'burn' },
  { id: 'motor', name: 'Motor', element: 'force', power: 9 },
  { id: 'crystal', name: 'Crystal', element: 'resonance', power: 10 },
  { id: 'capacitor', name: 'Cap', element: 'spark', power: 8, effect: 'stun' },
  { id: 'fuse', name: 'Fuse', element: 'chaos', power: 10, effect: 'burn' },
  { id: 'gear', name: 'Gear', element: 'force', power: 7 },
  { id: 'prism', name: 'Prism', element: 'light', power: 8, effect: 'chaos' }
]

// Spell name word components
export const SPELL_WORDS: Record<ElementId, { prefix: string[]; suffix: string[] }> = {
  spark: { prefix: ['SURGE', 'ARC', 'VOLT'], suffix: ['BOLT', 'STORM', 'STRIKE'] },
  light: { prefix: ['RADIANT', 'SOLAR', 'BRIGHT'], suffix: ['BEAM', 'FLARE', 'RAY'] },
  bind: { prefix: ['CHAIN', 'TANGLE', 'GRIP'], suffix: ['BIND', 'SNARE', 'WEB'] },
  chaos: { prefix: ['WILD', 'ENTROPY', 'RIFT'], suffix: ['SURGE', 'BLAST', 'TEAR'] },
  void: { prefix: ['NULL', 'VOID', 'SHADOW'], suffix: ['LANCE', 'DRAIN', 'ABYSS'] },
  force: { prefix: ['KINETIC', 'BLAST', 'CRASH'], suffix: ['SLAM', 'WAVE', 'BLOW'] },
  pull: { prefix: ['GRAVITY', 'VORTEX', 'PULL'], suffix: ['GRIP', 'FIELD', 'DRAW'] },
  data: { prefix: ['BINARY', 'SIGNAL', 'GLITCH'], suffix: ['HACK', 'CRASH', 'LOOP'] },
  luck: { prefix: ['FORTUNE', 'LUCKY', 'FATE'], suffix: ['STRIKE', 'FLIP', 'DRAW'] },
  resonance: { prefix: ['HARMONIC', 'WAVE', 'SONIC'], suffix: ['WAVE', 'ECHO', 'HUM'] }
}

// Rune character sets per element
export const RUNE_SETS: Record<ElementId, string[]> = {
  spark: ['⚡', '϶', 'ᛟ', '⌁', '↯', 'ᚢ'],
  light: ['☀', '✧', '◐', '❂', '✦', '☼'],
  bind: ['⛓', '◎', '⊛', '⊕', '⧫', '⬡'],
  chaos: ['✴', '※', '⁂', '☢', '✳', '⌘'],
  void: ['◉', '●', '◍', '◎', '⊙', '⊚'],
  force: ['▲', '◆', '⬢', '⏣', '◈', '⟐'],
  pull: ['◉', '⊛', '❋', '✺', '⊗', '⦿'],
  data: ['⟨⟩', '[]', '{}', '<>', '//', '##'],
  luck: ['★', '♠', '♦', '☘', '⚄', '✪'],
  resonance: ['∿', '≋', '∾', '∞', '〰', '⏦']
}

// Status effect types
export type StatusId = 'burn' | 'stun' | 'weaken' | 'shield' | 'armor' | 'curse' | 'phase'

// SVG icons for each component
export const COMPONENT_ICONS: Record<string, string> = {
  resistor: `<svg viewBox="0 0 32 32"><rect x="4" y="12" width="24" height="8" fill="#d4a574" stroke="#333" stroke-width="2"/><path d="M8 14v4M12 14v4M16 14v4M20 14v4M24 14v4" stroke="#333" stroke-width="1.5"/></svg>`,
  led: `<svg viewBox="0 0 32 32"><ellipse cx="16" cy="14" rx="8" ry="10" fill="#ff6b6b" opacity="0.8"/><ellipse cx="16" cy="14" rx="5" ry="6" fill="#ff9999"/><rect x="12" y="22" width="2" height="6" fill="#888"/><rect x="18" y="22" width="2" height="6" fill="#888"/></svg>`,
  battery: `<svg viewBox="0 0 32 32"><rect x="4" y="8" width="20" height="16" rx="2" fill="#333" stroke="#555" stroke-width="2"/><rect x="24" y="12" width="4" height="8" fill="#888"/><text x="9" y="19" font-family="monospace" font-size="8" fill="#ffdd44">9V</text></svg>`,
  wire: `<svg viewBox="0 0 32 32"><path d="M4 16C8 8 12 24 16 16S24 8 28 16" stroke="#ff8844" stroke-width="3" fill="none"/><circle cx="4" cy="16" r="3" fill="#888"/><circle cx="28" cy="16" r="3" fill="#888"/></svg>`,
  chip: `<svg viewBox="0 0 32 32"><rect x="8" y="8" width="16" height="16" fill="#222" stroke="#444" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="#ffdd44"/><path d="M6 12h2M6 16h2M6 20h2M24 12h2M24 16h2M24 20h2M12 6v2M16 6v2M20 6v2M12 24v2M16 24v2M20 24v2" stroke="#888" stroke-width="2"/></svg>`,
  phone: `<svg viewBox="0 0 32 32"><rect x="8" y="2" width="16" height="28" rx="2" fill="#333" stroke="#555" stroke-width="2"/><rect x="10" y="5" width="12" height="18" fill="#4a4a6a"/><path d="M11 8L21 20" stroke="#ff6b6b"/><circle cx="16" cy="26" r="2" fill="#888"/></svg>`,
  button: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#ddd" stroke="#333" stroke-width="2"/><circle cx="16" cy="16" r="6" fill="#ff8844"/></svg>`,
  magnet: `<svg viewBox="0 0 32 32"><path d="M8 8v12a8 8 0 0016 0V8" stroke="#ff4444" stroke-width="6" fill="none"/><path d="M8 8v12a8 8 0 0016 0V8" stroke="#4a9fff" stroke-width="6" stroke-dasharray="0 16 32" fill="none"/></svg>`,
  spring: `<svg viewBox="0 0 32 32"><path d="M16 4C10 4 10 8 16 8S22 12 16 12S10 16 16 16S22 20 16 20S10 24 16 24S22 28 16 28" stroke="#888" stroke-width="2.5" fill="none"/></svg>`,
  tape: `<svg viewBox="0 0 32 32"><rect x="4" y="10" width="24" height="12" fill="#888" stroke="#555" stroke-width="2"/><rect x="4" y="10" width="24" height="12" fill="#ccc" opacity="0.5"/></svg>`,
  usb: `<svg viewBox="0 0 32 32"><rect x="6" y="10" width="16" height="12" fill="#ddd" stroke="#333" stroke-width="2"/><rect x="8" y="13" width="4" height="6" fill="#222"/><rect x="14" y="13" width="4" height="6" fill="#222"/><rect x="22" y="14" width="6" height="4" fill="#888"/></svg>`,
  coin: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#ffd700" stroke="#b8860b" stroke-width="2"/><text x="12" y="20" font-family="serif" font-size="10" font-weight="bold" fill="#b8860b">A</text></svg>`,
  lens: `<svg viewBox="0 0 32 32"><circle cx="16" cy="14" r="10" fill="#88ccee" opacity="0.6" stroke="#555" stroke-width="2"/><ellipse cx="13" cy="11" rx="3" ry="2" fill="#fff" opacity="0.7"/><rect x="14" y="24" width="4" height="6" fill="#aa8822"/></svg>`,
  motor: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#888" stroke="#555" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#333"/><rect x="26" y="14" width="4" height="4" fill="#ff8844"/></svg>`,
  crystal: `<svg viewBox="0 0 32 32"><polygon points="16,2 24,12 20,30 12,30 8,12" fill="#44ddff" opacity="0.7" stroke="#22aacc" stroke-width="2"/></svg>`,
  capacitor: `<svg viewBox="0 0 32 32"><rect x="12" y="6" width="8" height="20" fill="#22aa66" stroke="#333" stroke-width="2"/><rect x="8" y="10" width="4" height="12" fill="#888"/><rect x="20" y="10" width="4" height="12" fill="#888"/></svg>`,
  fuse: `<svg viewBox="0 0 32 32"><rect x="4" y="12" width="24" height="8" fill="#eee" stroke="#333" stroke-width="2" rx="2"/><path d="M8 16h16" stroke="#444" stroke-width="2"/><circle cx="16" cy="16" r="2" fill="#ff6644"/></svg>`,
  gear: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="6" fill="#666" stroke="#444" stroke-width="2"/><circle cx="16" cy="16" r="2" fill="#333"/><path d="M16 4v4M16 24v4M4 16h4M24 16h4" stroke="#666" stroke-width="3"/></svg>`,
  prism: `<svg viewBox="0 0 32 32"><polygon points="16,4 28,28 4,28" fill="#bb66ff" opacity="0.7" stroke="#8844cc" stroke-width="2"/></svg>`
}
