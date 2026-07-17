<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSynthLabStore } from '@/stores/synth-lab'
import { withAlpha } from '@/styles/palette'

// A compact always-on oscilloscope + level meter fed by the bellows analyser /
// meter. Sits under the mode tabs so you always see the sound you're shaping.
const props = defineProps<{ color: string }>()
const store = useSynthLabStore()
const cv = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let buf: Float32Array | null = null

const W = 300, H = 48

function draw(): void {
  raf = requestAnimationFrame(draw)
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)
  const an = store.analyser()
  const col = props.color
  // waveform
  if (an) {
    if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize)
    an.getFloatTimeDomainData(buf)
    const mid = H * 0.44
    ctx.beginPath()
    const step = buf.length / W
    for (let x = 0; x < W; x++) {
      const v = buf[Math.floor(x * step)]
      const y = mid - v * (H * 0.4)
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'
    ctx.shadowColor = col; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0
  }
  // meter row along the bottom
  const m = store.meterFrame()
  const by = H - 5
  const peak = m ? Math.max(m.peakL, m.peakR) : 0
  const clip = peak > 0.98
  ctx.fillStyle = withAlpha('#b9b3d0', 0.14)
  ctx.fillRect(0, by, W, 3)
  ctx.fillStyle = clip ? '#ff5c5c' : col
  ctx.fillRect(0, by, W * Math.min(1, peak), 3)
  // voice count
  const voices = m ? m.voices : 0
  ctx.fillStyle = withAlpha('#d8d3e4', 0.6)
  ctx.font = '8px "Courier New", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillText(`${voices}v`, 2, 1)
}

onMounted(() => { ctx = cv.value?.getContext('2d') ?? null; raf = requestAnimationFrame(draw) })
onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas ref="cv" class="scope" :width="W" :height="H"></canvas>
</template>

<style scoped>
.scope { width: 150px; height: 24px; display: block; opacity: 0.92; }
</style>
