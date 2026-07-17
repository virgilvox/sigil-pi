<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useGameCatalog } from '@/composables/useGameCatalog'
import { useCircularLayout } from '@/composables/useCircularLayout'
import CircularViewport from './CircularViewport.vue'

// ═══════════════════════════════════════════════════════════════════
// APP SWITCHER — the stylized radial launcher shown on two-finger swipe-up.
// Fans the whole catalog (baked + drop-in) out around a control hub. Replaces
// the old plain OverlayMenu; opened/closed via the same globalStore flags.
// ═══════════════════════════════════════════════════════════════════

const router = useRouter()
const route = useRoute()
const globalStore = useGlobalStore()
const { games, refresh } = useGameCatalog()
const { polarToCartesian } = useCircularLayout(720)

// The currently-running app, derived from the route so it works for every game
// (not all game components set globalStore.currentGame).
const currentId = computed(() =>
  route.name === 'dropin' ? String(route.params.id || '') : String(route.name || '')
)

const focused = ref<string | null>(null)
const showSettings = ref(false)
const ready = ref(false)

const open = computed(() => globalStore.overlayMenuOpen)

// Re-scan drop-ins each time the switcher opens so freshly dropped games show up.
watch(open, async (isOpen) => {
  if (isOpen) {
    ready.value = false
    showSettings.value = false
    void refresh()
    await nextTick()
    requestAnimationFrame(() => { ready.value = true })
  } else {
    focused.value = null
  }
})

// Split the catalog across up to two rings so many apps stay legible.
const nodes = computed(() => {
  const list = games.value
  const total = list.length
  const twoRing = total > 8
  const outerCount = twoRing ? Math.ceil(total / 2) : total
  const outerR = 250
  const innerR = 150

  return list.map((g, index) => {
    const isInner = index >= outerCount
    const ringCount = isInner ? total - outerCount : outerCount
    const ringIndex = isInner ? index - outerCount : index
    const radius = isInner ? innerR : outerR
    // Offset inner ring so its nodes sit between the outer ones.
    const offset = isInner ? Math.PI / Math.max(ringCount, 1) : 0
    const angle = -Math.PI / 2 + offset + (ringIndex / Math.max(ringCount, 1)) * Math.PI * 2
    const pos = polarToCartesian(angle, radius)
    return { ...g, x: pos.x, y: pos.y, index, isInner }
  })
})

const focusedGame = computed(() => games.value.find(g => g.id === focused.value) || null)

function launch(route: string): void {
  globalStore.closeOverlayMenu()
  router.push(route)
}

function goHome(): void {
  globalStore.closeOverlayMenu()
  router.push('/')
}

function resume(): void {
  globalStore.closeOverlayMenu()
}
</script>

<template>
  <Transition name="switcher">
    <div v-if="open" class="switcher-root">
      <div class="switcher-backdrop" @click="resume"></div>

      <CircularViewport>
        <div class="switcher" :class="{ ready }">
          <!-- ambient rings -->
          <svg class="rings" viewBox="0 0 720 720">
            <circle cx="360" cy="360" r="150" fill="none" stroke="rgba(212,208,196,0.10)" />
            <circle cx="360" cy="360" r="250" fill="none" stroke="rgba(212,208,196,0.06)" />
            <circle cx="360" cy="360" r="330" fill="none" stroke="rgba(212,208,196,0.04)" />
          </svg>

          <!-- app nodes -->
          <button
            v-for="node in nodes"
            :key="node.id"
            class="node"
            :class="{ inner: node.isInner, current: node.id === currentId }"
            :style="{
              left: `${node.x}px`,
              top: `${node.y}px`,
              '--c': node.color,
              '--i': node.index,
              '--tx': `${360 - node.x}px`,
              '--ty': `${360 - node.y}px`
            }"
            @click="launch(node.route)"
            @pointerenter="focused = node.id"
            @pointerleave="focused === node.id && (focused = null)"
          >
            <span class="node-dot"></span>
            <span class="node-label">{{ node.name }}</span>
            <span v-if="node.source === 'dropin'" class="node-badge">◇</span>
          </button>

          <!-- center hub -->
          <div class="hub">
            <template v-if="!showSettings">
              <div class="hub-title">{{ focusedGame ? focusedGame.name : 'SELECT APP' }}</div>
              <div class="hub-sub">
                {{ focusedGame ? focusedGame.description : `${nodes.length} APPS` }}
              </div>
              <div class="hub-controls">
                <button class="ctl" title="Home" @click="goHome">⌂</button>
                <button class="ctl" title="Mute" @click="globalStore.toggleMute()">
                  {{ globalStore.muted ? '🔇' : '🔊' }}
                </button>
                <button class="ctl" title="CRT" @click="globalStore.toggleCRT()">📺</button>
                <button class="ctl" title="Settings" @click="showSettings = true">⚙</button>
              </div>
              <button class="ctl resume" title="Resume" @click="resume">▶ RESUME</button>
            </template>

            <template v-else>
              <div class="hub-title">DISPLAY</div>
              <label class="setting">
                <span>FIT {{ Math.round(globalStore.gameScale * 100) }}%</span>
                <input
                  type="range" min="0.7" max="1" step="0.01"
                  :value="globalStore.gameScale"
                  @input="globalStore.setGameScale(Number(($event.target as HTMLInputElement).value))"
                />
              </label>
              <label class="setting">
                <span>DIAMETER</span>
                <input
                  type="number" min="0" step="10"
                  :value="globalStore.diameterOverride"
                  placeholder="auto"
                  @change="globalStore.setDiameterOverride(Number(($event.target as HTMLInputElement).value))"
                />
                <span class="hint">0 = auto</span>
              </label>
              <button class="ctl resume" @click="showSettings = false">← BACK</button>
            </template>
          </div>
        </div>
      </CircularViewport>
    </div>
  </Transition>
