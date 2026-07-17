// ═══════════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════════

export interface Point {
  x: number
  y: number
}

export interface Polar {
  angle: number
  radius: number
}

export interface GameColors {
  pri: string
  sec: string
  glow: string
  dim: string
  name: string
}

// ═══════════════════════════════════════════════════════════════════
// GAME CATALOG TYPES
// ═══════════════════════════════════════════════════════════════════

/** A launchable app/game in the hub — either baked into the Vue bundle or a drop-in HTML file. */
export interface GameEntry {
  id: string
  name: string
  /** Vue-router path to launch this entry (drop-ins use /play/:id). */
  route: string
  color: string
  description: string
  /** Source: 'baked' = compiled Vue route, 'dropin' = single-file HTML scanned at runtime. */
  source: 'baked' | 'dropin'
  /** Lower sorts first in menus; baked defaults keep their authored order. */
  order?: number
  /** For drop-ins: the served HTML filename under /dropins/. */
  file?: string
  /** Optional glyph shown inside a menu node (1-2 chars or one emoji); falls back to auto initials. */
  icon?: string
}

/** Raw drop-in descriptor returned by the runtime server's /api/games scan. */
export interface DropinManifestEntry {
  id: string
  name: string
  file: string
  color?: string
  description?: string
  order?: number
  icon?: string
}

// ═══════════════════════════════════════════════════════════════════
// SIGIL TYPES
// ═══════════════════════════════════════════════════════════════════

export type SpellId = 'bolt' | 'lance' | 'ward' | 'siphon'
export type SpellType = 'projectile' | 'ward' | 'beam'

export interface Spell {
  id: SpellId
  name: string
  cost: number
  type: SpellType
  speed?: number
  damage?: number
  duration?: number
  steal?: number
}

export interface Barrier {
  ang: number
  radius: number
  size: number
  hp: number
  maxHp: number
  flash: number
  seed: number
}

export interface Player {
  id: number
  hp: number
  energy: number
  maxEnergy: number
  angle: number
  barriers: Barrier[]
  flash: number
}

export interface Projectile {
  x: number
  y: number
  ang: number
  speed: number
  dmg: number
  pid: number
  heavy: boolean
  trail: TrailPoint[]
  life: number
}

export interface TrailPoint {
  x: number
  y: number
  life: number
}

export interface Beam {
  sx: number
  sy: number
  ex: number
  ey: number
  pid: number
  life: number
  col: string
  drain: boolean
  fromCol: number
  toCol: number
}

export interface OrbColor {
  core: string
  mid: string
  outer: string
  glow: string
}

export interface Orb {
  x: number
  y: number
  a: number
  r: number
  va: number
  vr: number
  phase: number
  life: number
  dead: boolean
  color: OrbColor
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  col: string
  size: number
}

export interface RingWall {
  s: number
  e: number
}

export interface Ring {
  angle: number
  target: number
  walls: RingWall[]
}

export interface Arc {
  a: Orb
  b: Orb
  str: number
}

export interface Rune {
  x: number
  y: number
  seed: number
  size: number
  alpha: number
  phase: number
}

export interface SpellButton {
  x: number
  y: number
  a: number
  spell: Spell
  r: number
}

export interface PointerState {
  type: 'ring' | 'spell'
  startAng?: number
  touchAng?: number
  pid?: number
  spell?: Spell
  sx?: number
  sy?: number
  x?: number
  y?: number
}

// ═══════════════════════════════════════════════════════════════════
// JUNK MAGE TYPES
// ═══════════════════════════════════════════════════════════════════

export type JunkElement = 'spark' | 'light' | 'bind' | 'chaos' | 'void' | 'force' | 'pull' | 'data' | 'luck' | 'resonance'
export type JunkEffect = 'burn' | 'stun' | 'weaken' | 'shield' | 'chaos' | 'luck'
export type JunkDifficulty = 'easy' | 'normal' | 'hard' | 'brutal'
export type MonsterPattern = 'gremlin' | 'phantom' | 'golem' | 'sprite' | 'crawler' | 'wraith' | 'blob' | 'specter'
export type MonsterSpecial = 'double' | 'phase' | 'armor' | 'glitch' | 'drain' | 'curse' | 'regen' | 'nullify'

export interface ElementData {
  color: string
  icon: string
}

export interface Component {
  id: string
  name: string
  element: JunkElement
  power: number
  effect?: JunkEffect
}

export interface Monster {
  name: string
  hp: number
  atk: number
  color: string
  weakness: JunkElement
  pattern: MonsterPattern
  special: MonsterSpecial
}

export interface DifficultyConfig {
  hp: number
  fights: number
  hpM: number
  atkM: number
  heal: number
  reroll: number
}

export interface JunkMageState {
  difficulty: JunkDifficulty
  fightNum: number
  maxFights: number
  mageMaxHp: number
  mageHp: number
  mageStatus: Record<string, number>
  monster: Monster | null
  monsterMaxHp: number
  monsterHp: number
  monsterStatus: Record<string, number>
  monsterIntent: number
  components: Component[]
  selected: number[]
  turn: number
  totalDamage: number
  powerBonus: number
  scouting: boolean
  fightHistory: number[]
  gameOver: boolean
  processing: boolean
}

// ═══════════════════════════════════════════════════════════════════
// NULL ARCANA TYPES
// ═══════════════════════════════════════════════════════════════════

export type SigilSuit = 'circuit' | 'signal' | 'code' | 'maker' | 'emergence' | 'glitch'
export type OracleState = 'dormant' | 'awakening' | 'active' | 'reading' | 'processing' | 'silent'

export interface Sigil {
  name: string
  meaning: string
  shadow: string
  svg: string
}

export interface SuitData {
  color: string
  sigils: Record<string, Sigil>
}

export interface Position {
  name: string
  meaning: string
  question: string
}

export interface SelectedSigil {
  suit: SigilSuit
  sigilKey: string
  sigil: Sigil
  position: string
}

export interface Reading {
  opening: string
  positions: {
    position: Position
    sigil: Sigil
    suit: SigilSuit
    interpretation: string
  }[]
  synthesis: string
  closing: string
}

// ═══════════════════════════════════════════════════════════════════
// GESTURE TYPES
// ═══════════════════════════════════════════════════════════════════

export interface TouchPoint {
  id: number
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
}

export interface GestureState {
  active: boolean
  type: 'none' | 'swipe-up' | 'swipe-down' | 'tap' | 'drag'
  touchCount: number
  startY: number
}

// ═══════════════════════════════════════════════════════════════════
// CANVAS TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CanvasLayer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  name: string
}

export interface GameLoopState {
  running: boolean
  lastTime: number
  deltaTime: number
}
