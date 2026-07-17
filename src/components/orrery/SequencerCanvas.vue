<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { useOrreryStore } from '@/stores/orrery'
import {
  CENTER, BAND, HUB_R, TICK_R, DECO_R, RINGS,
  ringInner, ringOuter, stepAngle, stepMidAngle, polar
} from './geometry'

// Draws the whole radial sequencer to a 720x720 canvas in a rAF loop, reading
// the store's plain pattern. No per-cell DOM — one canvas, cheap on a Pi.

const globalStore = useGlobalStore()
const store = useOrreryStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0

// Playhead interpolation between audio ticks (wall clock).
let lastTick = -1
let lastStamp = 0

function ringSector(r: number, a0: number, a1: number, width: number): void {
  if (!ctx) return
  const ri = r - width / 2
  const ro = r + width / 2
  ctx.beginPath()
  ctx.arc(CENTER, CENTER, ro, a0, a1)
  ctx.arc(CENTER, CENTER, ri, a1, a0, true)
  ctx.closePath()
}

function draw(now: number): void {
  raf = requestAnimationFrame(draw)
  if (!ctx) return
  const perf = globalStore.performanceMode
  ctx.clearRect(0, 0, 720, 720)

  // faint field
  const bg = ctx.createRadialGradient(CENTER, CENTER, 40, CENTER, CENTER, 360)
  bg.addColorStop(0, '#0b0b12')
  bg.addColorStop(1, '#050508')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 720, 720)

  const tracks = store.tracks
  const sel = store.selectedTrack
  const gap = 0.012

  // --- track rings + cells ---
  for (let t = 0; t < tracks.length; t++) {
    const tr = tracks[t]
    const rc = RINGS[t].rc
    const isSel = t === sel

    // base band
    ringSector(rc, 0, Math.PI * 2, BAND)
    ctx.fillStyle = isSel ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)'
    ctx.fill()

    for (let i = 0; i < tr.len; i++) {
      const a0 = stepAngle(i, tr.len) + gap
      const a1 = stepAngle(i + 1, tr.len) - gap
      const s = tr.steps[i]
      const isDown = i % 4 === 0
      const active = store.playing && (store.currentTick % tr.len) === i

      if (s.on) {
        // velocity-scaled fill; melodic: radial position encodes pitch
        let cw = BAND
        let center = rc
        if (tr.melodic) {
          const span = tr.noteTable.length - 1 || 1
          const frac = s.degree / span               // 0 low → 1 high
          cw = BAND * 0.5
          center = ringInner(rc) + cw / 2 + frac * (BAND - cw)
        }
        ringSector(center, a0, a1, cw)
        const alpha = 0.35 + s.vel * 0.6
        ctx.fillStyle = colorAlpha(tr.color, active ? 1 : alpha)
        ctx.fill()
        if (!perf) {
          ctx.shadowColor = tr.color
          ctx.shadowBlur = active ? 22 : 10
          ctx.fill()
          ctx.shadowBlur = 0
        }
      } else {
        // empty cell outline
        ringSector(rc, a0, a1, BAND)
        ctx.fillStyle = isDown ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'
        ctx.fill()
      }
    }

    // selected ring accent
    if (isSel) {
      ctx.beginPath()
      ctx.arc(CENTER, CENTER, ringOuter(rc) + 2, 0, Math.PI * 2)
      ctx.strokeStyle = colorAlpha(tr.color, 0.5)
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  // --- outer tick ring (aligned to selected track length) ---
  const selLen = tracks[sel].len
  for (let i = 0; i < selLen; i++) {
    const a = stepAngle(i, selLen)
    const down = i % 4 === 0
    const p0 = polar(TICK_R - (down ? 10 : 5), a)
    const p1 = polar(TICK_R + (down ? 6 : 3), a)
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    ctx.lineTo(p1.x, p1.y)
    ctx.strokeStyle = down ? 'rgba(212,208,196,0.55)' : 'rgba(212,208,196,0.25)'
    ctx.lineWidth = down ? 2 : 1
    ctx.stroke()
  }

  // --- playhead spoke ---
  if (store.playing) {
    if (store.currentTick !== lastTick) { lastTick = store.currentTick; lastStamp = now }
    const stepDur = (60000 / store.bpm) / 4
    const prog = Math.min(1, (now - lastStamp) / stepDur)
    const bar = 16
    const frac = (((store.currentTick % bar) + prog) % bar) / bar
    const a = -Math.PI / 2 + frac * Math.PI * 2
    const inner = polar(HUB_R + 4, a)
    const outer = polar(TICK_R + 6, a)
    const grad = ctx.createLinearGradient(inner.x, inner.y, outer.x, outer.y)
    grad.addColorStop(0, 'rgba(212,208,196,0.05)')
    grad.addColorStop(1, 'rgba(212,208,196,0.8)')
    ctx.beginPath()
    ctx.moveTo(inner.x, inner.y)
    ctx.lineTo(outer.x, outer.y)
    ctx.strokeStyle = grad
    ctx.lineWidth = 2
    ctx.stroke()
    // comet head
    const head = polar(TICK_R + 6, a)
    ctx.beginPath()
    ctx.arc(head.x, head.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(212,208,196,0.9)'
    if (!perf) { ctx.shadowColor = '#d4d0c4'; ctx.shadowBlur = 16 }
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // --- hub ring ---
  ctx.beginPath()
  ctx.arc(CENTER, CENTER, HUB_R, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(212,208,196,0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  // decorative outer circle
  ctx.beginPath()
  ctx.arc(CENTER, CENTER, DECO_R, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(212,208,196,0.06)'
  ctx.stroke()
}

function colorAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return `rgba(${r},${g},${b},${a})`
}

onMounted(() => {
  const c = canvasRef.value
  if (!c) return
  ctx = c.getContext('2d')
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas ref="canvasRef" class="seq-canvas" width="720" height="720"></canvas>
</template>

<style scoped>
.seq-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
