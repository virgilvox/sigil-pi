<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSynthLabStore } from '@/stores/synth-lab'
import type { InstrumentFamily } from 'bellowsjs'
import { CENTER, polar, wedgeMidAngle, indexAngle, angleFromTop, distFromCenter, ringSector } from './geometry'
import { noteColor, noteGlow, familyColor, engineColor, withAlpha, stageGradient } from '@/styles/palette'

// A scale-aware radial keyboard: two concentric octaves of wedge keys, always in
// key, multi-touch, vividly colored per pitch-class with active + sustained glow.
// The pad is sized to leave a clear bottom margin for controls (which never sit
// on top of the keys). Sound = any instrument preset OR any raw engine.

const store = useSynthLabStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const surfRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0

// Big two-octave wheel filling the disc; only the scope/tabs (top) and a slim
// control zone (hub + corners + bottom) sit outside the keys.
const OUTER_RC = 256, INNER_RC = 164, BAND = 82, HUB_R = 104
const BASE_OCT = 4
const active = new Map<number, { key: string; cell: string; midi: number }>()
const lit = ref(new Set<string>())
const lastNote = ref('')
const showBrowse = ref(false)
const browseMode = ref<'presets' | 'engines'>('presets')

function degreesPerOctave(): number {
  const scale = store.activeScale
  const oct = scale.degreeToMidi(0, 1)
  for (let n = 1; n <= 24; n++) if (scale.degreeToMidi(n, 0) >= oct) return n
  return 7
}
function midiFor(ring: number, wedge: number): number {
  return store.activeScale.degreeToMidi(wedge, BASE_OCT + ring + store.octave)
}
function toLocal(e: PointerEvent): { x: number; y: number } {
  const r = surfRef.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / r.width * 720, y: (e.clientY - r.top) / r.height * 720 }
}
function cellAt(x: number, y: number): { ring: number; wedge: number; t: number } | null {
  const d = distFromCenter(x, y)
  const n = degreesPerOctave()
  const wedge = Math.floor((angleFromTop(x, y) / (Math.PI * 2)) * n) % n
  if (d >= OUTER_RC - BAND / 2 && d <= OUTER_RC + BAND / 2) return { ring: 0, wedge, t: (d - (OUTER_RC - BAND / 2)) / BAND }
  if (d >= INNER_RC - BAND / 2 && d <= INNER_RC + BAND / 2) return { ring: 1, wedge, t: (d - (INNER_RC - BAND / 2)) / BAND }
  return null
}

function onDown(e: PointerEvent): void {
  e.preventDefault()
  const { x, y } = toLocal(e)
  // center hub = open the sound browser
  if (distFromCenter(x, y) < HUB_R) { showBrowse.value = true; return }
  const cell = cellAt(x, y)
  if (!cell) return
  const midi = midiFor(cell.ring, cell.wedge)
  const vel = 0.55 + 0.42 * cell.t
  const key = `p${e.pointerId}`
  store.playNoteOn(midi, vel, key)
  const cellKey = `${cell.ring}:${cell.wedge}`
  active.set(e.pointerId, { key, cell: cellKey, midi })
  lit.value = new Set([...lit.value, cellKey])
  lastNote.value = store.noteName(midi)
}
function onUp(e: PointerEvent): void {
  const a = active.get(e.pointerId)
  if (!a) return
  store.playNoteOff(a.key)
  active.delete(e.pointerId)
  if (![...active.values()].some(v => v.cell === a.cell)) {
    const s = new Set(lit.value); s.delete(a.cell); lit.value = s
  }
}

