<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSynthLabStore } from '@/stores/synth-lab'
import { CENTER, polar, indexAngle, wedgeMidAngle, angleFromTop, distFromCenter, ringSector } from './geometry'

// Radial step sequencer where EACH STEP carries its own instrument (from an
// 8-swatch palette) and its own note. Bar-time maps to angle like the orrery.

const store = useSynthLabStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const surfRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0

const STEP_RC = 244, STEP_BAND = 42
const PALETTE_RC = 320, PALETTE_BAND = 26
const PITCH_RC = 122, PITCH_BAND = 46
const HUB_R = 78
const BASE_OCT = 4

function degreesPerOctave(): number {
  const s = store.activeScale
  const oct = s.degreeToMidi(0, 1)
  for (let n = 1; n <= 24; n++) if (s.degreeToMidi(n, 0) >= oct) return n
  return 7
}

function toLocal(e: PointerEvent): { x: number; y: number } {
  const r = surfRef.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / r.width * 720, y: (e.clientY - r.top) / r.height * 720 }
}

type Mode = 'idle' | 'hub' | 'step-pending' | 'paint' | 'vel'
let mode: Mode = 'idle'
let pid = -1, downStep = -1, downY = 0, startBpm = 120, startVel = 0.85, moved = false, paintState = false
let longTimer: ReturnType<typeof setTimeout> | null = null

function region(x: number, y: number): { kind: string; index: number } {
  const d = distFromCenter(x, y)
  if (d < HUB_R) return { kind: 'hub', index: -1 }
  if (store.selectedStep >= 0 && d >= PITCH_RC - PITCH_BAND / 2 && d <= PITCH_RC + PITCH_BAND / 2) {
    const n = degreesPerOctave()
    return { kind: 'pitch', index: Math.floor((angleFromTop(x, y) / (Math.PI * 2)) * n) % n }
  }
  if (d >= STEP_RC - STEP_BAND / 2 && d <= STEP_RC + STEP_BAND / 2) {
    const len = store.seqLength
    return { kind: 'step', index: Math.floor((angleFromTop(x, y) / (Math.PI * 2)) * len) % len }
  }
  if (d >= PALETTE_RC - PALETTE_BAND / 2 && d <= PALETTE_RC + PALETTE_BAND / 2) {
    return { kind: 'palette', index: Math.floor((angleFromTop(x, y) / (Math.PI * 2)) * 8) % 8 }
  }
  return { kind: 'none', index: -1 }
}

function clearLong(): void { if (longTimer) { clearTimeout(longTimer); longTimer = null } }

