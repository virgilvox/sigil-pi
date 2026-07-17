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
    <!--
      Fixed 720x720 logical stage, uniformly scaled to fill the round panel via
      --stage-scale (= displaySize / 720 * gameScale). Everything authored in the
      720 space — canvas games (100% of stage) and DOM-positioned menus (720px
      coords) alike — renders correctly on any display (4" ~720, 5" ~1080).
    -->
    <div class="viewport-stage">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.circular-viewport {
  position: relative;
  width: min(100vw, 100vh);
  height: min(100vw, 100vh);
  max-width: var(--display-size, 720px);
  max-height: var(--display-size, 720px);
  border-radius: 50%;
  overflow: hidden;
  background: #06060a;
}

.viewport-stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 720px;
  height: 720px;
  margin-left: -360px;
  margin-top: -360px;
  transform: scale(var(--stage-scale, 0.92));
  transform-origin: center;
}
</style>
