<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'

// PLATEN — a baked host for the self-contained round-LCD thermal print bench.
// Served as a first-party static asset (public/games/platen.html), trusted
// same-origin content in a NON-sandboxed iframe with allow="bluetooth" so it can
// reach a cat/GB01 or Phomemo/ESC-POS printer over Web Bluetooth (it silently
// auto-reconnects to a remembered printer). Fully offline — no external scripts
// or network; system monospace font, no downloads.
const globalStore = useGlobalStore()
onMounted(() => globalStore.setCurrentGame('platen'))
onUnmounted(() => globalStore.setCurrentGame(null))
</script>

<template>
  <CircularViewport>
    <div class="platen-host">
      <iframe
        src="/games/platen.html"
        class="platen-frame"
        title="PLATEN"
        allow="bluetooth"
      ></iframe>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.platen-host { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: #0a0a0d; }
.platen-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #0a0a0d; }
</style>