function onDown(e: PointerEvent): void {
  if (pid !== -1) return
  e.preventDefault()
  pid = e.pointerId
  try { surfRef.value!.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  const { x, y } = toLocal(e)
  downY = y; moved = false
  const r = region(x, y)
  if (r.kind === 'hub') { mode = 'hub'; startBpm = store.bpm; return }
  if (r.kind === 'palette') { store.armSlot(r.index); mode = 'idle'; navigator.vibrate?.(8); return }
  if (r.kind === 'pitch') { store.setStepMidi(store.selectedStep, store.activeScale.degreeToMidi(r.index, BASE_OCT)); mode = 'idle'; return }
  if (r.kind === 'step') {
    mode = 'step-pending'; downStep = r.index; store.selectStep(r.index)
    startVel = store.steps[r.index].vel
    longTimer = setTimeout(() => { mode = 'vel'; if (!store.steps[downStep].on) store.toggleStep(downStep); navigator.vibrate?.(12) }, 340)
    return
  }
  mode = 'idle'
}
function onMove(e: PointerEvent): void {
  if (e.pointerId !== pid) return
  const { x, y } = toLocal(e)
  if (!moved && Math.abs(y - downY) > 7) moved = true
  if (mode === 'hub') { if (moved) { clearLong(); store.setBpm(startBpm + (downY - y) * 0.25) } return }
  if (mode === 'step-pending' && moved) {
    clearLong()
    paintState = !store.steps[downStep].on
    mode = 'paint'
    store.paintStep(downStep, paintState)
  }
  if (mode === 'paint') {
    const len = store.seqLength
    const step = Math.floor((angleFromTop(x, y) / (Math.PI * 2)) * len) % len
    store.paintStep(step, paintState)
  }
  if (mode === 'vel') { store.setStepVel(downStep, startVel + (downY - y) / 130) }
}
function onUp(e: PointerEvent): void {
  if (e.pointerId !== pid) return
  clearLong()
  if (mode === 'hub' && !moved) store.togglePlay()
  else if (mode === 'step-pending' && !moved) store.toggleStep(downStep)
  mode = 'idle'; pid = -1; downStep = -1; moved = false
}

function colorAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function draw(): void {
  raf = requestAnimationFrame(draw)
  if (!ctx) return
  ctx.clearRect(0, 0, 720, 720)
  const bg = ctx.createRadialGradient(CENTER, CENTER, 40, CENTER, CENTER, 360)
  bg.addColorStop(0, '#0b0b12'); bg.addColorStop(1, '#050508')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 720, 720)

  const len = store.seqLength
  const gap = 0.014
  // step ring
  for (let i = 0; i < len; i++) {
    const a0 = indexAngle(i, len) + gap, a1 = indexAngle(i + 1, len) - gap
    const s = store.steps[i]
    const active = store.playing && (store.currentTick % len) === i
    const col = store.PALETTE_COLORS[s.slot]
    ringSector(ctx, STEP_RC, STEP_BAND, a0, a1)
    if (s.on) {
      ctx.fillStyle = colorAlpha(col, active ? 1 : 0.35 + s.vel * 0.5)
      ctx.fill()
      ctx.shadowColor = col; ctx.shadowBlur = active ? 22 : 8; ctx.fill(); ctx.shadowBlur = 0
      const mid = wedgeMidAngle(i, len); const p = polar(STEP_RC, mid)
      ctx.fillStyle = '#06060a'; ctx.font = 'bold 8px "Courier New", monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(store.noteName(s.midi).replace(/\d+$/, ''), p.x, p.y)
    } else {
      ctx.fillStyle = i % 4 === 0 ? 'rgba(212,208,196,0.06)' : 'rgba(212,208,196,0.025)'
      ctx.fill()
    }
    if (store.selectedStep === i) {
      ringSector(ctx, STEP_RC, STEP_BAND + 6, a0, a1)
      ctx.strokeStyle = 'rgba(212,208,196,0.7)'; ctx.lineWidth = 1.5; ctx.stroke()
    }
  }

  // palette swatches
  for (let i = 0; i < 8; i++) {
    const a = wedgeMidAngle(i, 8); const p = polar(PALETTE_RC, a)
    ctx.beginPath(); ctx.arc(p.x, p.y, i === store.armed ? 13 : 9, 0, Math.PI * 2)
    ctx.fillStyle = colorAlpha(store.PALETTE_COLORS[i], i === store.armed ? 1 : 0.55); ctx.fill()
    if (i === store.armed) { ctx.strokeStyle = '#d4d0c4'; ctx.lineWidth = 2; ctx.stroke() }
  }

  // inner pitch dial (when a step is selected)
  if (store.selectedStep >= 0) {
    const n = degreesPerOctave()
    for (let w = 0; w < n; w++) {
      const a0 = indexAngle(w, n) + 0.02, a1 = indexAngle(w + 1, n) - 0.02
      const midi = store.activeScale.degreeToMidi(w, BASE_OCT)
      const sel = store.steps[store.selectedStep].midi === midi
      ringSector(ctx, PITCH_RC, PITCH_BAND, a0, a1)
      ctx.fillStyle = sel ? 'rgba(76,201,160,0.85)' : 'rgba(212,208,196,0.08)'; ctx.fill()
      const p = polar(PITCH_RC, wedgeMidAngle(w, n))
      ctx.fillStyle = sel ? '#06060a' : 'rgba(212,208,196,0.6)'
      ctx.font = 'bold 8px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(store.noteName(midi).replace(/\d+$/, ''), p.x, p.y)
    }
  }

  // hub
  ctx.beginPath(); ctx.arc(CENTER, CENTER, HUB_R, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(12,12,20,0.85)'; ctx.fill()
  ctx.strokeStyle = 'rgba(212,208,196,0.15)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = '#4cc9a0'; ctx.font = '24px "Courier New", monospace'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(store.playing ? '❚❚' : '▶', CENTER, CENTER - 16)
  ctx.fillStyle = '#d4d0c4'; ctx.font = 'bold 18px "Courier New", monospace'
  ctx.fillText(String(store.bpm), CENTER, CENTER + 10)
  ctx.font = '7px "Courier New", monospace'; ctx.fillStyle = 'rgba(212,208,196,0.45)'
  ctx.fillText('BPM', CENTER, CENTER + 26)
}

onMounted(() => { ctx = canvasRef.value?.getContext('2d') ?? null; raf = requestAnimationFrame(draw) })
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="mode">
    <canvas ref="canvasRef" class="cv" width="720" height="720"></canvas>
    <div ref="surfRef" class="surface" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"></div>
    <div class="tools">
      <button @click="store.euclidFill(Math.max(2, Math.round(store.seqLength / 4)))">EUCLID</button>
      <button @click="store.clearSteps()">CLEAR</button>
    </div>
  </div>
</template>

<style scoped>
.mode { position: absolute; inset: 0; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; }
.surface { position: absolute; inset: 0; z-index: 1; touch-action: none; }
.tools { position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%); z-index: 10; display: flex; gap: 8px; }
.tools button { background: rgba(10,10,15,0.6); border: 1px solid rgba(212,208,196,0.25); color: #d4d0c4; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.15em; padding: 7px 12px; border-radius: 8px; cursor: pointer; }
</style>
