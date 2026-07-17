<script setup lang="ts">
import { useGlobalStore } from '@/stores/global'

// Layered CRT (phosphor grid + scanlines + glass/vignette + animated chroma/
// bloom/noise), ported from the junk-mage reference. Styles live in the global
// styles/crt.css; heavy animated layers are dropped in performance mode.
const globalStore = useGlobalStore()
</script>

<template>
  <div
    v-if="globalStore.crtEnabled"
    class="crt-overlay"
    :class="{ 'perf-mode': globalStore.performanceMode }"
  >
    <!-- structural layers (cheap, always on) -->
    <div class="crt-phosphor"></div>
    <div class="crt-slotmask"></div>
    <div class="crt-scanlines"></div>
    <div class="crt-glass"></div>
    <div class="crt-vignette"></div>
    <div class="crt-bezel"></div>

    <!-- heavy/animated layers (omitted in performance mode) -->
    <template v-if="!globalStore.performanceMode">
      <div class="crt-interlace"></div>
      <div class="crt-beam"></div>
      <div class="crt-chroma-r"></div>
      <div class="crt-chroma-g"></div>
      <div class="crt-chroma-b"></div>
      <div class="crt-halation"></div>
      <div class="crt-bloom"></div>
      <div class="crt-noise"></div>
      <div class="crt-moire"></div>
      <div class="crt-hdistort"></div>
      <div class="crt-flicker"></div>
      <div class="crt-tint"></div>
    </template>
  </div>
</template>
