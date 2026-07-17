<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'

// WASHER — a baked host for the self-contained pan/tilt laser rig console. Served
// as a first-party static asset (public/games/washer.html → /games/washer.html).
// Like GROMMET, the iframe is trusted same-origin content and is NOT sandboxed,
// and declares allow="bluetooth; serial" so it can reach a rig over Web Bluetooth
// (Nordic UART) or Web Serial. Fully offline — no external scripts or fonts.
const globalStore = useGlobalStore()
onMounted(() => globalStore.setCurrentGame('washer'))
onUnmounted(() => globalStore.setCurrentGame(null))
</script>

<template>
  <CircularViewport>
    <div class="washer-host">
      <iframe
        src="/games/washer.html"
        class="washer-frame"
        title="WASHER"
        allow="bluetooth; serial; autoplay"
      ></iframe>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.washer-host { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: #06070a; }
.washer-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #06070a; }
</style>
