<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useGameCatalog } from '@/composables/useGameCatalog'
import { useSwitcherLayout } from '@/composables/useSwitcherLayout'
import { CONTROL_ICONS } from '@/games/appIcons'
import type { GameEntry } from '@/types'
import CircularViewport from './CircularViewport.vue'
import AppGlyph from './AppGlyph.vue'

// ═══════════════════════════════════════════════════════════════════
// APP SWITCHER — stylized radial launcher shown on two-finger swipe-up / handle.
// Adaptive rings (shared with the home menu), glyph discs with depth, an
// unmistakable "current app" state, counter-rotating ambient rings, and paging.
// ═══════════════════════════════════════════════════════════════════

const router = useRouter()
const route = useRoute()
const globalStore = useGlobalStore()
const { games, refresh } = useGameCatalog()

const focused = ref<string | null>(null)
const showSettings = ref(false)
const ready = ref(false)
const page = ref(0)

const open = computed(() => globalStore.overlayMenuOpen)
const { placed, pageCount } = useSwitcherLayout(games, page, 720)

// Current app, derived from the route so it works for every game.
const currentId = computed(() =>
  route.name === 'dropin' ? String(route.params.id || '') : String(route.name || '')
)

const nodes = computed(() =>
  placed.value.map(n => ({
    ...(n.item as GameEntry),
    x: n.x, y: n.y, ring: n.ring, index: n.index
  }))
)

const focusedGame = computed(() => games.value.find(g => g.id === focused.value) || null)

function vibrate(ms: number): void {
  try { navigator.vibrate?.(ms) } catch { /* unsupported */ }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    ready.value = false
    showSettings.value = false
    page.value = 0
    focused.value = null
    void refresh()
    await nextTick()
    requestAnimationFrame(() => { ready.value = true })
  } else {
    focused.value = null
  }
})

function launch(node: { route: string }): void {
  vibrate(12)
  globalStore.closeOverlayMenu()
  router.push(node.route)
}
function goHome(): void {
  vibrate(8)
  globalStore.closeOverlayMenu()
  router.push('/')
}
function resume(): void {
  // Collapse the wheel back into the hub, then close.
  vibrate(8)
  ready.value = false
  setTimeout(() => globalStore.closeOverlayMenu(), 170)
}
function toggleMute(): void { vibrate(8); globalStore.toggleMute() }
function toggleCRT(): void { vibrate(8); globalStore.toggleCRT() }
function goPage(p: number): void { page.value = p; ready.value = false; nextTick(() => requestAnimationFrame(() => (ready.value = true))) }
</script>

