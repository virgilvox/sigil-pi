<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useGameCatalog } from '@/composables/useGameCatalog'
import { useSwitcherLayout } from '@/composables/useSwitcherLayout'
import type { GameEntry } from '@/types'
import CircularViewport from './CircularViewport.vue'
import CRTOverlay from './CRTOverlay.vue'
import AppGlyph from './AppGlyph.vue'

// Home launcher. Shares the adaptive radial layout + glyphs with AppSwitcher so
// the two surfaces never drift.
const router = useRouter()
const globalStore = useGlobalStore()
const { games } = useGameCatalog()

const hovered = ref<string | null>(null)
const page = ref(0)
const { placed, pageCount } = useSwitcherLayout(games, page, 720)

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
      <div class="menu-bg"></div>

      <div class="center-content">
        <div class="title">SIGIL PI</div>
        <div class="subtitle">GAME HUB</div>
      </div>

      <button
        v-for="node in placed"
        :key="(node.item as GameEntry).id"
        class="game-option"
        :class="[`ring-${node.ring}`]"
        :style="{
          left: `${node.x}px`, top: `${node.y}px`,
          '--game-color': (node.item as GameEntry).color, '--i': node.index
        }"
        @click="navigateTo((node.item as GameEntry).route)"
        @mouseenter="hovered = (node.item as GameEntry).id"
        @mouseleave="hovered = null"
      >
        <span class="game-circle" :class="{ hovered: hovered === (node.item as GameEntry).id }">
          <AppGlyph
            class="game-glyph"
            :id="(node.item as GameEntry).id"
            :name="(node.item as GameEntry).name"
            :icon="(node.item as GameEntry).icon"
          />
          <span v-if="(node.item as GameEntry).source === 'dropin'" class="game-badge">◇</span>
        </span>
        <span class="game-name">{{ (node.item as GameEntry).name }}</span>
      </button>

      <svg class="deco-rings" viewBox="0 0 720 720">
        <circle cx="360" cy="360" r="138" fill="none" stroke="rgba(212,208,196,0.08)" />
        <circle cx="360" cy="360" r="210" fill="none" stroke="rgba(212,208,196,0.06)" />
        <circle cx="360" cy="360" r="292" fill="none" stroke="rgba(212,208,196,0.04)" />
      </svg>

      <div v-if="pageCount > 1" class="pager">
        <button v-for="p in pageCount" :key="p" class="dot" :class="{ on: p - 1 === page }"
          @click="page = p - 1"></button>
      </div>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.radial-menu {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, #0a0a10 0%, #06060a 60%, #030306 100%);
  border-radius: 50%;
}
.center-content { position: absolute; text-align: center; z-index: 10; }
.title { font-size: 24px; font-weight: bold; letter-spacing: 0.3em; color: #d4d0c4; text-shadow: 0 0 30px rgba(212,208,196,0.3); margin-bottom: 4px; }
.subtitle { font-size: 9px; letter-spacing: 0.4em; color: rgba(212,208,196,0.4); }
.deco-rings { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

.game-option {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 20;
  font-family: 'Courier New', monospace;
  opacity: 0;
  animation: pop 0.45s cubic-bezier(0.16, 1.16, 0.3, 1) forwards;
  animation-delay: calc(var(--i) * 30ms);
}
@keyframes pop { from { opacity: 0; transform: translate(-50%, -50%) scale(0.4); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

.game-circle {
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--game-color);
  border: 2px solid var(--game-color);
  background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--game-color) 24%, rgba(12,12,18,0.9)) 0%, rgba(8,8,12,0.9) 70%);
  box-shadow: 0 0 20px color-mix(in srgb, var(--game-color) 30%, transparent), inset 0 2px 10px rgba(0,0,0,0.55);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.ring-1 .game-circle { width: 64px; height: 64px; }
.ring-2 .game-circle { width: 54px; height: 54px; }
.game-circle:hover, .game-circle.hovered {
  transform: scale(1.15);
  box-shadow: 0 0 42px color-mix(in srgb, var(--game-color) 55%, transparent), inset 0 2px 10px rgba(0,0,0,0.5);
}
.game-glyph { font-size: 24px; font-weight: bold; color: var(--game-color); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--game-color) 45%, transparent)); }
.ring-1 .game-glyph { font-size: 20px; }
.ring-2 .game-glyph { font-size: 17px; }
.game-badge { position: absolute; top: -3px; right: -3px; font-size: 12px; color: var(--game-color); }
.game-name { font-size: 9px; font-weight: bold; letter-spacing: 0.1em; color: var(--game-color); text-align: center; text-shadow: 0 0 8px color-mix(in srgb, var(--game-color) 35%, transparent); }
.ring-2 .game-name { font-size: 8px; }

.pager { position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%); display: flex; gap: 8px; }
.dot { width: 22px; height: 22px; padding: 0; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.dot::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: rgba(212,208,196,0.3); transition: all 0.2s; }
.dot.on::before { background: #d4d0c4; box-shadow: 0 0 8px rgba(212,208,196,0.6); transform: scale(1.3); }
</style>
