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
        aria-label="Open app switcher"
        @pointerdown.prevent="openSwitcher"
      >
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

/* Pill near the bottom of the round panel — the always-on switcher trigger (also
   works over iframe drop-in games). Raised off the very edge (hardest place to
   reach on round glass), enlarged, with a generous transparent hit-slop so a
   near-miss still opens it. */
.menu-handle {
  position: fixed;
  left: 50%;
  bottom: calc(50% - min(50vw, 50vh) * var(--game-scale, 0.92) + 30px);
  transform: translateX(-50%);
  z-index: 550;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 40px;
  padding: 14px 22px;   /* transparent hit-slop around the visible pill */
  box-sizing: content-box;
  border: none;
  background: none;
  cursor: pointer;
  touch-action: manipulation;
  opacity: 0.85;
  transition: opacity 0.2s ease, transform 0.15s ease;
}
/* the visible pill */
.menu-handle::before {
  content: '';
  position: absolute;
  width: 104px;
  height: 40px;
  border-radius: 20px;
  background: rgba(14, 12, 26, 0.72);
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(190, 178, 235, 0.28);
  backdrop-filter: blur(3px);
}

.menu-handle:active {
  opacity: 1;
  transform: translateX(-50%) translateY(-1px) scale(0.96);
}

.grip {
  position: relative;
  width: 46px;
  height: 5px;
  border-radius: 3px;
  background: rgba(216, 211, 228, 0.85);
  box-shadow: 0 0 10px rgba(190, 178, 235, 0.5);
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