<template>
  <Transition name="switcher">
    <div v-if="open" class="switcher-root" :style="{ '--focus-c': focusedGame?.color ?? '#d4d0c4' }">
      <div class="switcher-backdrop" @click="resume"></div>

      <CircularViewport>
        <div class="switcher" :class="{ ready }">
          <!-- counter-rotating ambient rings -->
          <svg class="rings" viewBox="0 0 720 720">
            <g class="ring-slow">
              <circle cx="360" cy="360" r="138" fill="none" stroke="rgba(212,208,196,0.10)" />
              <circle cx="360" cy="360" r="292" fill="none" stroke="rgba(212,208,196,0.05)" />
            </g>
            <g class="ring-fast">
              <circle cx="360" cy="360" r="210" fill="none" stroke="rgba(212,208,196,0.07)" stroke-dasharray="2 10" />
              <circle cx="360" cy="360" r="340" fill="none" stroke="rgba(212,208,196,0.04)" />
            </g>
          </svg>

          <!-- app nodes -->
          <button
            v-for="node in nodes"
            :key="node.id"
            class="node"
            :class="[`ring-${node.ring}`, {
              current: node.id === currentId,
              dropin: node.source === 'dropin',
              dim: focused && focused !== node.id
            }]"
            :style="{
              left: `${node.x}px`, top: `${node.y}px`,
              '--c': node.color, '--i': node.index,
              '--tx': `${360 - node.x}px`, '--ty': `${360 - node.y}px`
            }"
            @click="launch(node)"
            @pointerenter="focused = node.id"
            @pointerdown="focused = node.id"
            @pointerleave="focused === node.id && (focused = null)"
          >
            <span class="node-disc">
              <AppGlyph class="node-glyph" :id="node.id" :name="node.name" :icon="node.icon" />
              <span v-if="node.source === 'dropin'" class="node-badge" title="Drop-in">◇</span>
              <span v-if="node.id === currentId" class="node-live">LIVE</span>
            </span>
            <span class="node-label">{{ node.name }}</span>
          </button>

          <!-- center hub -->
          <div class="hub">
            <template v-if="!showSettings">
              <div class="hub-eyebrow">
                {{ focusedGame ? (focusedGame.source === 'dropin' ? 'DROP-IN' : 'BAKED') : 'SELECTOR' }}
              </div>
              <div class="hub-title">{{ focusedGame ? focusedGame.name : 'SELECT APP' }}</div>
              <div class="hub-sub">
                {{ focusedGame ? focusedGame.description : `${games.length} APPS${pageCount > 1 ? ` · ${page + 1}/${pageCount}` : ''}` }}
              </div>
              <div class="hub-controls">
                <button class="ctl" title="Home" @click="goHome">
                  <svg viewBox="0 0 100 100" class="ico"><g v-html="CONTROL_ICONS.home"></g></svg>
                </button>
                <button class="ctl" :class="{ on: globalStore.muted }" title="Mute" @click="toggleMute">
                  <svg viewBox="0 0 100 100" class="ico"><g v-html="globalStore.muted ? CONTROL_ICONS.soundOff : CONTROL_ICONS.soundOn"></g></svg>
                </button>
                <button class="ctl" :class="{ on: globalStore.crtEnabled }" title="CRT" @click="toggleCRT">
                  <svg viewBox="0 0 100 100" class="ico"><g v-html="CONTROL_ICONS.crt"></g></svg>
                </button>
                <button class="ctl" title="Settings" @click="showSettings = true">
                  <svg viewBox="0 0 100 100" class="ico"><g v-html="CONTROL_ICONS.gear"></g></svg>
                </button>
              </div>
              <button class="ctl resume" title="Resume" @click="resume">
                <svg viewBox="0 0 100 100" class="ico play"><g v-html="CONTROL_ICONS.play"></g></svg>
                RESUME
              </button>
            </template>

            <template v-else>
              <div class="hub-title">DISPLAY</div>
              <label class="setting">
                <span>FIT {{ Math.round(globalStore.gameScale * 100) }}%</span>
                <input type="range" min="0.7" max="1" step="0.01" :value="globalStore.gameScale"
                  @input="globalStore.setGameScale(Number(($event.target as HTMLInputElement).value))" />
              </label>
              <label class="setting">
                <span>DIAMETER</span>
                <input type="number" min="0" step="10" :value="globalStore.diameterOverride" placeholder="auto"
                  @change="globalStore.setDiameterOverride(Number(($event.target as HTMLInputElement).value))" />
                <span class="hint">0 = auto</span>
              </label>
              <button class="ctl resume" @click="showSettings = false">← BACK</button>
            </template>
          </div>

          <!-- pager -->
          <div v-if="pageCount > 1" class="pager">
            <button v-for="p in pageCount" :key="p" class="dot" :class="{ on: p - 1 === page }"
              @click="goPage(p - 1)"></button>
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
  background: rgba(3, 3, 6, 0.84);
  backdrop-filter: blur(2px);
}
.switcher {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at center,
      color-mix(in srgb, var(--focus-c) 8%, rgba(12,12,20,0.92)) 0%,
      rgba(4,4,8,0.96) 68%);
  transition: background 0.5s ease;
}

.rings { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ring-slow, .ring-fast { transform-origin: 360px 360px; }
.ring-slow { animation: spin 64s linear infinite; }
.ring-fast { animation: spin 44s linear infinite reverse; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Nodes ---------------------------------------------------------------- */
.node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 94px;
  min-height: 64px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Courier New', monospace;

  /* entrance: collapse toward the hub, spring out to position */
  opacity: 0;
  transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.2);
  transition: transform 0.52s cubic-bezier(0.16, 1.16, 0.3, 1), opacity 0.4s ease;
  transition-delay: calc(var(--i) * 26ms);
}
.switcher.ready .node { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.node.dim { opacity: 0.4 !important; }

.node-disc {
  position: relative;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c);
  border: 2px solid var(--c);
  background:
    radial-gradient(circle at 38% 32%,
      color-mix(in srgb, var(--c) 26%, rgba(14,14,20,0.9)) 0%,
      rgba(8,8,12,0.92) 70%);
  box-shadow:
    0 0 18px color-mix(in srgb, var(--c) 35%, transparent),
    inset 0 2px 10px rgba(0,0,0,0.6),
    inset 0 0 14px color-mix(in srgb, var(--c) 12%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.ring-1 .node-disc { width: 58px; height: 58px; }
.ring-2 .node-disc { width: 50px; height: 50px; }

.node:hover .node-disc,
.node:active .node-disc {
  transform: scale(1.16);
  box-shadow:
    0 0 34px color-mix(in srgb, var(--c) 60%, transparent),
    inset 0 2px 10px rgba(0,0,0,0.5);
}
.node:active .node-disc { animation: tap-pop 0.28s ease; }
@keyframes tap-pop { 0% { transform: scale(0.9); } 60% { transform: scale(1.2); } 100% { transform: scale(1.16); } }

.node-glyph {
  font-size: 22px;
  font-weight: bold;
  color: var(--c);
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 50%, transparent));
  line-height: 1;
}
.ring-1 .node-glyph { font-size: 19px; }
.ring-2 .node-glyph { font-size: 16px; }

