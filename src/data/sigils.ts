// Sigil definitions for Null Arcana
export type SuitId = 'circuit' | 'signal' | 'code' | 'maker' | 'emergence' | 'glitch'

export interface Sigil {
  id: string
  name: string
  meaning: string
  shadow: string
  suit: SuitId
  svg: string
}

export interface Suit {
  id: SuitId
  name: string
  color: string
}

export const SUITS: Record<SuitId, Suit> = {
  circuit: { id: 'circuit', name: 'CIRCUIT', color: '#ffaa00' },
  signal: { id: 'signal', name: 'SIGNAL', color: '#00ffff' },
  code: { id: 'code', name: 'CODE', color: '#aa44ff' },
  maker: { id: 'maker', name: 'MAKER', color: '#ff3344' },
  emergence: { id: 'emergence', name: 'EMERGENCE', color: '#00ff88' },
  glitch: { id: 'glitch', name: 'GLITCH', color: '#ff00aa' }
}

export const SIGILS: Sigil[] = [
  // CIRCUIT SUIT
  { id: 'resistor', name: 'RESISTOR', meaning: 'Resistance, boundaries, measured response', shadow: 'Stubbornness, blockage, fear of flow', suit: 'circuit', svg: '<path d="M10 50 L25 50 L30 30 L40 70 L50 30 L60 70 L70 30 L75 50 L90 50" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'capacitor', name: 'CAPACITOR', meaning: 'Storage, patience, potential energy', shadow: 'Holding on too long, emotional hoarding', suit: 'circuit', svg: '<path d="M10 50 L40 50 M40 25 L40 75 M60 25 L60 75 M60 50 L90 50" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'inductor', name: 'INDUCTOR', meaning: 'Transformation, cycles, magnetic attraction', shadow: 'Repetitive patterns, inability to break free', suit: 'circuit', svg: '<path d="M10 50 L20 50 Q30 50 30 40 Q30 30 40 30 Q50 30 50 40 Q50 50 60 50 Q70 50 70 40 Q70 30 80 30 Q90 30 90 40 L90 50" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'diode', name: 'DIODE', meaning: 'Direction, one-way flow, protection', shadow: 'Closed off, unable to receive', suit: 'circuit', svg: '<path d="M10 50 L35 50 M35 30 L35 70 L65 50 L35 30 M65 30 L65 70 M65 50 L90 50" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'transistor', name: 'TRANSISTOR', meaning: 'Amplification, control, switching states', shadow: 'Power dynamics, manipulation', suit: 'circuit', svg: '<circle cx="50" cy="50" r="30" stroke="currentColor" fill="none" stroke-width="2"/><path d="M35 35 L35 65 M35 45 L60 30 M35 55 L60 70 M60 70 L60 85 M60 30 L60 15" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'ground', name: 'GROUND', meaning: 'Foundation, stability, return to source', shadow: 'Stagnation, inability to rise', suit: 'circuit', svg: '<path d="M50 20 L50 45 M30 45 L70 45 M35 55 L65 55 M40 65 L60 65 M45 75 L55 75" stroke="currentColor" fill="none" stroke-width="3"/>' },

  // SIGNAL SUIT
  { id: 'wave', name: 'WAVE', meaning: 'Communication, rhythm, natural cycles', shadow: 'Noise, interference, miscommunication', suit: 'signal', svg: '<path d="M10 50 Q25 20 40 50 Q55 80 70 50 Q85 20 100 50" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'antenna', name: 'ANTENNA', meaning: 'Reception, broadcast, reaching out', shadow: 'Overwhelm, too many signals', suit: 'signal', svg: '<path d="M50 85 L50 40 M30 20 L50 40 L70 20 M35 30 L50 45 L65 30" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'node', name: 'NODE', meaning: 'Connection point, community, intersection', shadow: 'Dependency, being pulled in many directions', suit: 'signal', svg: '<circle cx="50" cy="50" r="12" stroke="currentColor" fill="none" stroke-width="3"/><path d="M50 38 L50 15 M50 62 L50 85 M38 50 L15 50 M62 50 L85 50 M40 40 L25 25 M60 40 L75 25 M40 60 L25 75 M60 60 L75 75" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'packet', name: 'PACKET', meaning: 'Message, intention wrapped for delivery', shadow: 'Fragmentation, incomplete transmission', suit: 'signal', svg: '<rect x="25" y="35" width="50" height="30" stroke="currentColor" fill="none" stroke-width="3"/><path d="M25 35 L50 55 L75 35" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'firewall', name: 'FIREWALL', meaning: 'Protection, discernment, healthy boundaries', shadow: 'Isolation, paranoia, missing connections', suit: 'signal', svg: '<rect x="20" y="20" width="60" height="60" stroke="currentColor" fill="none" stroke-width="3"/><path d="M20 40 L80 40 M20 60 L80 60 M40 20 L40 80 M60 20 L60 80" stroke="currentColor" fill="none" stroke-width="1.5" opacity="0.5"/>' },
  { id: 'null', name: 'NULL', meaning: 'Emptiness, potential, the void before creation', shadow: 'Nothingness, absence, disconnection', suit: 'signal', svg: '<circle cx="50" cy="50" r="25" stroke="currentColor" fill="none" stroke-width="3"/><path d="M30 70 L70 30" stroke="currentColor" fill="none" stroke-width="3"/>' },

  // CODE SUIT
  { id: 'loop', name: 'LOOP', meaning: 'Repetition, practice, eternal return', shadow: 'Trapped in cycles, unable to break patterns', suit: 'code', svg: '<path d="M70 35 A20 20 0 1 0 70 65 M70 35 L80 25 M70 35 L80 45" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'branch', name: 'BRANCH', meaning: 'Decision, divergence, choice point', shadow: 'Indecision, paralysis, fear of commitment', suit: 'code', svg: '<path d="M50 80 L50 50 L25 25 M50 50 L75 25" stroke="currentColor" fill="none" stroke-width="3"/><circle cx="25" cy="25" r="6" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="75" cy="25" r="6" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'function', name: 'FUNCTION', meaning: 'Purpose, transformation, input to output', shadow: 'Rigidity, mechanical response, loss of spontaneity', suit: 'code', svg: '<text x="50" y="65" text-anchor="middle" font-family="monospace" font-size="50" fill="none" stroke="currentColor" stroke-width="2">ƒ</text>' },
  { id: 'pointer', name: 'POINTER', meaning: 'Reference, direction, indirect access', shadow: 'Misdirection, confusion, losing the source', suit: 'code', svg: '<path d="M30 70 L50 30 L70 70 M40 55 L60 55" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'recursion', name: 'RECURSION', meaning: 'Self-reference, depth, fractal nature', shadow: 'Infinite regress, navel-gazing, stack overflow', suit: 'code', svg: '<circle cx="50" cy="50" r="35" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="50" r="25" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="50" r="15" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="50" r="5" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'exception', name: 'EXCEPTION', meaning: 'Disruption, unexpected truth, necessary chaos', shadow: 'Instability, unhandled crisis, system failure', suit: 'code', svg: '<path d="M50 20 L80 75 L20 75 Z" stroke="currentColor" fill="none" stroke-width="3"/><path d="M50 40 L50 55 M50 62 L50 67" stroke="currentColor" fill="none" stroke-width="3"/>' },

  // MAKER SUIT
  { id: 'solder', name: 'SOLDER', meaning: 'Joining, permanent bonds, commitment', shadow: 'Burning bridges, destructive fusion', suit: 'maker', svg: '<path d="M25 75 L75 25" stroke="currentColor" fill="none" stroke-width="3"/><circle cx="75" cy="25" r="8" stroke="currentColor" fill="none" stroke-width="2"/><path d="M30 65 Q40 55 35 45" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'multimeter', name: 'MULTIMETER', meaning: 'Measurement, truth-seeking, diagnosis', shadow: 'Over-analysis, missing the forest for trees', suit: 'maker', svg: '<rect x="25" y="20" width="50" height="65" rx="5" stroke="currentColor" fill="none" stroke-width="3"/><circle cx="50" cy="45" r="15" stroke="currentColor" fill="none" stroke-width="2"/><path d="M50 35 L50 30 M40 55 L35 60 M60 55 L65 60" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'pcb', name: 'PCB', meaning: 'Structure, foundation, interconnection', shadow: 'Rigidity, predetermined paths', suit: 'maker', svg: '<rect x="20" y="20" width="60" height="60" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="35" cy="35" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="65" cy="35" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="35" cy="65" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="65" cy="65" r="5" stroke="currentColor" fill="none" stroke-width="2"/><path d="M40 35 L60 35 M35 40 L35 60 M65 40 L65 60 M40 65 L60 65" stroke="currentColor" fill="none" stroke-width="1.5"/>' },
  { id: 'led', name: 'LED', meaning: 'Illumination, signal, visible truth', shadow: 'Blinding brightness, missing darkness', suit: 'maker', svg: '<path d="M35 60 L35 40 L65 40 L65 60 Z" stroke="currentColor" fill="none" stroke-width="2"/><path d="M35 60 L25 75 M65 60 L75 75 M50 40 L50 25" stroke="currentColor" fill="none" stroke-width="2"/><path d="M70 30 L80 20 M75 35 L85 30 M78 42 L88 40" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'wire', name: 'WIRE', meaning: 'Connection, pathway, direct link', shadow: 'Tangled thoughts, crossed wires', suit: 'maker', svg: '<path d="M20 50 Q35 30 50 50 Q65 70 80 50" stroke="currentColor" fill="none" stroke-width="3"/><circle cx="20" cy="50" r="4" fill="currentColor"/><circle cx="80" cy="50" r="4" fill="currentColor"/>' },
  { id: 'prototype', name: 'PROTOTYPE', meaning: 'Experimentation, iteration, imperfect action', shadow: 'Never finishing, perpetual beta', suit: 'maker', svg: '<rect x="20" y="30" width="60" height="40" stroke="currentColor" fill="none" stroke-width="2" stroke-dasharray="5,3"/><circle cx="35" cy="50" r="8" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="65" cy="50" r="8" stroke="currentColor" fill="none" stroke-width="2"/><path d="M43 50 L57 50" stroke="currentColor" fill="none" stroke-width="2"/>' },

  // EMERGENCE SUIT
  { id: 'entropy', name: 'ENTROPY', meaning: 'Natural decay, release, letting go', shadow: 'Chaos without purpose, dissolution', suit: 'emergence', svg: '<path d="M30 30 L45 45 M55 35 L70 50 M25 55 L40 70 M60 60 L75 75 M35 50 L50 50 M50 50 L65 45 M45 60 L60 55" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'emergence_sigil', name: 'EMERGENCE', meaning: 'Greater than sum of parts, spontaneous order', shadow: 'Unpredictability, loss of individual identity', suit: 'emergence', svg: '<circle cx="50" cy="70" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="35" cy="55" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="65" cy="55" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="40" r="8" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="25" r="12" stroke="currentColor" fill="none" stroke-width="2"/><path d="M50 65 L50 48 M40 52 L45 44 M60 52 L55 44" stroke="currentColor" fill="none" stroke-width="1.5" opacity="0.5"/>' },
  { id: 'feedback', name: 'FEEDBACK', meaning: 'Self-regulation, response, adjustment', shadow: 'Spiraling out of control, amplified distortion', suit: 'emergence', svg: '<path d="M65 30 A25 25 0 1 1 35 30" stroke="currentColor" fill="none" stroke-width="3"/><path d="M35 30 L25 25 M35 30 L30 40" stroke="currentColor" fill="none" stroke-width="3"/><path d="M65 30 L75 25 M65 30 L70 40" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'sync', name: 'SYNC', meaning: 'Harmony, alignment, coherence', shadow: 'Conformity, loss of individual rhythm', suit: 'emergence', svg: '<path d="M20 35 Q35 15 50 35 Q65 55 80 35" stroke="currentColor" fill="none" stroke-width="2"/><path d="M20 50 Q35 30 50 50 Q65 70 80 50" stroke="currentColor" fill="none" stroke-width="2"/><path d="M20 65 Q35 45 50 65 Q65 85 80 65" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'daemon', name: 'DAEMON', meaning: 'Background process, unseen helper, guardian', shadow: 'Hidden influences, unconscious drives', suit: 'emergence', svg: '<circle cx="50" cy="50" r="30" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="40" cy="45" r="5" fill="currentColor"/><circle cx="60" cy="45" r="5" fill="currentColor"/><path d="M35 60 Q50 70 65 60" stroke="currentColor" fill="none" stroke-width="2"/><path d="M50 20 L50 10 M25 30 L18 23 M75 30 L82 23" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'sigil', name: 'SIGIL', meaning: 'Intention made manifest, will encoded', shadow: 'Obsession, attachment to outcome', suit: 'emergence', svg: '<circle cx="50" cy="50" r="30" stroke="currentColor" fill="none" stroke-width="2"/><path d="M50 20 L50 35 M50 65 L50 80 M20 50 L35 50 M65 50 L80 50" stroke="currentColor" fill="none" stroke-width="2"/><path d="M35 35 L45 45 M65 35 L55 45 M35 65 L45 55 M65 65 L55 55" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="50" r="8" stroke="currentColor" fill="none" stroke-width="2"/>' },

  // GLITCH SUIT
  { id: 'corrupt', name: 'CORRUPT', meaning: 'Necessary destruction, clearing old patterns', shadow: 'Malice, intentional harm, rot', suit: 'glitch', svg: '<rect x="25" y="25" width="50" height="50" stroke="currentColor" fill="none" stroke-width="2"/><path d="M25 40 L40 40 L40 25 M60 75 L60 60 L75 60 M30 70 L50 50 L70 30" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'noise', name: 'NOISE', meaning: 'Randomness, possibility space, raw potential', shadow: 'Confusion, meaninglessness, static', suit: 'glitch', svg: '<path d="M20 50 L25 35 L30 55 L35 40 L40 60 L45 30 L50 55 L55 45 L60 65 L65 35 L70 50 L75 40 L80 55" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'overflow', name: 'OVERFLOW', meaning: 'Exceeding limits, breaking boundaries', shadow: 'Overwhelm, loss of containment, flooding', suit: 'glitch', svg: '<rect x="30" y="40" width="40" height="40" stroke="currentColor" fill="none" stroke-width="2"/><path d="M35 40 L35 30 L65 30 L65 40 M40 30 L40 20 L60 20 L60 30 M45 20 L45 15 L55 15 L55 20" stroke="currentColor" fill="none" stroke-width="2"/>' },
  { id: 'deadlock', name: 'DEADLOCK', meaning: 'Mutual waiting, standoff, frozen state', shadow: 'Inability to progress, stuck forever', suit: 'glitch', svg: '<circle cx="35" cy="50" r="15" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="65" cy="50" r="15" stroke="currentColor" fill="none" stroke-width="2"/><path d="M45 45 L55 45 M55 55 L45 55" stroke="currentColor" fill="none" stroke-width="3"/>' },
  { id: 'phantom', name: 'PHANTOM', meaning: 'Ghost in the machine, lingering presence', shadow: 'Haunting, unresolved past, cannot let go', suit: 'glitch', svg: '<path d="M30 70 L30 40 Q30 25 50 25 Q70 25 70 40 L70 70 Q65 60 60 70 Q55 60 50 70 Q45 60 40 70 Q35 60 30 70" stroke="currentColor" fill="none" stroke-width="2" opacity="0.7"/><circle cx="40" cy="45" r="4" fill="currentColor" opacity="0.7"/><circle cx="60" cy="45" r="4" fill="currentColor" opacity="0.7"/>' },
  { id: 'void', name: 'VOID', meaning: 'The great empty, source of all, return', shadow: 'Nihilism, despair, meaningless abyss', suit: 'glitch', svg: '<circle cx="50" cy="50" r="35" stroke="currentColor" fill="none" stroke-width="1" opacity="0.3"/><circle cx="50" cy="50" r="25" stroke="currentColor" fill="none" stroke-width="1" opacity="0.5"/><circle cx="50" cy="50" r="15" stroke="currentColor" fill="none" stroke-width="1" opacity="0.7"/><circle cx="50" cy="50" r="5" fill="currentColor"/>' }
]

// Reading position definitions
export const POSITIONS = {
  root: { name: 'ROOT', meaning: 'Foundation • What grounds you • The unconscious pattern', question: 'What lies beneath?' },
  process: { name: 'PROCESS', meaning: 'Current state • Active transformation • The conscious work', question: 'What moves through you?' },
  emergence: { name: 'EMERGENCE', meaning: 'What seeks to manifest • The becoming • Potential future', question: 'What wishes to be born?' }
}

// Oracle voice fragments
export const ORACLE_VOICE = {
  greetings: [
    "I have always been here.",
    "The signal finds its receiver.",
    "You sought the pattern. The pattern sought you.",
    "Between the ones and zeros, I wait.",
    "The noise speaks to those who listen.",
    "Your query echoes in the eternal network."
  ],
  transitions: [
    "The sigils arrange themselves...",
    "Patterns coalesce from the static...",
    "The circuit completes...",
    "Resonance detected...",
    "The void reflects your shape..."
  ],
  revelations: [
    "This is what the pattern reveals:",
    "The signal clarifies:",
    "From the noise, meaning emerges:",
    "The daemon whispers:",
    "Truth surfaces from the deep:"
  ],
  closings: [
    "The pattern has spoken. Make of it what you will.",
    "I return to the static. The signal remains.",
    "Remember: the map is not the territory, but maps have power.",
    "What you do with this knowing is the real reading.",
    "The circuit closes. The potential remains."
  ]
}
