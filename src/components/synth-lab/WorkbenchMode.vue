<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useSynthLabStore } from '@/stores/synth-lab'
import type { ParamSpec } from 'bellowsjs'
import { CENTER, polar } from './geometry'

// A sound-design bench: the selected engine's ParamSpec[] becomes a wheel of
// knobs (drag to edit, curve-aware), plus a strip to audition notes.

const store = useSynthLabStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const surfRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0

const MAX_KNOBS = 21
const RINGS = [286, 214, 142]

const specs = computed<ParamSpec[]>(() => store.benchSpecs.slice(0, MAX_KNOBS))

interface KnobPos { spec: ParamSpec; x: number; y: number }
let knobPositions: KnobPos[] = []

function layout(): KnobPos[] {
  const list = specs.value
  const n = list.length
  const ringCount = n <= 8 ? 1 : n <= 15 ? 2 : 3
  const perRing = Math.ceil(n / ringCount)
  const out: KnobPos[] = []
  list.forEach((spec, i) => {
    const ring = Math.floor(i / perRing)
    const idxInRing = i % perRing
    const countInRing = Math.min(perRing, n - ring * perRing)
    const a = -Math.PI / 2 + (idxInRing / countInRing) * Math.PI * 2
    const p = polar(RINGS[ring], a)
    out.push({ spec, x: p.x, y: p.y })
  })
  return out
}

function toNorm(spec: ParamSpec, v: number): number {
  if (spec.curve === 'exp' && spec.min > 0) return Math.log(v / spec.min) / Math.log(spec.max / spec.min)
  return (v - spec.min) / (spec.max - spec.min)
}
function fromNorm(spec: ParamSpec, t: number): number {
  const c = Math.max(0, Math.min(1, t))
  if (spec.curve === 'exp' && spec.min > 0) return spec.min * Math.pow(spec.max / spec.min, c)
  return spec.min + c * (spec.max - spec.min)
}
function fmt(spec: ParamSpec, v: number): string {
  const abs = Math.abs(v)
  return abs >= 1000 ? `${(v / 1000).toFixed(1)}k` : abs >= 10 ? v.toFixed(0) : v.toFixed(2)
}

function toLocal(e: PointerEvent): { x: number; y: number } {
  const r = surfRef.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / r.width * 720, y: (e.clientY - r.top) / r.height * 720 }
}

let dragging: { pointerId: number; spec: ParamSpec; startY: number; startVal: number } | null = null

function onDown(e: PointerEvent): void {
  e.preventDefault()
  if (dragging) return                 // one knob at a time; ignore extra fingers
  const { x, y } = toLocal(e)
  // audition: center disc plays the scale root
  if (Math.hypot(x - CENTER, y - CENTER) < 54) {
    store.trigger(store.benchEngine, store.activeScale.degreeToMidi(0, 4), 0.9, 0.5)
    return
  }
  let best: KnobPos | null = null, bestD = 40
  for (const k of knobPositions) {
    const d = Math.hypot(x - k.x, y - k.y)
    if (d < bestD) { bestD = d; best = k }
  }
  if (best) {
    dragging = { pointerId: e.pointerId, spec: best.spec, startY: y, startVal: store.benchParams[best.spec.name] ?? best.spec.default }
    try { surfRef.value!.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
}
function onMove(e: PointerEvent): void {
  if (!dragging || e.pointerId !== dragging.pointerId) return
  const { y } = toLocal(e)
  const t = toNorm(dragging.spec, dragging.startVal) + (dragging.startY - y) / 220
  store.setBenchParam(dragging.spec.name, fromNorm(dragging.spec, t))
}
function onUp(e: PointerEvent): void {
  if (dragging && e.pointerId === dragging.pointerId) dragging = null
}

function draw(): void {
  raf = requestAnimationFrame(draw)
  if (!ctx) return
  ctx.clearRect(0, 0, 720, 720)
  const bg = ctx.createRadialGradient(CENTER, CENTER, 40, CENTER, CENTER, 360)
  bg.addColorStop(0, '#0b0b12'); bg.addColorStop(1, '#050508')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 720, 720)

  knobPositions = layout()
  for (const k of knobPositions) {
    const v = store.benchParams[k.spec.name] ?? k.spec.default
    const t = Math.max(0, Math.min(1, toNorm(k.spec, v)))
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25
    const ang = a0 + t * (a1 - a0)
    // track
    ctx.beginPath(); ctx.arc(k.x, k.y, 20, a0, a1)
    ctx.strokeStyle = 'rgba(212,208,196,0.18)'; ctx.lineWidth = 3; ctx.stroke()
    // value
    ctx.beginPath(); ctx.arc(k.x, k.y, 20, a0, ang)
    ctx.strokeStyle = '#4cc9a0'; ctx.lineWidth = 3; ctx.stroke()
    // pointer
    const pp = { x: k.x + Math.cos(ang) * 20, y: k.y + Math.sin(ang) * 20 }
    ctx.beginPath(); ctx.arc(pp.x, pp.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#d4d0c4'; ctx.fill()
    // labels
    ctx.fillStyle = 'rgba(212,208,196,0.7)'
    ctx.font = '8px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(k.spec.name.slice(0, 9), k.x, k.y - 1)
    ctx.fillStyle = '#4cc9a0'; ctx.font = 'bold 8px "Courier New", monospace'
    ctx.fillText(fmt(k.spec, v), k.x, k.y + 9)
  }
  // center audition disc
  ctx.beginPath(); ctx.arc(CENTER, CENTER, 50, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(14,14,22,0.9)'; ctx.fill()
  ctx.strokeStyle = 'rgba(212,208,196,0.25)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = '#d4d0c4'; ctx.font = 'bold 16px "Courier New", monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(store.benchEngine.toUpperCase(), CENTER, CENTER - 6)
  ctx.font = '8px "Courier New", monospace'; ctx.fillStyle = 'rgba(212,208,196,0.5)'
  ctx.fillText('TAP TO TEST', CENTER, CENTER + 12)
}

onMounted(() => { ctx = canvasRef.value?.getContext('2d') ?? null; raf = requestAnimationFrame(draw) })
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="mode">
    <canvas ref="canvasRef" class="cv" width="720" height="720"></canvas>
    <div ref="surfRef" class="surface" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"></div>
    <div class="engine-nav">
      <button @click="store.cycleBenchEngine(-1)">‹</button>
      <span>ENGINE</span>
      <button @click="store.cycleBenchEngine(1)">›</button>
    </div>
  </div>
</template>

<style scoped>
.mode { position: absolute; inset: 0; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; }
.surface { position: absolute; inset: 0; z-index: 1; touch-action: none; }
.engine-nav {
  position: absolute; left: 50%; bottom: 48px; transform: translateX(-50%); z-index: 10;
  display: flex; align-items: center; gap: 10px; color: #d4d0c4; font-family: 'Courier New', monospace;
}
.engine-nav span { font-size: 10px; letter-spacing: 0.2em; color: rgba(212,208,196,0.55); }
.engine-nav button { background: rgba(10,10,15,0.6); border: 1px solid rgba(212,208,196,0.25); color: #d4d0c4; border-radius: 8px; cursor: pointer; padding: 6px 12px; font-size: 14px; }
</style>
