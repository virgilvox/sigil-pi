import type { Component } from 'vue'
import type { GameEntry } from '@/types'

// ═══════════════════════════════════════════════════════════════════
// BAKED-IN GAME REGISTRY
//
// Single source of truth for games compiled into the Vue bundle. The router
// (src/router/index.ts), the home RadialMenu, and the in-game AppSwitcher all
// derive from this list, so adding a baked game means editing ONE place:
//
//   1. Drop the game component under src/components/<id>/
//   2. Add an entry below with a `component` loader
//
// For games that don't need a build (single-file HTML), use the drop-in folder
// instead — see server/scan.mjs and useGameCatalog().
// ═══════════════════════════════════════════════════════════════════

/** A baked entry pairs catalog metadata with a lazy Vue component loader. */
export interface BakedGame extends GameEntry {
  source: 'baked'
  component: () => Promise<{ default: Component }>
  /** Optional static props passed to the route component. */
  props?: Record<string, unknown>
}

export const BAKED_GAMES: BakedGame[] = [
  {
    id: 'sigil-lite',
    name: 'SIGIL',
    route: '/sigil-lite',
    color: '#e85a3c',
    description: 'CIRCULAR DUEL',
    source: 'baked',
    order: 10,
    component: () => import('@/components/sigil/SigilGame.vue'),
    props: { mode: 'lite' }
  },
  {
    id: 'junk-mage',
    name: 'JUNK MAGE',
    route: '/junk-mage',
    color: '#4a9fff',
    description: 'ROGUELIKE',
    source: 'baked',
    order: 20,
    component: () => import('@/components/junk-mage/JunkMageGame.vue')
  },
  {
    id: 'null-arcana',
    name: 'NULL ARCANA',
    route: '/null-arcana',
    color: '#00ff88',
    description: 'ORACLE',
    source: 'baked',
    order: 30,
    component: () => import('@/components/null-arcana/NullArcanaGame.vue')
  },
  {
    id: 'null-synth',
    name: 'NULL SYNTH',
    route: '/null-synth',
    color: '#ff00ff',
    description: 'SYNTHESIZER',
    source: 'baked',
    order: 40,
    icon: '♪',
    component: () => import('@/components/null-synth/NullSynthGame.vue')
  },
  {
    id: 'orrery',
    name: 'ORRERY',
    route: '/orrery',
    color: '#e8a13c',
    description: 'RADIAL SEQUENCER',
    source: 'baked',
    order: 45,
    icon: '☉',
    component: () => import('@/components/orrery/OrreryGame.vue')
  },
  {
    id: 'synth-lab',
    name: 'SYNTH LAB',
    route: '/synth-lab',
    color: '#4cc9a0',
    description: 'MULTI-MODE SYNTH',
    source: 'baked',
    order: 42,
    icon: '⌬',
    component: () => import('@/components/synth-lab/SynthLabGame.vue')
  },
  {
    id: 'composer',
    name: 'COMPOSER',
    route: '/composer',
    color: '#b47cff',
    description: 'GENERATIVE ENSEMBLE',
    source: 'baked',
    order: 44,
    icon: '✶',
    component: () => import('@/components/composer/ComposerGame.vue')
  },
  {
    id: 'carrom',
    name: 'CARROM',
    route: '/carrom',
    color: '#ffa500',
    description: 'BOARD GAME',
    source: 'baked',
    order: 50,
    component: () => import('@/components/carrom/CarromGame.vue')
  },
  {
    id: 'sigil-full',
    name: 'SIGIL+',
    route: '/sigil-full',
    color: '#d4d0c4',
    description: 'WITH AUDIO',
    source: 'baked',
    order: 60,
    component: () => import('@/components/sigil/SigilGame.vue'),
    props: { mode: 'full' }
  },
  {
    id: 'prize-wheel',
    name: 'PRIZE WHEEL',
    route: '/prize-wheel',
    color: '#ffcc00',
    description: 'SPIN TO WIN',
    source: 'baked',
    order: 70,
    component: () => import('@/components/prize-wheel/PrizeWheelGame.vue')
  },
  {
    id: 'robot-face',
    name: 'ROBOT FACE',
    route: '/robot-face',
    color: '#00ffc8',
    description: 'VIRTUAL PET',
    source: 'baked',
    order: 80,
    component: () => import('@/components/robot-face/RobotFaceGame.vue')
  },
  {
    id: 'grommet',
    name: 'GROMMET',
    route: '/grommet',
    color: '#8A7BF7',
    description: 'MUSE BRAINWAVES',
    source: 'baked',
    order: 85,
    icon: 'grommet',
    component: () => import('@/components/grommet/GrommetGame.vue')
  },
  {
    id: 'washer',
    name: 'WASHER',
    route: '/washer',
    color: '#2dd4bf',
    description: 'PAN/TILT LASER',
    source: 'baked',
    order: 88,
    icon: 'washer',
    component: () => import('@/components/washer/WasherGame.vue')
  },
  {
    id: 'videos',
    name: 'VIDEOS',
    route: '/videos',
    color: '#ff5ca8',
    description: 'VIDEO GALLERY',
    source: 'baked',
    order: 92,
    icon: 'videos',
    component: () => import('@/components/media/MediaViewerGame.vue'),
    props: { kind: 'videos' }
  },
  {
    id: 'images',
    name: 'IMAGES',
    route: '/images',
    color: '#3ad6e6',
    description: 'PHOTO GALLERY',
    source: 'baked',
    order: 94,
    icon: 'images',
    component: () => import('@/components/media/MediaViewerGame.vue'),
    props: { kind: 'images' }
  },
  {
    id: 'kiosk',
    name: 'KIOSK',
    route: '/kiosk',
    color: '#FF5A33',
    description: 'HACK.BUILD CARDS',
    source: 'baked',
    order: 96,
    icon: 'kiosk',
    component: () => import('@/components/kiosk/KioskGame.vue')
  },
  {
    id: 'sigil-engine',
    name: 'SIGIL ENGINE',
    route: '/sigil-engine',
    color: '#ffd700',
    description: 'RUNE PUZZLE',
    source: 'baked',
    order: 90,
    component: () => import('@/components/sigil-engine/SigilEngineGame.vue')
  }
]

/** Catalog view of the baked games (drops the component loader / props). */
export function bakedCatalog(): GameEntry[] {
  return BAKED_GAMES.map(({ component: _component, props: _props, ...entry }) => entry)
}
