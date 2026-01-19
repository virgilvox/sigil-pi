<script setup lang="ts">
import { computed } from 'vue'
import { useGlobalStore } from '@/stores/global'

const globalStore = useGlobalStore()

const viewportClass = computed(() => ({
  'circular-viewport': true,
  'crt-enabled': globalStore.crtEnabled,
  'perf-mode': globalStore.performanceMode
}))
</script>

<template>
  <div :class="viewportClass">
    <slot />
  </div>
</template>

<style scoped>
.circular-viewport {
  position: relative;
  width: min(100vw, 100vh);
  height: min(100vw, 100vh);
  max-width: var(--display-size, 720px);
  max-height: var(--display-size, 720px);
  transform: scale(var(--game-scale, 0.92));
  border-radius: 50%;
  overflow: hidden;
  background: #06060a;
}
</style>
