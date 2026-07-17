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
        @click="openSwitcher"
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

/* Small pill at the bottom center of the round panel — the reliable, always-on
   switcher trigger that also works over iframe drop-in games. */
.menu-handle {
  position: fixed;
  left: 50%;
  bottom: calc(50% - min(50vw, 50vh) * var(--game-scale, 0.92) + 6px);
  transform: translateX(-50%);
  z-index: 550;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 74px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 13px 13px 4px 4px;
  background: rgba(10, 10, 15, 0.55);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(212, 208, 196, 0.18);
  cursor: pointer;
  backdrop-filter: blur(3px);
  opacity: 0.55;
  transition: opacity 0.2s ease, transform 0.15s ease;
}

.menu-handle:hover,
.menu-handle:active {
  opacity: 0.95;
  transform: translateX(-50%) translateY(-1px);
}

.grip {
  width: 34px;
  height: 4px;
  border-radius: 2px;
  background: rgba(212, 208, 196, 0.7);
  box-shadow: 0 0 8px rgba(212, 208, 196, 0.35);
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
