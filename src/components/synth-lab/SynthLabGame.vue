<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { useSynthLabStore, type SynthMode } from '@/stores/synth-lab'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'
import SynthLabTitle from './SynthLabTitle.vue'
import InstrumentMode from './InstrumentMode.vue'
import WorkbenchMode from './WorkbenchMode.vue'
import StepSeqMode from './StepSeqMode.vue'

const globalStore = useGlobalStore()
const store = useSynthLabStore()

const started = ref(false)
const showSettings = ref(false)

const MODES: { id: SynthMode; label: string; glyph: string }[] = [
  { id: 'bench', label: 'BENCH', glyph: '⚙' },
  { id: 'play', label: 'PLAY', glyph: '♪' },
  { id: 'seq', label: 'SEQ', glyph: '▦' }
]
const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALE_NAMES = ['major', 'minor', 'dorian', 'mixolydian', 'phrygian', 'lydian',
  'minor pentatonic', 'major pentatonic', 'blues', 'harmonic minor', 'chromatic']

async function start(): Promise<void> {
  try {
    await store.boot()
    started.value = true
  } catch (e) {
    console.error('[synth-lab] boot failed', e)
  }
}

onMounted(() => globalStore.setCurrentGame('synth-lab'))
onUnmounted(() => {
  store.dispose()
  globalStore.setCurrentGame(null)
})
</script>

<template>
  <CircularViewport>
    <div class="synth-lab">
      <template v-if="started">
        <InstrumentMode v-if="store.mode === 'play'" />
        <WorkbenchMode v-else-if="store.mode === 'bench'" />
        <StepSeqMode v-else />

        <!-- mode tabs (top) -->
        <div class="tabs">
          <button
            v-for="m in MODES" :key="m.id"
            class="tab" :class="{ on: store.mode === m.id }"
            @click="store.setMode(m.id)"
          >
            <span class="g">{{ m.glyph }}</span>{{ m.label }}
          </button>
          <button class="tab gear" @click="showSettings = true">⚙</button>
        </div>

        <!-- settings sheet -->
        <div v-if="showSettings" class="settings" @pointerdown.self="showSettings = false">
          <div class="sheet">
            <div class="row"><span>SCALE</span>
              <select :value="store.scaleRoot" @change="store.scaleRoot = ($event.target as HTMLSelectElement).value">
                <option v-for="r in ROOTS" :key="r" :value="r">{{ r }}</option>
              </select>
              <select :value="store.scaleName" @change="store.scaleName = ($event.target as HTMLSelectElement).value">
                <option v-for="s in SCALE_NAMES" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="row"><span>BPM</span>
              <button @click="store.setBpm(store.bpm - 2)">−</button>
              <b>{{ store.bpm }}</b>
              <button @click="store.setBpm(store.bpm + 2)">+</button>
            </div>
            <div class="row"><span>SWING</span>
              <button @click="store.setSwing(store.swing - 0.04)">−</button>
              <b>{{ Math.round(store.swing * 100) }}%</b>
              <button @click="store.setSwing(store.swing + 0.04)">+</button>
            </div>
            <button class="close" @click="showSettings = false">CLOSE</button>
          </div>
        </div>
      </template>

      <SynthLabTitle v-else @start="start" />
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.synth-lab { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: #050508; font-family: 'Courier New', monospace; }

.tabs {
  position: absolute; left: 50%; top: 6px; transform: translateX(-50%);
  z-index: 20; display: flex; gap: 5px;
}
.tab {
  display: flex; align-items: center; gap: 4px;
  background: rgba(10,10,15,0.6); border: 1px solid rgba(212,208,196,0.22);
  color: rgba(212,208,196,0.6); font-family: 'Courier New', monospace;
  font-size: 9px; letter-spacing: 0.15em; padding: 5px 9px; border-radius: 12px;
  cursor: pointer; backdrop-filter: blur(3px);
}
.tab .g { font-size: 11px; }
.tab.on { color: #06060a; background: #d4d0c4; border-color: #d4d0c4; }
.tab.gear { padding: 5px 8px; }

.settings { position: absolute; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(4,4,8,0.86); backdrop-filter: blur(3px); border-radius: 50%; }
.sheet { display: flex; flex-direction: column; gap: 14px; color: #d4d0c4; width: 66%; }
.row { display: flex; align-items: center; gap: 10px; font-size: 11px; letter-spacing: 0.15em; justify-content: center; }
.row span { width: 56px; color: rgba(212,208,196,0.55); }
.row b { min-width: 44px; text-align: center; }
.row button { width: 32px; height: 32px; border-radius: 8px; background: rgba(212,208,196,0.06); border: 1px solid rgba(212,208,196,0.25); color: #d4d0c4; font-size: 16px; cursor: pointer; }
.row select { background: rgba(10,10,15,0.8); border: 1px solid rgba(212,208,196,0.3); color: #d4d0c4; font-family: 'Courier New', monospace; padding: 5px; border-radius: 6px; }
.close { margin-top: 6px; padding: 10px; background: #d4d0c4; color: #06060a; border: none; border-radius: 8px; letter-spacing: 0.2em; font-size: 11px; cursor: pointer; }
</style>
