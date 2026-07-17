<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useCircularLayout } from '@/composables/useCircularLayout'
import { useGameCatalog } from '@/composables/useGameCatalog'
import CircularViewport from './CircularViewport.vue'
import CRTOverlay from './CRTOverlay.vue'

const router = useRouter()
const globalStore = useGlobalStore()
const { polarToCartesian } = useCircularLayout(720)
const { games } = useGameCatalog()

const hoveredGame = ref<string | null>(null)

// Split the catalog across two rings, filling the outer ring first. Ring sizes
// scale with the total count so the home screen adapts as drop-in games appear.
const gamePositions = computed(() => {
  const list = games.value
  const total = list.length
  const outerRadius = 260
  const innerRadius = 140
  // Up to 6 on the outer ring; remainder goes inner. Keeps spacing readable.
  const outerCount = Math.min(total, Math.ceil(total / 2) + (total > 9 ? 1 : 0), 7)
  const innerCount = Math.max(total - outerCount, 0)

  return list.map((game, index) => {
    const isInner = index >= outerCount
    const radius = isInner ? innerRadius : outerRadius
    const ringIndex = isInner ? index - outerCount : index
    const ringCount = isInner ? Math.max(innerCount, 1) : Math.max(outerCount, 1)
    const offset = isInner ? Math.PI / ringCount : 0
    const angle = -Math.PI / 2 + offset + (ringIndex / ringCount) * Math.PI * 2

    const pos = polarToCartesian(angle, radius)
    return { ...game, x: pos.x, y: pos.y, angle, isInner }
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
