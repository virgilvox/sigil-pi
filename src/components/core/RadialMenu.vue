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
    <div class="radial-menu" :style="{ '--focus-c': (games.find(g => g.id === hovered)?.color) ?? '#8a7cc8' }">
      <div class="menu-bg"></div>
      <!-- colorful spectrum aura tying the ring of apps together -->
      <div class="aura"></div>
      <div class="aura aura2"></div>

      <svg class="deco-rings" viewBox="0 0 720 720">
        <circle cx="360" cy="360" r="138" fill="none" stroke="rgba(180,124,255,0.10)" />
        <circle cx="360" cy="360" r="210" fill="none" stroke="rgba(92,155,255,0.08)" />
        <circle cx="360" cy="360" r="292" fill="none" stroke="rgba(255,127,208,0.06)" />
      </svg>

      <div class="center-content">
        <div class="mark">⌬</div>
        <div class="title">SIGIL PI</div>
        <div class="subtitle">GAME HUB</div>
      </div>

      <button
        v-for="node in placed"
        :key="(node.item as GameEntry).id"
        class="game-option"
        :class="[`ring-${node.ring}`, { faded: hovered && hovered !== (node.item as GameEntry).id }]"
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
  background: radial-gradient(circle at 50% 42%, #14102a 0%, #0c0a1a 46%, #070510 100%);
  border-radius: 50%;
}
/* Spectrum aura — a slowly rotating conic wheel of the app hues, sitting behind
   the node ring so the whole selector glows with color instead of black. */
.aura {
  position: absolute;
  left: 50%; top: 50%;
  width: 620px; height: 620px;
  margin: -310px 0 0 -310px;
  border-radius: 50%;
  background: conic-gradient(from 0deg,
    #ff6b5c, #ffb347, #ffe14c, #5fe08a, #4cc7c0,
    #3ad6e6, #5c9bff, #b47cff, #ff5ca8, #ff6b5c);
  filter: blur(58px);
  opacity: 0.22;
  animation: aura-spin 48s linear infinite;
  pointer-events: none;
}
.aura2 {
  width: 380px; height: 380px; margin: -190px 0 0 -190px;
  opacity: 0.16; filter: blur(46px);
  animation: aura-spin 66s linear infinite reverse;
}
@keyframes aura-spin { to { transform: rotate(360deg); } }

.deco-rings { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

.center-content {
  position: absolute; text-align: center; z-index: 10;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
}
.mark {
  font-size: 30px; line-height: 1;
  color: #e7deff;
  text-shadow: 0 0 22px rgba(180,124,255,0.8), 0 0 40px rgba(92,155,255,0.4);
  animation: mark-breathe 4.2s ease-in-out infinite;
}
@keyframes mark-breathe { 0%,100% { opacity: 0.75; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
.title {
  font-size: 25px; font-weight: bold; letter-spacing: 0.32em; text-indent: 0.32em;
  background: linear-gradient(100deg, #c8e6ff, #f4f1ea 40%, #ffd6f2 70%, #c9b8ff);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 20px rgba(180,124,255,0.35));
  margin-top: 4px;
}
.subtitle { font-size: 9px; letter-spacing: 0.42em; text-indent: 0.42em; color: rgba(200,190,235,0.5); }

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
  animation: pop 0.5s cubic-bezier(0.16, 1.16, 0.3, 1) forwards;
  animation-delay: calc(var(--i) * 32ms);
  transition: opacity 0.25s ease;
}
.game-option.faded { opacity: 0.45; }
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
  border: 2px solid color-mix(in srgb, var(--game-color) 78%, transparent);
  background:
    radial-gradient(circle at 36% 28%,
      color-mix(in srgb, var(--game-color) 40%, rgba(18,16,32,0.92)) 0%,
      color-mix(in srgb, var(--game-color) 12%, rgba(10,8,20,0.94)) 55%,
      rgba(8,6,16,0.96) 100%);
  box-shadow:
    0 0 22px color-mix(in srgb, var(--game-color) 42%, transparent),
    inset 0 2px 12px rgba(0,0,0,0.5),
    inset 0 0 16px color-mix(in srgb, var(--game-color) 16%, transparent);
  transition: transform 0.25s cubic-bezier(0.16,1.16,0.3,1), box-shadow 0.25s ease;
}
.ring-1 .game-circle { width: 64px; height: 64px; }
.ring-2 .game-circle { width: 54px; height: 54px; }
.game-circle::after {
  /* top sheen */
  content: ''; position: absolute; inset: 3px; border-radius: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.16), transparent 42%);
  pointer-events: none;
}
.game-circle:hover, .game-circle.hovered {
  transform: scale(1.18);
  box-shadow:
    0 0 46px color-mix(in srgb, var(--game-color) 68%, transparent),
    inset 0 2px 12px rgba(0,0,0,0.45),
    inset 0 0 20px color-mix(in srgb, var(--game-color) 28%, transparent);
}
.game-glyph { width: 100%; height: 100%; color: var(--game-color); filter: drop-shadow(0 0 8px color-mix(in srgb, var(--game-color) 55%, transparent)); }
.game-badge { position: absolute; top: -3px; right: -3px; font-size: 12px; color: var(--game-color); }
.game-name {
  font-size: 9px; font-weight: bold; letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--game-color) 82%, #f4f1ea);
  text-align: center; text-shadow: 0 0 10px color-mix(in srgb, var(--game-color) 45%, transparent);
}
.ring-2 .game-name { font-size: 8px; }

.pager { position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%); display: flex; gap: 8px; }
.dot { width: 22px; height: 22px; padding: 0; border: none; background: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.dot::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: rgba(200,190,235,0.32); transition: all 0.2s; }
.dot.on::before { background: #d6c8ff; box-shadow: 0 0 10px rgba(180,124,255,0.7); transform: scale(1.35); }

@media (prefers-reduced-motion: reduce) {
  .aura, .aura2, .mark { animation: none; }
}
</style>