function draw(): void {
  raf = requestAnimationFrame(draw)
  if (!ctx) return
  ctx.clearRect(0, 0, 720, 720)
  ctx.fillStyle = stageGradient(ctx, CENTER, CENTER, 360, store.playColor)
  ctx.fillRect(0, 0, 720, 720)

  const scale = store.activeScale
  const n = degreesPerOctave()
  const gap = 0.02
  for (const ring of [0, 1]) {
    const rc = ring === 0 ? OUTER_RC : INNER_RC
    for (let w = 0; w < n; w++) {
      const a0 = indexAngle(w, n) + gap
      const a1 = indexAngle(w + 1, n) - gap
      const midi = scale.degreeToMidi(w, BASE_OCT + ring + store.octave)
      const held = lit.value.has(`${ring}:${w}`)
      const sustained = store.isLit(midi) && !held
      const root = w === 0
      const base = noteColor(midi, { root, oct: ring + store.octave })
      ringSector(ctx, rc, BAND, a0, a1)
      if (held) {
        ctx.fillStyle = noteGlow(midi); ctx.fill()
        ctx.shadowColor = noteGlow(midi); ctx.shadowBlur = 26; ctx.fill(); ctx.shadowBlur = 0
      } else if (sustained) {
        ctx.fillStyle = withAlpha(base, 0.6); ctx.fill()
        ctx.shadowColor = base; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = withAlpha(base, root ? 0.42 : 0.28); ctx.fill()
      }
      ctx.strokeStyle = withAlpha(base, held ? 0.9 : 0.5); ctx.lineWidth = root ? 1.6 : 1; ctx.stroke()
      const p = polar(rc, wedgeMidAngle(w, n))
      ctx.fillStyle = held ? '#12101f' : '#f4f1ea'
      ctx.font = `bold ${root ? 13 : 12}px "Courier New", monospace`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(store.noteName(midi).replace(/-?\d+$/, ''), p.x, p.y)
    }
  }
  // center readout
  const c = store.playColor
  ctx.beginPath(); ctx.arc(CENTER, CENTER, HUB_R, 0, Math.PI * 2)
  const hub = ctx.createRadialGradient(CENTER, CENTER - 18, 8, CENTER, CENTER, HUB_R)
  hub.addColorStop(0, withAlpha(c, 0.24)); hub.addColorStop(1, 'rgba(12,10,24,0.9)')
  ctx.fillStyle = hub; ctx.fill()
  ctx.strokeStyle = withAlpha(c, 0.5); ctx.lineWidth = 1.5; ctx.stroke()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f4f1ea'; ctx.font = 'bold 16px "Courier New", monospace'
  ctx.fillText(fit(store.playLabel, 15), CENTER, CENTER - 18)
  ctx.font = '9px "Courier New", monospace'; ctx.fillStyle = withAlpha(c, 0.8)
  ctx.fillText(store.playSub, CENTER, CENTER - 2)
  ctx.font = '10px "Courier New", monospace'; ctx.fillStyle = withAlpha('#d8d3e4', 0.6)
  ctx.fillText(lastNote.value || `${store.scaleRoot} ${store.scaleName}`, CENTER, CENTER + 14)
  ctx.font = '8px "Courier New", monospace'; ctx.fillStyle = withAlpha(c, 0.55)
  ctx.fillText('TAP TO BROWSE', CENTER, CENTER + 30)
}
function fit(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + '…' : s }

onMounted(() => { ctx = canvasRef.value?.getContext('2d') ?? null; raf = requestAnimationFrame(draw) })
onUnmounted(() => { cancelAnimationFrame(raf); store.releaseAllPlay(); active.clear() })

function cycleSound(dir: number): void {
  if (store.playRawEngine) {
    const list = store.PLAY_ENGINES
    const i = list.indexOf(store.playRawEngine)
    store.selectRawEngine(list[(i + dir + list.length) % list.length])
  } else store.cyclePreset(dir)
}
function pickPreset(id: string): void { store.selectPreset(id); showBrowse.value = false }
function pickEngine(id: string): void { store.selectRawEngine(id); showBrowse.value = false }
function browseFamily(fam: InstrumentFamily): void {
  if (store.playFamily !== fam || store.playRawEngine) store.selectPreset(store.families.get(fam)![0].id)
}
</script>

<template>
  <div class="mode">
    <canvas ref="canvasRef" class="cv" width="720" height="720"></canvas>
    <div
      ref="surfRef" class="surface"
      @pointerdown="onDown" @pointerup="onUp" @pointercancel="onUp" @pointerleave="onUp"
    ></div>

    <!-- performance toggles tucked into the wasted lower corners -->
    <button class="corner cl tog" :class="{ on: store.sustainOn }" @click="store.toggleSustain()">SUS</button>
    <button class="corner cr tog" :class="{ on: store.legatoOn, dis: !store.legatoCapable }"
      :disabled="!store.legatoCapable" @click="store.toggleLegato()">LEG</button>

    <!-- slim bottom bar: sound cycle + octave -->
    <div class="ctl-bar" :style="{ '--c': store.playColor }">
      <button class="c nav" @click="cycleSound(-1)">‹</button>
      <button class="c" @click="store.shiftOctave(-1)">OCT −</button>
      <span class="oct">{{ store.octave >= 0 ? '+' : '' }}{{ store.octave }}</span>
      <button class="c" @click="store.shiftOctave(1)">OCT +</button>
      <button class="c nav" @click="cycleSound(1)">›</button>
    </div>

    <!-- browser -->
    <div v-if="showBrowse" class="sheet-bg" @pointerdown.self="showBrowse = false">
      <div class="sheet">
        <div class="mode-tabs">
          <button :class="{ on: browseMode === 'presets' }" @click="browseMode = 'presets'">PRESETS</button>
          <button :class="{ on: browseMode === 'engines' }" @click="browseMode = 'engines'">ENGINES</button>
        </div>
        <template v-if="browseMode === 'presets'">
          <div class="fam-tabs">
            <button v-for="fam in store.familyOrder" :key="fam" class="ftab"
              :class="{ on: fam === store.playFamily && !store.playRawEngine }" :style="{ '--c': familyColor(fam) }"
              @click="browseFamily(fam as InstrumentFamily)">{{ fam }}</button>
          </div>
          <div class="plist">
            <button v-for="p in store.presetsInFamily" :key="p.id" class="pitem"
              :class="{ on: p.id === store.playPresetId && !store.playRawEngine }" :style="{ '--c': familyColor(store.playFamily) }"
              @click="pickPreset(p.id)">{{ p.label }}</button>
          </div>
        </template>
        <template v-else>
          <div class="egrid">
            <button v-for="id in store.PLAY_ENGINES" :key="id" class="echip"
              :class="{ on: id === store.playRawEngine }" :style="{ '--c': engineColor(id) }"
              @click="pickEngine(id)"><span class="dot"></span>{{ id }}</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mode { position: absolute; inset: 0; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; }
