<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'

// GROMMET — a baked host for the self-contained Muse brainwave companion. Served
// as a first-party static asset (public/games/grommet.html → /games/grommet.html
// in dev and prod). Unlike a sandboxed drop-in, this iframe is trusted
// same-origin content and is NOT sandboxed, and declares allow="bluetooth" so a
// real Muse headband can connect via Web Bluetooth; with no headband it runs its
// built-in demo. Fully offline (fonts inlined).
const globalStore = useGlobalStore()
onMounted(() => globalStore.setCurrentGame('grommet'))
onUnmounted(() => globalStore.setCurrentGame(null))
</script>

<template>
  <CircularViewport>
    <div class="grommet-host">
      <iframe
        src="/games/grommet.html"
        class="grommet-frame"
        title="GROMMET"
        allow="bluetooth; autoplay"
      ></iframe>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.grommet-host { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: #0a0812; }
.grommet-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #0a0812; }
</style>
