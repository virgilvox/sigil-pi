<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { useSynthLabStore, type SynthMode } from '@/stores/synth-lab'
import { TRACK_COLORS } from '@/styles/palette'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'
import SynthLabTitle from './SynthLabTitle.vue'
import InstrumentMode from './InstrumentMode.vue'
import WorkbenchMode from './WorkbenchMode.vue'
import StepSeqMode from './StepSeqMode.vue'
import ScopeStrip from './ScopeStrip.vue'

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

const modeColor = computed(() =>
  store.mode === 'bench' ? store.benchColor
  : store.mode === 'play' ? store.playColor
  : TRACK_COLORS[store.armed])

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
            :style="store.mode === m.id ? { '--c': modeColor } : {}"
            @click="store.setMode(m.id)"
          >
            <span class="g">{{ m.glyph }}</span>{{ m.label }}
          </button>
          <button class="tab gear" @click="showSettings = true">⚙</button>
        </div>

        <!-- shared live scope + meter -->
        <div class="scope-wrap"><ScopeStrip :color="modeColor" /></div>

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
            <button class="panic" @click="store.panic()">PANIC</button>
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
.synth-lab { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 50% 42%, #100c20 0%, #0a0812 66%, #050409 100%); font-family: 'Courier New', monospace; }

.tabs {
  position: absolute; left: 50%; top: 8px; transform: translateX(-50%);
  z-index: 20; display: flex; gap: 5px;
}
.tab {
  display: flex; align-items: center; gap: 4px;
  background: rgba(20,16,40,0.6); border: 1px solid rgba(190,178,235,0.22);
  color: rgba(216,211,228,0.6); font-family: 'Courier New', monospace;
  font-size: 9px; letter-spacing: 0.15em; padding: 5px 9px; border-radius: 12px;
  cursor: pointer; backdrop-filter: blur(3px);
}
.tab .g { font-size: 11px; }
.tab.on { color: #12101f; background: var(--c, #d8d3e4); border-color: var(--c, #d8d3e4); box-shadow: 0 0 14px color-mix(in srgb, var(--c, #d8d3e4) 45%, transparent); }
.tab.gear { padding: 5px 8px; color: rgba(216,211,228,0.55); }

.scope-wrap { position: absolute; left: 50%; top: 36px; transform: translateX(-50%); z-index: 15; pointer-events: none; }

.settings { position: absolute; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; background: rgba(6,5,14,0.86); backdrop-filter: blur(3px); border-radius: 50%; }
.sheet { display: flex; flex-direction: column; gap: 14px; color: #d8d3e4; width: 66%; }
.row { display: flex; align-items: center; gap: 10px; font-size: 11px; letter-spacing: 0.15em; justify-content: center; }
.row span { width: 56px; color: rgba(216,211,228,0.55); }
.row b { min-width: 44px; text-align: center; }
.row button { width: 32px; height: 32px; border-radius: 8px; background: rgba(190,178,235,0.08); border: 1px solid rgba(190,178,235,0.25); color: #d8d3e4; font-size: 16px; cursor: pointer; }
.row select { background: rgba(16,13,30,0.9); border: 1px solid rgba(190,178,235,0.3); color: #d8d3e4; font-family: 'Courier New', monospace; padding: 5px; border-radius: 6px; }
.panic { margin-top: 4px; padding: 9px; background: rgba(255,92,92,0.15); color: #ff8a8a; border: 1px solid rgba(255,92,92,0.4); border-radius: 8px; letter-spacing: 0.2em; font-size: 11px; cursor: pointer; }
.close { padding: 10px; background: #d8d3e4; color: #12101f; border: none; border-radius: 8px; letter-spacing: 0.2em; font-size: 11px; cursor: pointer; }
</style>
