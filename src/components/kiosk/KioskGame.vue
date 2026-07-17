<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'

// KIOSK — a baked host for the self-contained hack.build round-display card
// carousel. Served as a first-party static asset (public/games/kiosk.html →
// /games/kiosk.html), trusted same-origin content in a non-sandboxed iframe.
// Fully offline: no external scripts, no network, fonts inlined as data URIs.
const globalStore = useGlobalStore()
onMounted(() => globalStore.setCurrentGame('kiosk'))
onUnmounted(() => globalStore.setCurrentGame(null))
</script>

<template>
  <CircularViewport>
    <div class="kiosk-host">
      <iframe
        src="/games/kiosk.html"
        class="kiosk-frame"
        title="KIOSK"
        allow="autoplay"
      ></iframe>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.kiosk-host { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: #141310; }
.kiosk-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #141310; }
</style>
