<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { useOrreryStore } from '@/stores/orrery'
import { useOrreryInput } from './useOrreryInput'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'
import SequencerCanvas from './SequencerCanvas.vue'
import OrreryTitleScreen from './OrreryTitleScreen.vue'
import OrreryPanel from './OrreryPanel.vue'

const globalStore = useGlobalStore()
const store = useOrreryStore()
const input = useOrreryInput()

const started = ref(false)
const showPanel = ref(false)
const surfaceRef = ref<HTMLElement | null>(null)
let alive = true                          // guards the async boot against unmount

const bar = computed(() => Math.floor(store.currentTick / 16) + 1)
const beat = computed(() => Math.floor((store.currentTick % 16) / 4) + 1)

async function start(): Promise<void> {
  try {
    await store.boot()
    if (!alive) { store.dispose(); return } // unmounted mid-boot → tear the engine back down
    started.value = true
    await nextTick()                        // wait for the surface to mount
    if (alive && surfaceRef.value) input.attach(surfaceRef.value)
  } catch (e) {
    console.error('[orrery] boot failed', e)
  }
}

onMounted(() => {
  globalStore.setCurrentGame('orrery')
})
onUnmounted(() => {
  alive = false
  input.detach()
  store.dispose()
  globalStore.setCurrentGame(null)
})
</script>

<template>
  <CircularViewport>
    <div class="orrery">
      <SequencerCanvas v-if="started" />

      <!-- pointer surface (receives all sequencing gestures) -->
      <div v-if="started" ref="surfaceRef" class="surface"></div>

      <!-- center hub readout (visual only; taps pass through to the surface) -->
      <div v-if="started" class="hub">
        <div class="glyph">{{ store.playing ? '❚❚' : '▶' }}</div>
        <div class="bpm">{{ store.bpm }}<span>BPM</span></div>
        <div class="bar">BAR {{ bar }}·{{ beat }}</div>
      </div>

      <!-- settings chip (top) -->
      <button v-if="started" class="chip" @click="showPanel = true">⚙</button>

      <OrreryPanel v-if="started && showPanel" @close="showPanel = false" />

      <OrreryTitleScreen v-if="!started" @start="start" />
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.orrery {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #050508;
  font-family: 'Courier New', monospace;
}

.surface {
  position: absolute;
  inset: 0;
  z-index: 1;
  touch-action: none;
}

.hub {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  pointer-events: none;
  text-align: center;
  color: #d4d0c4;
}
.hub .glyph { font-size: 30px; color: #e8a13c; text-shadow: 0 0 20px rgba(232,161,60,0.5); }
.hub .bpm { font-size: 26px; font-weight: bold; letter-spacing: 0.06em; }
.hub .bpm span { font-size: 9px; letter-spacing: 0.25em; margin-left: 4px; color: rgba(212,208,196,0.45); }
.hub .bar { font-size: 10px; letter-spacing: 0.28em; color: rgba(212,208,196,0.5); }

.chip {
  position: absolute;
  left: 50%;
  top: 8px;
  transform: translateX(-50%);
  z-index: 3;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(10,10,15,0.6);
  border: 1px solid rgba(212,208,196,0.25);
  color: rgba(212,208,196,0.8);
  font-size: 17px;
  cursor: pointer;
  backdrop-filter: blur(3px);
}
.chip:active { background: rgba(212,208,196,0.14); }
</style>
