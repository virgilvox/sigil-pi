<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { Particle } from '@/types'

interface Props {
  particles: Particle[]
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 720
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

function render(): void {
  if (!ctx) return

  ctx.clearRect(0, 0, props.size, props.size)

  for (const p of props.particles) {
    if (p.life <= 0) continue

    ctx.globalAlpha = p.life
    ctx.fillStyle = p.col
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}

watch(() => props.particles, render, { deep: true })

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
  }
})
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="size"
    :height="size"
    class="particle-canvas"
  />
</template>

<style scoped>
.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
}
</style>
