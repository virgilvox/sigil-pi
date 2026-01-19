import type { Spell, OrbColor, GameColors } from '@/types'

export const SPELLS: Spell[] = [
  { id: 'bolt', name: 'BOLT', cost: 1, type: 'projectile', speed: 9, damage: 12 },
  { id: 'lance', name: 'LANCE', cost: 2, type: 'projectile', speed: 5, damage: 25 },
  { id: 'ward', name: 'WARD', cost: 2, type: 'ward', duration: 3 },
  { id: 'siphon', name: 'SIPHON', cost: 1, type: 'beam', steal: 2 }
]

export const ORB_COLORS: OrbColor[] = [
  { core: '#fff8e0', mid: '#ffd700', outer: '#ff8c00', glow: 'rgba(255, 215, 0, 0.6)' },
  { core: '#e0fff8', mid: '#00ffd0', outer: '#00a080', glow: 'rgba(0, 255, 208, 0.6)' },
  { core: '#ffe0f8', mid: '#ff00d0', outer: '#a00080', glow: 'rgba(255, 0, 208, 0.6)' },
  { core: '#e0e8ff', mid: '#6080ff', outer: '#3040a0', glow: 'rgba(96, 128, 255, 0.6)' },
  { core: '#fff0e0', mid: '#ff8040', outer: '#c04020', glow: 'rgba(255, 128, 64, 0.6)' },
  { core: '#e0ffe0', mid: '#40ff40', outer: '#20a020', glow: 'rgba(64, 255, 64, 0.6)' },
  { core: '#ffe0e0', mid: '#ff4040', outer: '#a02020', glow: 'rgba(255, 64, 64, 0.6)' },
  { core: '#f0e0ff', mid: '#a040ff', outer: '#6020a0', glow: 'rgba(160, 64, 255, 0.6)' }
]

export const PLAYER_COLORS: Record<number, GameColors> = {
  0: {
    pri: '#e85a3c',
    sec: '#ff9872',
    glow: 'rgba(232, 90, 60, 0.6)',
    dim: 'rgba(232, 90, 60, 0.12)',
    name: 'EMBER'
  },
  1: {
    pri: '#3c8ee8',
    sec: '#72b8ff',
    glow: 'rgba(60, 142, 232, 0.6)',
    dim: 'rgba(60, 142, 232, 0.12)',
    name: 'FROST'
  }
}

export const COLORS = {
  bg: '#06060a',
  energy: '#d4d0c4',
  glow: 'rgba(212, 208, 196, 0.8)',
  ring: '#2a2a32',
  rune: '#6a5c8a'
}

// Ring radii
export const RADII = {
  eye: 40,
  inner: 95,
  ring: 155,
  ringW: 24,
  spell: 225,
  cast: 275,
  life: 330,
  lifeW: 12,
  outer: 355
}

export const SIZE = 720
export const CENTER = SIZE / 2