</template>

<style scoped>
.switcher-root {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.switcher-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(3, 3, 6, 0.82);
  backdrop-filter: blur(2px);
}

.switcher {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at center, rgba(12,12,20,0.9) 0%, rgba(4,4,8,0.95) 70%);
}

.rings {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  animation: drift 40s linear infinite;
}

@keyframes drift { to { transform: rotate(360deg); } }

/* App nodes ------------------------------------------------------------ */
.node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 92px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Courier New', monospace;

  /* entrance: start collapsed at the hub, fan out to final position */
  opacity: 0;
  transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.2);
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
  transition-delay: calc(var(--i) * 28ms);
}

.switcher.ready .node {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.node-dot {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(10, 10, 15, 0.85);
  border: 2px solid var(--c);
  box-shadow: 0 0 18px color-mix(in srgb, var(--c) 35%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.node.inner .node-dot { width: 50px; height: 50px; }

.node:hover .node-dot,
.node:active .node-dot {
  transform: scale(1.18);
  background: color-mix(in srgb, var(--c) 22%, rgba(10,10,15,0.9));
  box-shadow: 0 0 34px color-mix(in srgb, var(--c) 60%, transparent);
}

.node.current .node-dot {
  border-style: double;
  border-width: 4px;
  box-shadow: 0 0 26px color-mix(in srgb, var(--c) 70%, transparent);
}

.node-label {
  font-size: 9px;
  font-weight: bold;
  letter-spacing: 0.12em;
  color: var(--c);
  text-align: center;
  line-height: 1.1;
  text-shadow: 0 0 8px color-mix(in srgb, var(--c) 40%, transparent);
}

.node.inner .node-label { font-size: 8px; }

.node-badge {
  position: absolute;
  top: -2px;
  right: 12px;
  font-size: 9px;
  color: var(--c);
  opacity: 0.8;
}

/* Center hub ----------------------------------------------------------- */
.hub {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 240px;
  min-height: 240px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 20px;
  background: radial-gradient(circle at center, rgba(14,14,22,0.95) 0%, rgba(6,6,10,0.6) 75%, transparent 100%);
  opacity: 0;
  transition: opacity 0.4s ease 0.15s;
}

.switcher.ready .hub { opacity: 1; }

.hub-title {
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 0.25em;
  color: #d4d0c4;
  text-shadow: 0 0 20px rgba(212,208,196,0.3);
}

.hub-sub {
  font-size: 9px;
  letter-spacing: 0.28em;
  color: rgba(212,208,196,0.45);
  text-transform: uppercase;
}

.hub-controls {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.ctl {
  background: transparent;
  border: 1px solid rgba(212,208,196,0.28);
  color: rgba(212,208,196,0.85);
  font-family: 'Courier New', monospace;
  font-size: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
}

.ctl:hover, .ctl:active {
  background: rgba(212,208,196,0.12);
  border-color: rgba(212,208,196,0.55);
}

.ctl.resume {
  width: auto;
  height: auto;
  border-radius: 20px;
  padding: 8px 22px;
  font-size: 11px;
  letter-spacing: 0.2em;
  margin-top: 4px;
  background: #d4d0c4;
  color: #06060a;
  border-color: #d4d0c4;
}

/* Settings ------------------------------------------------------------- */
.setting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  letter-spacing: 0.2em;
  color: rgba(212,208,196,0.7);
}

.setting input[type="range"] { width: 150px; accent-color: #d4d0c4; }

.setting input[type="number"] {
  width: 90px;
  background: rgba(10,10,15,0.8);
  border: 1px solid rgba(212,208,196,0.3);
  color: #d4d0c4;
  font-family: 'Courier New', monospace;
  text-align: center;
  padding: 4px;
}

.setting .hint { font-size: 7px; color: rgba(212,208,196,0.35); }

/* Overlay transition --------------------------------------------------- */
.switcher-enter-active, .switcher-leave-active { transition: opacity 0.3s ease; }
.switcher-enter-from, .switcher-leave-to { opacity: 0; }
</style>