.surface { position: absolute; inset: 0; z-index: 1; touch-action: none; }

.ctl-bar { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 10;
  display: flex; align-items: center; gap: 6px; font-family: 'Courier New', monospace; }
.ctl-bar .c { background: rgba(20,16,40,0.8); border: 1px solid rgba(190,178,235,0.25); color: rgba(216,211,228,0.85); border-radius: 8px; cursor: pointer; padding: 7px 10px; font-size: 9px; letter-spacing: 0.1em; }
.ctl-bar .nav { color: var(--c); border-color: color-mix(in srgb, var(--c) 45%, transparent); font-size: 13px; padding: 6px 11px; }
.ctl-bar .oct { color: #f4f1ea; font-size: 11px; min-width: 22px; text-align: center; }

.corner { position: absolute; z-index: 10; bottom: 128px; width: 44px; height: 44px; border-radius: 50%;
  background: rgba(20,16,40,0.8); border: 1px solid rgba(190,178,235,0.28); color: rgba(216,211,228,0.75);
  font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.06em; cursor: pointer; }
.corner.cl { left: 118px; }
.corner.cr { right: 118px; }
.corner.tog.on { background: #5fe08a; color: #12101f; border-color: #5fe08a; box-shadow: 0 0 12px rgba(95,224,138,0.55); }
.corner.tog.dis { opacity: 0.3; cursor: not-allowed; }

.sheet-bg { position: absolute; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(6,5,14,0.85); backdrop-filter: blur(3px); border-radius: 50%; }
.sheet { width: 76%; max-height: 70%; overflow-y: auto; background: rgba(20,16,40,0.96); border: 1px solid rgba(190,178,235,0.25); border-radius: 18px; padding: 14px; color: #d8d3e4; font-family: 'Courier New', monospace; }
.mode-tabs { display: flex; gap: 6px; margin-bottom: 12px; justify-content: center; }
.mode-tabs button { background: rgba(30,24,54,0.7); border: 1px solid rgba(190,178,235,0.2); color: rgba(216,211,228,0.6); font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.2em; padding: 6px 16px; border-radius: 9px; cursor: pointer; }
.mode-tabs button.on { background: #d8d3e4; color: #12101f; border-color: #d8d3e4; }
.fam-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
.ftab { background: rgba(30,24,54,0.7); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); color: var(--c); font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.08em; padding: 5px 8px; border-radius: 8px; cursor: pointer; }
.ftab.on { background: color-mix(in srgb, var(--c) 24%, rgba(30,24,54,0.7)); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 35%, transparent); }
.plist { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.pitem { background: rgba(30,24,54,0.6); border: 1px solid rgba(190,178,235,0.16); color: #d8d3e4; font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.06em; padding: 9px 8px; border-radius: 9px; cursor: pointer; text-align: left; }
.pitem.on { border-color: var(--c); color: var(--c); background: color-mix(in srgb, var(--c) 16%, rgba(30,24,54,0.6)); box-shadow: 0 0 12px color-mix(in srgb, var(--c) 30%, transparent); }
.egrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.echip { display: flex; align-items: center; gap: 6px; background: rgba(30,24,54,0.7); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); color: #d8d3e4; font-family: 'Courier New', monospace; font-size: 10px; padding: 8px 6px; border-radius: 9px; cursor: pointer; }
.echip .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); flex-shrink: 0; }
.echip.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 22%, rgba(30,24,54,0.7)); box-shadow: 0 0 14px color-mix(in srgb, var(--c) 40%, transparent); }
</style>
