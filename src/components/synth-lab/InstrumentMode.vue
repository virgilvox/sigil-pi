<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSynthLabStore } from '@/stores/synth-lab'
import { CENTER, polar, wedgeMidAngle, indexAngle, angleFromTop, distFromCenter, ringSector } from './geometry'

// A scale-aware radial keyboard: two concentric octaves of wedge keys, always in
// key, multi-touch. Tap a wedge to sound its degree; lift to release.

const store = useSynthLabStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const surfRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0

const OUTER_RC = 258, INNER_RC = 170, BAND = 74
const BASE_OCT = 4
// pointerId -> { key, noteId, cellKey }
const active = new Map<number, { key: string; id: number; cell: string }>()
const lit = ref(new Set<string>())
const lastNote = ref('')

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

function cellAt(x: number, y: number): { ring: number; wedge: number } | null {
  const d = distFromCenter(x, y)
  const n = degreesPerOctave()
  const wedge = Math.floor((angleFromTop(x, y) / (Math.PI * 2)) * n) % n
  if (d >= OUTER_RC - BAND / 2 && d <= OUTER_RC + BAND / 2) return { ring: 0, wedge }
  if (d >= INNER_RC - BAND / 2 && d <= INNER_RC + BAND / 2) return { ring: 1, wedge }
  return null
}

function onDown(e: PointerEvent): void {
  e.preventDefault()
  const { x, y } = toLocal(e)
  const cell = cellAt(x, y)
  if (!cell) return
  const midi = midiFor(cell.ring, cell.wedge)
  const key = store.playKey
  const id = store.noteOn(key, midi, 0.9)
  const cellKey = `${cell.ring}:${cell.wedge}`
  active.set(e.pointerId, { key, id, cell: cellKey })
  lit.value = new Set([...lit.value, cellKey])
  lastNote.value = store.noteName(midi)
}
function onUp(e: PointerEvent): void {
  const a = active.get(e.pointerId)
  if (!a) return
  store.noteOff(a.key, a.id)
  active.delete(e.pointerId)
  const s = new Set(lit.value); s.delete(a.cell)
  // keep lit if another pointer holds the same cell
  if (![...active.values()].some(v => v.cell === a.cell)) lit.value = s
}

function draw(): void {
  raf = requestAnimationFrame(draw)
  if (!ctx) return
  ctx.clearRect(0, 0, 720, 720)
  const bg = ctx.createRadialGradient(CENTER, CENTER, 40, CENTER, CENTER, 360)
  bg.addColorStop(0, '#0b0b12'); bg.addColorStop(1, '#050508')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 720, 720)

  const scale = store.activeScale
  const n = degreesPerOctave()
  const gap = 0.02
  for (const ring of [0, 1]) {
    const rc = ring === 0 ? OUTER_RC : INNER_RC
    for (let w = 0; w < n; w++) {
      const a0 = indexAngle(w, n) + gap
      const a1 = indexAngle(w + 1, n) - gap
      const on = lit.value.has(`${ring}:${w}`)
      const root = w === 0
      ringSector(ctx, rc, BAND, a0, a1)
      ctx.fillStyle = on
        ? 'rgba(76,201,160,0.85)'
        : root ? 'rgba(212,208,196,0.14)' : 'rgba(212,208,196,0.06)'
      ctx.fill()
      if (on) { ctx.shadowColor = '#4cc9a0'; ctx.shadowBlur = 22; ctx.fill(); ctx.shadowBlur = 0 }
      // note label
      const mid = wedgeMidAngle(w, n)
      const p = polar(rc, mid)
      ctx.fillStyle = on ? '#06060a' : 'rgba(212,208,196,0.6)'
      ctx.font = 'bold 12px "Courier New", monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(store.noteName(scale.degreeToMidi(w, BASE_OCT + ring + store.octave)).replace(/\d+$/, ''), p.x, p.y)
    }
  }
  // center readout
  ctx.fillStyle = 'rgba(212,208,196,0.85)'
  ctx.font = 'bold 15px "Courier New", monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(store.currentPreset.label, CENTER, CENTER - 8)
  ctx.font = '10px "Courier New", monospace'
  ctx.fillStyle = 'rgba(212,208,196,0.5)'
  ctx.fillText(lastNote.value || `${store.scaleRoot} ${store.scaleName}`, CENTER, CENTER + 12)
}

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  for (const a of active.values()) store.noteOff(a.key, a.id)
  active.clear()
})
</script>

<template>
  <div class="mode">
    <canvas ref="canvasRef" class="cv" width="720" height="720"></canvas>
    <div
      ref="surfRef" class="surface"
      @pointerdown="onDown" @pointerup="onUp" @pointercancel="onUp" @pointerleave="onUp"
    ></div>

    <!-- preset + octave controls -->
    <div class="controls">
      <button @click="store.cycleFamily(-1)">‹</button>
      <div class="fam">{{ store.playFamily.toUpperCase() }}</div>
      <button @click="store.cycleFamily(1)">›</button>
      <div class="oct">
        <button @click="store.shiftOctave(-1)">−</button>
        <span>OCT {{ store.octave >= 0 ? '+' : '' }}{{ store.octave }}</span>
        <button @click="store.shiftOctave(1)">+</button>
      </div>
    </div>
    <div class="presets">
      <button @click="store.cyclePreset(-1)">‹ PREV</button>
      <button @click="store.cyclePreset(1)">NEXT ›</button>
    </div>
  </div>
</template>

<style scoped>
.mode { position: absolute; inset: 0; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; }
.surface { position: absolute; inset: 0; z-index: 1; touch-action: none; }
.controls, .presets {
  position: absolute; left: 50%; transform: translateX(-50%); z-index: 10;
  display: flex; align-items: center; gap: 8px; font-family: 'Courier New', monospace; color: #d4d0c4;
}
.controls { top: 40px; }
.presets { bottom: 54px; }
.controls .fam { font-size: 11px; letter-spacing: 0.15em; min-width: 76px; text-align: center; color: #4cc9a0; }
.controls button, .presets button, .oct button {
  background: rgba(10,10,15,0.6); border: 1px solid rgba(212,208,196,0.25); color: #d4d0c4;
  font-family: 'Courier New', monospace; border-radius: 8px; cursor: pointer; padding: 6px 10px; font-size: 11px;
}
.oct { display: flex; align-items: center; gap: 6px; font-size: 9px; letter-spacing: 0.1em; margin-left: 8px; }
</style>