.node-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  font-size: 11px;
  color: var(--c);
  opacity: 0.85;
}
.node-live {
  position: absolute;
  bottom: -7px;
  font-size: 7px;
  letter-spacing: 0.15em;
  padding: 1px 5px;
  border-radius: 6px;
  background: var(--c);
  color: #06060a;
  font-weight: bold;
}

.node.current .node-disc {
  border-width: 3px;
  background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--c) 45%, rgba(14,14,20,0.9)) 0%, rgba(8,8,12,0.9) 70%);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--c) 22%, transparent),
    0 0 30px color-mix(in srgb, var(--c) 70%, transparent);
  animation: current-pulse 2.4s ease-in-out infinite;
}
.node.current .node-glyph { color: #f4f1e8; }
@keyframes current-pulse {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 22%, transparent), 0 0 26px color-mix(in srgb, var(--c) 55%, transparent); }
  50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--c) 30%, transparent), 0 0 40px color-mix(in srgb, var(--c) 85%, transparent); }
}

.node-label {
  font-size: 9px;
  font-weight: bold;
  letter-spacing: 0.12em;
  color: var(--c);
  text-align: center;
  line-height: 1.1;
  text-shadow: 0 0 8px color-mix(in srgb, var(--c) 35%, transparent);
}
.ring-2 .node-label { font-size: 8px; }

/* Hub ------------------------------------------------------------------ */
.hub {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 232px;
  min-height: 232px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 20px;
  background: radial-gradient(circle at center, rgba(14,14,22,0.96) 0%, rgba(6,6,10,0.55) 74%, transparent 100%);
  opacity: 0;
  transition: opacity 0.4s ease 0.14s;
}
.switcher.ready .hub { opacity: 1; }

.hub-eyebrow { font-size: 8px; letter-spacing: 0.4em; color: color-mix(in srgb, var(--focus-c) 70%, #8a8578); }
.hub-title { font-size: 15px; font-weight: bold; letter-spacing: 0.22em; color: #d4d0c4; text-shadow: 0 0 20px rgba(212,208,196,0.3); }
.hub-sub { font-size: 9px; letter-spacing: 0.24em; color: rgba(212,208,196,0.45); text-transform: uppercase; }
.hub-controls { display: flex; gap: 10px; margin-top: 4px; }

.ctl {
  background: transparent;
  border: 1px solid rgba(212,208,196,0.28);
  color: rgba(212,208,196,0.85);
  font-family: 'Courier New', monospace;
  font-size: 16px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
}
.ctl:hover, .ctl:active { background: rgba(212,208,196,0.12); border-color: rgba(212,208,196,0.55); }
.ctl.on { border-color: rgba(212,208,196,0.6); box-shadow: inset 0 0 10px rgba(212,208,196,0.15); }
.ctl.resume {
  width: auto; height: auto; border-radius: 20px; padding: 8px 22px;
  font-size: 11px; letter-spacing: 0.2em; margin-top: 4px; gap: 8px;
  background: #d4d0c4; color: #06060a; border-color: #d4d0c4;
}
.ico { width: 20px; height: 20px; overflow: visible; }
.ico g { fill: none; stroke: currentColor; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
.ico.play { width: 13px; height: 13px; }
.ico.play g { fill: currentColor; stroke: currentColor; }

/* Settings ------------------------------------------------------------- */
.setting { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 9px; letter-spacing: 0.2em; color: rgba(212,208,196,0.7); }
.setting input[type="range"] { width: 150px; accent-color: #d4d0c4; }
.setting input[type="number"] { width: 90px; background: rgba(10,10,15,0.8); border: 1px solid rgba(212,208,196,0.3); color: #d4d0c4; font-family: 'Courier New', monospace; text-align: center; padding: 4px; }
.setting .hint { font-size: 7px; color: rgba(212,208,196,0.35); }

/* Pager ---------------------------------------------------------------- */
.pager { position: absolute; left: 50%; bottom: 44px; transform: translateX(-50%); display: flex; gap: 8px; }
.dot {
  width: 22px; height: 22px; padding: 0; border: none; background: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.dot::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: rgba(212,208,196,0.3); transition: all 0.2s; }
.dot.on::before { background: #d4d0c4; box-shadow: 0 0 8px rgba(212,208,196,0.6); transform: scale(1.3); }

@media (prefers-reduced-motion: reduce) {
  .ring-slow, .ring-fast, .node.current .node-disc { animation: none; }
  .node { transition: opacity 0.3s ease; }
}

.switcher-enter-active, .switcher-leave-active { transition: opacity 0.3s ease; }
.switcher-enter-from, .switcher-leave-to { opacity: 0; }
</style>
