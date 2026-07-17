<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import AppSwitcher from '@/components/core/AppSwitcher.vue'

const router = useRouter()
const globalStore = useGlobalStore()
const appRef = ref<HTMLElement | null>(null)

// The always-present bottom handle is the sole switcher trigger (the old
// two-finger swipe-up gesture was removed — it conflicted with multi-touch games
// like SIGIL and wasn't needed once the handle existed). Hidden on home (home is
// the launcher) and while the switcher is open.
const showHandle = computed(() =>
  !globalStore.overlayMenuOpen && router.currentRoute.value.name !== 'home'
)

function openSwitcher(): void {
  if (!globalStore.overlayMenuOpen) globalStore.openOverlayMenu()
}

// The handle opens the switcher on a DOUBLE tap (deliberate — a single stray tap,
// or a tap meant for app UI that grazes the handle, won't yank you out of a game).
// It sits in the margin below the stage so it doesn't overlap app controls.
const armed = ref(false)
let lastTap = 0
let armTimer: ReturnType<typeof setTimeout> | null = null
function onHandleTap(): void {
  const now = Date.now()
  if (now - lastTap < 450) {
    lastTap = 0
    armed.value = false
    if (armTimer) { clearTimeout(armTimer); armTimer = null }
    openSwitcher()
  } else {
    lastTap = now
    armed.value = true
    if (armTimer) clearTimeout(armTimer)
    armTimer = setTimeout(() => { armed.value = false; lastTap = 0 }, 500)
  }
}

// Keyboard shortcut for desktop testing only (no keyboard on the kiosk):
// m / Escape toggles the switcher.
function onKey(e: KeyboardEvent): void {
  if (e.key !== 'm' && e.key !== 'M' && e.key !== 'Escape') return
  if (router.currentRoute.value.name === 'home') return
  e.preventDefault()
  globalStore.overlayMenuOpen ? globalStore.closeOverlayMenu() : globalStore.openOverlayMenu()
}

onMounted(() => {
  globalStore.detectDisplaySize()
  window.addEventListener('resize', globalStore.detectDisplaySize)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('resize', globalStore.detectDisplaySize)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="appRef" class="app">
    <RouterView />

    <Transition name="handle-fade">
      <button
        v-if="showHandle"
        class="menu-handle"
        :class="{ armed }"
        aria-label="Double-tap to open app switcher"
        @pointerdown.prevent="onHandleTap"
      >
        <span v-if="armed" class="handle-hint">TAP AGAIN</span>
        <span class="grip"></span>
      </button>
    </Transition>

    <AppSwitcher />
  </div>
</template>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

/* Pill in the margin at the very bottom of the round panel — below the 720 stage
   so it never overlaps an app's own bottom controls. Double-tap to open (see
   onHandleTap); the first tap arms it and shows a hint. Kept short so it stays in
   the bezel margin. */
.menu-handle {
  position: fixed;
  left: 50%;
  bottom: calc(50% - min(50vw, 50vh) * var(--game-scale, 0.92) + 3px);
  transform: translateX(-50%);
  z-index: 550;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  width: 92px;
  height: 22px;
  padding: 4px 16px 0;
  box-sizing: content-box;
  border: none;
  border-radius: 13px 13px 3px 3px;
  background: rgba(14, 12, 26, 0.62);
  box-shadow: 0 -1px 10px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(190, 178, 235, 0.22);
  cursor: pointer;
  touch-action: manipulation;
  backdrop-filter: blur(3px);
  opacity: 0.6;
  transition: opacity 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease;
}
.menu-handle:active { opacity: 0.95; }
.menu-handle.armed {
  opacity: 1;
  box-shadow: 0 -1px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(190,178,235,0.5), 0 0 16px rgba(180,124,255,0.55);
}
.handle-hint {
  position: absolute;
  bottom: 30px;
  font-family: 'Courier New', monospace;
  font-size: 8px;
  letter-spacing: 0.2em;
  color: #d6c8ff;
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(180,124,255,0.6);
  pointer-events: none;
}
.grip {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: rgba(216, 211, 228, 0.8);
  box-shadow: 0 0 8px rgba(190, 178, 235, 0.4);
}

.handle-fade-enter-active,
.handle-fade-leave-active {
  transition: opacity 0.25s ease;
}

.handle-fade-enter-from,
.handle-fade-leave-to {
  opacity: 0;
}
</style>
