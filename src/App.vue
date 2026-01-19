<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useGestures } from '@/composables/useGestures'
import OverlayMenu from '@/components/core/OverlayMenu.vue'

const router = useRouter()
const globalStore = useGlobalStore()
const appRef = ref<HTMLElement | null>(null)

const { attach, detach, gestureState, setMenuOpen } = useGestures({
  edgeZone: 80,
  swipeThreshold: 50,
  onSwipeUp: () => {
    // Two-finger swipe up from bottom opens overlay menu
    if (!globalStore.overlayMenuOpen && globalStore.currentGame) {
      globalStore.openOverlayMenu()
    }
  },
  onSwipeDown: () => {
    // Two-finger swipe down closes overlay menu
    if (globalStore.overlayMenuOpen) {
      globalStore.closeOverlayMenu()
    }
  }
})

// Sync gesture composable's internal menu state with global store
watch(() => globalStore.overlayMenuOpen, (isOpen) => {
  setMenuOpen(isOpen)
})

onMounted(() => {
  globalStore.detectDisplaySize()
  window.addEventListener('resize', globalStore.detectDisplaySize)

  if (appRef.value) {
    attach(appRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', globalStore.detectDisplaySize)

  if (appRef.value) {
    detach(appRef.value)
  }
})
</script>

<template>
  <div ref="appRef" class="app">
    <RouterView />
    <OverlayMenu />
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
</style>
