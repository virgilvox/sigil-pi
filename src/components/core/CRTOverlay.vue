<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useGlobalStore } from '@/stores/global'

const globalStore = useGlobalStore()
const noiseCanvas = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

function drawNoise(): void {
  if (!noiseCanvas.value || !globalStore.crtEnabled) return

  const ctx = noiseCanvas.value.getContext('2d')
  if (!ctx) return

  const w = noiseCanvas.value.width
  const h = noiseCanvas.value.height
  const imageData = ctx.createImageData(w, h)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.random() * 255
    data[i] = val
    data[i + 1] = val
    data[i + 2] = val
    data[i + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)

  if (!globalStore.performanceMode) {
    animationId = requestAnimationFrame(drawNoise)
  }
}

function startNoise(): void {
  if (animationId) return
  drawNoise()
}

function stopNoise(): void {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

watch(() => globalStore.crtEnabled, (enabled) => {
  if (enabled) {
    startNoise()
  } else {
    stopNoise()
  }
})

onMounted(() => {
  if (globalStore.crtEnabled) {
    startNoise()
  }
})

onUnmounted(() => {
  stopNoise()
})
</script>

<template>
  <div v-if="globalStore.crtEnabled" class="crt-overlay">
    <div class="crt-bubble"></div>
    <div class="crt-reflection"></div>
    <div class="crt-sweep"></div>
    <canvas ref="noiseCanvas" class="crt-noise" width="128" height="128"></canvas>
  </div>
</template>

<style scoped>
@import '@/styles/crt.css';
</style>
