<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useCircularLayout } from '@/composables/useCircularLayout'
import CircularViewport from './CircularViewport.vue'
import CRTOverlay from './CRTOverlay.vue'

const router = useRouter()
const globalStore = useGlobalStore()
const { polarToCartesian, center } = useCircularLayout(720)

interface GameOption {
  id: string
  name: string
  route: string
  color: string
  description: string
}

const games: GameOption[] = [
  // Outer ring (5 games)
  { id: 'sigil-lite', name: 'SIGIL', route: '/sigil-lite', color: '#e85a3c', description: 'CIRCULAR DUEL' },
  { id: 'junk-mage', name: 'JUNK MAGE', route: '/junk-mage', color: '#4a9fff', description: 'ROGUELIKE' },
  { id: 'null-arcana', name: 'NULL ARCANA', route: '/null-arcana', color: '#00ff88', description: 'ORACLE' },
  { id: 'null-synth', name: 'NULL SYNTH', route: '/null-synth', color: '#ff00ff', description: 'SYNTHESIZER' },
  { id: 'carrom', name: 'CARROM', route: '/carrom', color: '#ffa500', description: 'BOARD GAME' },
  // Inner ring (4 games)
  { id: 'sigil-full', name: 'SIGIL+', route: '/sigil-full', color: '#d4d0c4', description: 'WITH AUDIO' },
  { id: 'prize-wheel', name: 'PRIZE WHEEL', route: '/prize-wheel', color: '#ffcc00', description: 'SPIN TO WIN' },
  { id: 'robot-face', name: 'ROBOT FACE', route: '/robot-face', color: '#00ffc8', description: 'VIRTUAL PET' },
  { id: 'sigil-engine', name: 'SIGIL ENGINE', route: '/sigil-engine', color: '#ffd700', description: 'RUNE PUZZLE' }
]

const hoveredGame = ref<string | null>(null)

const gamePositions = computed(() => {
  const outerRadius = 260
  const innerRadius = 140
  const outerCount = 5
  const innerCount = 4

  return games.map((game, index) => {
    let radius: number
    let angle: number
    let ringIndex: number

    if (index < outerCount) {
      // Outer ring: 5 games
      radius = outerRadius
      ringIndex = index
      angle = -Math.PI / 2 + (ringIndex / outerCount) * Math.PI * 2
    } else {
      // Inner ring: 4 games
      radius = innerRadius
      ringIndex = index - outerCount
      angle = -Math.PI / 2 + Math.PI / 4 + (ringIndex / innerCount) * Math.PI * 2
    }

    const pos = polarToCartesian(angle, radius)
    return {
      ...game,
      x: pos.x,
      y: pos.y,
      angle,
      isInner: index >= outerCount
    }
  })
})

function navigateTo(route: string): void {
  router.push(route)
}

onMounted(() => {
  globalStore.detectDisplaySize()
  globalStore.setCurrentGame(null)
})
</script>

<template>
  <CircularViewport>
    <div class="radial-menu">
      <!-- Background -->
      <div class="menu-bg"></div>

      <!-- Center title -->
      <div class="center-content">
        <div class="title">SIGIL PI</div>
        <div class="subtitle">GAME HUB</div>
      </div>

      <!-- Game options -->
      <div
        v-for="game in gamePositions"
        :key="game.id"
        class="game-option"
        :class="{ inner: game.isInner }"
        :style="{
          left: `${game.x}px`,
          top: `${game.y}px`,
          '--game-color': game.color
        }"
        @click="navigateTo(game.route)"
        @mouseenter="hoveredGame = game.id"
        @mouseleave="hoveredGame = null"
      >
        <div class="game-circle" :class="{ hovered: hoveredGame === game.id, inner: game.isInner }">
          <div class="game-name">{{ game.name }}</div>
        </div>
        <div class="game-description" :class="{ inner: game.isInner }">{{ game.description }}</div>
      </div>

      <!-- Decorative rings -->
      <svg class="deco-rings" viewBox="0 0 720 720">
        <circle cx="360" cy="360" r="100" fill="none" stroke="rgba(212, 208, 196, 0.1)" stroke-width="1" />
        <circle cx="360" cy="360" r="200" fill="none" stroke="rgba(212, 208, 196, 0.08)" stroke-width="1" />
        <circle cx="360" cy="360" r="300" fill="none" stroke="rgba(212, 208, 196, 0.05)" stroke-width="1" />
      </svg>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.radial-menu {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #0a0a10 0%, #06060a 60%, #030306 100%);
  border-radius: 50%;
}

.center-content {
  position: absolute;
  text-align: center;
  z-index: 10;
}

.title {
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 0.3em;
  color: #d4d0c4;
  text-shadow: 0 0 30px rgba(212, 208, 196, 0.3);
  margin-bottom: 4px;
}

.subtitle {
  font-size: 9px;
  letter-spacing: 0.4em;
  color: rgba(212, 208, 196, 0.4);
}

.deco-rings {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.game-option {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 20;
}

.game-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(10, 10, 15, 0.8);
  border: 2px solid var(--game-color);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px color-mix(in srgb, var(--game-color) 30%, transparent);
}

.game-circle.inner {
  width: 65px;
  height: 65px;
}

.game-circle:hover,
.game-circle.hovered {
  transform: scale(1.15);
  background: color-mix(in srgb, var(--game-color) 20%, rgba(10, 10, 15, 0.9));
  box-shadow: 0 0 40px color-mix(in srgb, var(--game-color) 50%, transparent);
}

.game-name {
  font-size: 10px;
  font-weight: bold;
  letter-spacing: 0.1em;
  color: var(--game-color);
  text-align: center;
  padding: 6px;
  line-height: 1.2;
}

.game-circle.inner .game-name {
  font-size: 8px;
  padding: 4px;
}

.game-description {
  margin-top: 6px;
  font-size: 8px;
  letter-spacing: 0.15em;
  color: rgba(212, 208, 196, 0.5);
  text-transform: uppercase;
}

.game-description.inner {
  display: none;
}
</style>
