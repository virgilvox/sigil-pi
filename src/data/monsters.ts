// Monster definitions for Junk Mage
export interface Monster {
  name: string
  hp: number
  atk: number
  color: string
  weakness: string
  pattern: string
  special: string
}

export const MONSTERS: Monster[] = [
  { name: 'STATIC GREMLIN', hp: 55, atk: 10, color: '#aa44cc', weakness: 'light', pattern: 'gremlin', special: 'double' },
  { name: 'WIRE PHANTOM', hp: 60, atk: 12, color: '#44aacc', weakness: 'force', pattern: 'phantom', special: 'phase' },
  { name: 'RUST GOLEM', hp: 80, atk: 14, color: '#aa8844', weakness: 'spark', pattern: 'golem', special: 'armor' },
  { name: 'GLITCH SPRITE', hp: 50, atk: 11, color: '#44aa88', weakness: 'data', pattern: 'sprite', special: 'glitch' },
  { name: 'VOID CRAWLER', hp: 65, atk: 13, color: '#664488', weakness: 'light', pattern: 'crawler', special: 'drain' },
  { name: 'BYTE WRAITH', hp: 55, atk: 12, color: '#8866aa', weakness: 'chaos', pattern: 'wraith', special: 'curse' },
  { name: 'ENTROPY BLOB', hp: 70, atk: 9, color: '#88aa44', weakness: 'bind', pattern: 'blob', special: 'regen' },
  { name: 'NULL SPECTER', hp: 75, atk: 15, color: '#666666', weakness: 'resonance', pattern: 'specter', special: 'nullify' }
]

// Difficulty settings
export interface Difficulty {
  hp: number
  fights: number
  hpM: number
  atkM: number
  heal: number
  reroll: number
}

export const DIFFICULTIES: Record<string, Difficulty> = {
  easy: { hp: 50, fights: 3, hpM: 0.7, atkM: 0.7, heal: 15, reroll: 5 },
  normal: { hp: 40, fights: 3, hpM: 1, atkM: 1, heal: 12, reroll: 8 },
  hard: { hp: 35, fights: 3, hpM: 1.2, atkM: 1.2, heal: 10, reroll: 10 },
  brutal: { hp: 30, fights: 4, hpM: 1.4, atkM: 1.4, heal: 8, reroll: 12 }
}

export type DifficultyId = 'easy' | 'normal' | 'hard' | 'brutal'

// Pixel art drawing functions for monsters and mage
export function drawMage(ctx: CanvasRenderingContext2D, sz: number, casting = false): void {
  ctx.clearRect(0, 0, sz, sz)
  const s = sz / 16
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c
    ctx.fillRect(x * s, y * s, w * s, h * s)
  }
  // Body
  px(5, 8, 6, 7, '#4a4a6a')
  // Face
  px(6, 4, 4, 4, '#e8d0b0')
  // Hair
  px(6, 3, 4, 2, '#3a2a1a')
  px(5, 4, 1, 2, '#3a2a1a')
  px(10, 4, 1, 2, '#3a2a1a')
  // Eyes
  px(7, 5, 1, 1, '#2a2a2a')
  px(9, 5, 1, 1, '#2a2a2a')
  // Staff
  px(11, 4, 1, 10, '#6a4a2a')
  px(11, 3, 1, 1, casting ? '#ff6b6b' : '#6ba3c7')
  // Casting glow
  if (casting) {
    ctx.fillStyle = 'rgba(255,107,107,0.5)'
    ctx.beginPath()
    ctx.arc(11.5 * s, 3.5 * s, 2.5 * s, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawMonster(ctx: CanvasRenderingContext2D, m: Monster, sz: number, hurt = false): void {
  ctx.clearRect(0, 0, sz, sz)
  const s = sz / 16
  const c = hurt ? '#fff' : m.color
  const d = hurt ? '#ccc' : shadeColor(m.color, -30)
  const px = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col
    ctx.fillRect(x * s, y * s, w * s, h * s)
  }

  const patterns: Record<string, () => void> = {
    gremlin: () => {
      px(5, 6, 6, 6, c)
      px(4, 4, 2, 3, c) // Left ear
      px(10, 4, 2, 3, c) // Right ear
      px(5, 8, 2, 2, '#fff') // Left eye white
      px(9, 8, 2, 2, '#fff') // Right eye white
      px(5, 9, 1, 1, '#000') // Left pupil
      px(9, 9, 1, 1, '#000') // Right pupil
    },
    golem: () => {
      px(3, 4, 10, 10, c)
      px(2, 6, 2, 6, c) // Left arm
      px(12, 6, 2, 6, c) // Right arm
      px(5, 6, 2, 2, '#ff0') // Left eye
      px(9, 6, 2, 2, '#ff0') // Right eye
      px(5, 8, 1, 4, d) // Left crack
      px(10, 9, 1, 3, d) // Right crack
    },
    phantom: () => {
      px(4, 3, 8, 8, c)
      px(4, 11, 2, 2, c)
      px(6, 12, 2, 1, c)
      px(8, 11, 2, 2, c)
      px(10, 12, 2, 1, c)
      px(5, 6, 2, 3, '#000') // Left eye
      px(9, 6, 2, 3, '#000') // Right eye
    },
    sprite: () => {
      px(6, 4, 4, 4, c)
      px(5, 5, 1, 2, c)
      px(10, 5, 1, 2, c)
      px(4, 8, 8, 4, c)
      px(7, 5, 2, 1, '#fff') // Eyes
      px(6, 10, 4, 1, d) // Mouth
    },
    crawler: () => {
      px(5, 6, 6, 4, c)
      px(3, 8, 2, 1, c) // Left leg
      px(11, 8, 2, 1, c) // Right leg
      px(4, 10, 1, 3, c)
      px(11, 10, 1, 3, c)
      px(6, 7, 1, 1, '#f00') // Eyes
      px(9, 7, 1, 1, '#f00')
      px(7, 8, 2, 1, '#f00') // Mouth
    },
    wraith: () => {
      px(5, 3, 6, 10, c)
      px(4, 5, 1, 6, c)
      px(11, 5, 1, 6, c)
      px(6, 6, 2, 2, '#000') // Eyes
      px(8, 6, 2, 2, '#000')
      px(7, 10, 2, 2, d) // Mouth
    },
    blob: () => {
      px(4, 7, 8, 6, c)
      px(3, 8, 10, 4, c)
      px(5, 6, 6, 2, c)
      px(6, 9, 1, 2, '#fff') // Eyes
      px(9, 9, 1, 2, '#fff')
      px(6, 10, 1, 1, '#000') // Pupils
      px(9, 10, 1, 1, '#000')
    },
    specter: () => {
      px(4, 2, 8, 6, c)
      px(3, 4, 10, 8, c)
      px(5, 12, 2, 2, c)
      px(9, 12, 2, 2, c)
      px(5, 5, 2, 3, '#000') // Eyes
      px(9, 5, 2, 3, '#000')
      px(6, 6, 1, 1, '#f0f') // Glowing dots
      px(10, 6, 1, 1, '#f0f')
    }
  }

  const drawPattern = patterns[m.pattern] || patterns.blob
  drawPattern()
}

function shadeColor(col: string, pct: number): string {
  const n = parseInt(col.replace('#', ''), 16)
  const a = Math.round(2.55 * pct)
  const R = Math.max(0, Math.min(255, (n >> 16) + a))
  const G = Math.max(0, Math.min(255, ((n >> 8) & 0xFF) + a))
  const B = Math.max(0, Math.min(255, (n & 0xFF) + a))
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}
