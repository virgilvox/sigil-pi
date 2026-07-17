<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSigilEngineStore } from '@/stores/sigil-engine'
import CircularViewport from '@/components/core/CircularViewport.vue'

const store = useSigilEngineStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null
let lastTime = 0

const CX = 360
const CY = 360

function getAngle(x: number, y: number): number {
  return Math.atan2(y - CY, x - CX)
}

function findRingAtPoint(x: number, y: number): number {
  const dist = Math.sqrt((x - CX) ** 2 + (y - CY) ** 2)

  for (let i = 0; i < store.rings.length; i++) {
    const ring = store.rings[i]
    if (dist > ring.radius - ring.width / 2 - 15 && dist < ring.radius + ring.width / 2 + 15) {
      return i
    }
  }
  return -1
}

// Map a DOM pointer into the fixed 720 logical space. The canvas is 720×720 but
// CircularViewport scales it, so rect.width ≠ 720 — without this conversion the
// ring hit-tests + drag angles were computed against the wrong coordinates.
function toLocal(e: PointerEvent): { x: number; y: number } | null {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return null
  return {
    x: (e.clientX - rect.left) / rect.width * 720,
    y: (e.clientY - rect.top) / rect.height * 720
  }
}

function handlePointerDown(e: PointerEvent): void {
  const p = toLocal(e)
  if (!p) return

  // Check center tap
  const distFromCenter = Math.sqrt((p.x - CX) ** 2 + (p.y - CY) ** 2)
  if (distFromCenter < 60) {
    store.handleCenterTap()
    return
  }

  const ringIndex = findRingAtPoint(p.x, p.y)
  store.startDrag(ringIndex, getAngle(p.x, p.y))
}

function handlePointerMove(e: PointerEvent): void {
  if (store.dragRingIndex === null) return
  const p = toLocal(e)
  if (!p) return
  store.updateDrag(getAngle(p.x, p.y))
}

function handlePointerUp(): void {
  store.endDrag()
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 360)
  bg.addColorStop(0, '#151010')
  bg.addColorStop(0.5, '#0c0808')
  bg.addColorStop(1, '#050404')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(CX, CY, 360, 0, Math.PI * 2)
  ctx.fill()
}

function drawRing(ctx: CanvasRenderingContext2D, ring: typeof store.rings[0], time: number): void {
  ctx.save()
  ctx.translate(CX, CY)
  ctx.rotate(ring.rotation)

  // Ring body
  const gradient = ctx.createRadialGradient(0, 0, ring.radius - ring.width / 2, 0, 0, ring.radius + ring.width / 2)
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(0.3, ring.grabbed ? 'rgba(255, 200, 100, 0.2)' : 'rgba(255, 240, 220, 0.06)')
  gradient.addColorStop(0.7, ring.grabbed ? 'rgba(255, 200, 100, 0.2)' : 'rgba(255, 240, 220, 0.06)')
  gradient.addColorStop(1, 'transparent')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, ring.radius + ring.width / 2, 0, Math.PI * 2)
  ctx.arc(0, 0, ring.radius - ring.width / 2, 0, Math.PI * 2, true)
  ctx.fill()

  // Ring edges
  ctx.strokeStyle = ring.grabbed ? 'rgba(255, 200, 100, 0.3)' : 'rgba(255, 240, 220, 0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, ring.radius + ring.width / 2 - 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, ring.radius - ring.width / 2 + 2, 0, Math.PI * 2)
  ctx.stroke()

  // Runes
  ring.runes.forEach(rune => {
    const x = Math.cos(rune.angle) * ring.radius
    const y = Math.sin(rune.angle) * ring.radius

    // Glow effect
    if (rune.glow > 0.1 || rune.aligned) {
      const glowSize = 30 + rune.glow * 20
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, glowSize)
      glowGrad.addColorStop(0, `rgba(255, 220, 150, ${0.3 + rune.glow * 0.5})`)
      glowGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(x, y, glowSize, 0, Math.PI * 2)
      ctx.fill()
    }

    // Rune symbol
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-ring.rotation)

    ctx.font = `${24 + rune.glow * 8}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = rune.aligned ? '#fff8e0' : (rune.glow > 0.1 ? 'rgba(255, 220, 150, 0.8)' : 'rgba(255, 250, 240, 0.5)')
    ctx.fillText(rune.symbol, 0, 0)

    ctx.restore()
  })

  ctx.restore()
}

function drawTargetIndicator(ctx: CanvasRenderingContext2D, time: number): void {
  if (store.phase !== 'playing') return

  const pulse = Math.sin(time * 3) * 0.3 + 0.7

  ctx.save()
  ctx.translate(CX, CY)
  ctx.rotate(store.targetAngle)

  ctx.strokeStyle = `rgba(255, 180, 100, ${0.3 * pulse})`
  ctx.lineWidth = 2
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(50, 0)
  ctx.lineTo(340, 0)
  ctx.stroke()
  ctx.setLineDash([])

  // Target symbols
  store.targetRunes.forEach(target => {
    const ring = store.rings[target.ring]
    const x = ring.radius

    ctx.fillStyle = `rgba(255, 200, 100, ${0.4 * pulse})`
    ctx.font = '18px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(target.symbol, x, 0)
  })

  ctx.restore()
}

function drawBeam(ctx: CanvasRenderingContext2D, beam: typeof store.beams[0]): void {
  if (beam.life <= 0) return

  const alpha = beam.life
  const width = 4 + beam.rings * 3

  ctx.save()
  ctx.translate(CX, CY)
  ctx.rotate(beam.angle)

  const glowGrad = ctx.createLinearGradient(0, -width * 3, 0, width * 3)
  glowGrad.addColorStop(0, 'transparent')
  glowGrad.addColorStop(0.5, `rgba(255, 200, 100, ${alpha * 0.3})`)
  glowGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, -width * 3, 350, width * 6)

  const coreGrad = ctx.createLinearGradient(0, 0, 350, 0)
  coreGrad.addColorStop(0, `rgba(255, 255, 240, ${alpha})`)
  coreGrad.addColorStop(0.5, `rgba(255, 240, 200, ${alpha * 0.8})`)
  coreGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = coreGrad
  ctx.fillRect(0, -width / 2, 350, width)

  ctx.restore()
}

function drawParticle(ctx: CanvasRenderingContext2D, p: typeof store.particles[0]): void {
  const alpha = p.life / p.maxLife
  ctx.fillStyle = p.color.replace('1)', `${alpha})`)
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
  ctx.fill()
}

function drawCenter(ctx: CanvasRenderingContext2D, time: number): void {
  const pulse = Math.sin(time * 2) * 0.2 + 0.8

  const centerGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, 60)
  centerGrad.addColorStop(0, `rgba(255, 220, 150, ${0.15 * pulse})`)
  centerGrad.addColorStop(0.5, `rgba(255, 180, 100, ${0.08 * pulse})`)
  centerGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = centerGrad
  ctx.beginPath()
  ctx.arc(CX, CY, 60, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `rgba(255, 200, 100, ${0.3 * pulse})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(CX, CY, 45, 0, Math.PI * 2)
  ctx.stroke()

  if (store.phase === 'playing') {
    ctx.fillStyle = `rgba(255, 230, 180, ${0.5 + pulse * 0.3})`
    ctx.font = '28px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('✧', CX, CY)
  }
}

function drawUI(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.fillStyle = 'rgba(255, 250, 240, 0.7)'
  ctx.font = 'bold 20px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(store.score.toString().padStart(7, '0'), CX, 45)

  if (store.phase === 'playing') {
    const barWidth = 200
    const barHeight = 4
    const barX = CX - barWidth / 2
    const barY = 60
    const fill = store.timeLeft / (20 + store.level * 5)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    const timerColor = fill > 0.3 ? 'rgba(255, 220, 150, 0.8)' : 'rgba(255, 100, 100, 0.8)'
    ctx.fillStyle = timerColor
    ctx.fillRect(barX, barY, barWidth * fill, barHeight)
  }

  if (store.combo > 1) {
    ctx.fillStyle = '#ffd700'
    ctx.font = 'bold 24px monospace'
    ctx.fillText(`×${store.combo}`, CX, 720 - 55)
  }

  ctx.fillStyle = 'rgba(255, 250, 240, 0.4)'
  ctx.font = '14px monospace'
  ctx.fillText(`SIGIL ${store.level}`, CX, 720 - 30)

  if (store.messageTimer > 0) {
    const alpha = Math.min(1, store.messageTimer / 30)
    ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`
    ctx.font = 'bold 26px monospace'
    ctx.fillText(store.message, CX, CY + 120)
  }
}

function drawTitle(ctx: CanvasRenderingContext2D, time: number): void {
  const pulse = Math.sin(time * 2) * 0.2 + 0.8

  ctx.fillStyle = `rgba(255, 240, 200, ${pulse})`
  ctx.font = 'bold 42px serif'
  ctx.textAlign = 'center'
  ctx.fillText('SIGIL ENGINE', CX, CY - 40)

  ctx.fillStyle = 'rgba(255, 240, 200, 0.5)'
  ctx.font = '16px monospace'
  ctx.fillText('SPIN THE RINGS', CX, CY + 20)
  ctx.fillText('ALIGN THE RUNES', CX, CY + 45)
  ctx.fillText('TAP CENTER TO CAST', CX, CY + 70)

  ctx.fillStyle = `rgba(255, 200, 100, ${pulse})`
  ctx.font = '18px monospace'
  ctx.fillText('[ TAP TO BEGIN ]', CX, CY + 130)
}

function drawGameOver(ctx: CanvasRenderingContext2D, time: number): void {
  const pulse = Math.sin(time * 2) * 0.2 + 0.8

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.beginPath()
  ctx.arc(CX, CY, 360, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(255, 200, 150, ${pulse})`
  ctx.font = 'bold 36px serif'
  ctx.textAlign = 'center'
  ctx.fillText('TIME EXPIRED', CX, CY - 50)

  ctx.fillStyle = 'rgba(255, 240, 200, 0.9)'
  ctx.font = 'bold 28px monospace'
  ctx.fillText(store.score.toString(), CX, CY + 10)

  ctx.fillStyle = 'rgba(255, 240, 200, 0.5)'
  ctx.font = '16px monospace'
  ctx.fillText(`MAX CHAIN: ${store.maxCombo}`, CX, CY + 50)
  ctx.fillText(`REACHED SIGIL ${store.level}`, CX, CY + 75)

  ctx.fillStyle = `rgba(255, 200, 100, ${pulse})`
  ctx.font = '18px monospace'
  ctx.fillText('[ TAP TO CONTINUE ]', CX, CY + 130)
}

function draw(time: number): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const t = time / 1000

  ctx.save()

  // Screen shake
  if (store.screenShake > 0.5) {
    ctx.translate(
      (Math.random() - 0.5) * store.screenShake,
      (Math.random() - 0.5) * store.screenShake
    )
  }

  // Clip to circle
  ctx.beginPath()
  ctx.arc(CX, CY, 360, 0, Math.PI * 2)
  ctx.clip()

  drawBackground(ctx)

  if (store.phase === 'title') {
    // Decorative rings
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255, 200, 150, ${0.1 - i * 0.03})`
      ctx.lineWidth = 40
      ctx.beginPath()
      ctx.arc(CX, CY, 280 - i * 55, 0, Math.PI * 2)
      ctx.stroke()
    }
    drawTitle(ctx, t)
  } else {
    drawTargetIndicator(ctx, t)

    store.rings.forEach(ring => drawRing(ctx, ring, t))
    store.beams.forEach(beam => drawBeam(ctx, beam))
    store.particles.forEach(p => drawParticle(ctx, p))

    drawCenter(ctx, t)
    drawUI(ctx, t)

    if (store.phase === 'gameover') {
      drawGameOver(ctx, t)
    }
  }

  ctx.restore()

  // Outer boundary
  ctx.strokeStyle = 'rgba(255, 220, 150, 0.15)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(CX, CY, 358, 0, Math.PI * 2)
  ctx.stroke()
}

function gameLoop(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, 0.1)
  lastTime = time

  store.update(dt)
  draw(time)

  animationId = requestAnimationFrame(gameLoop)
}

onMounted(() => {
  store.reset()
  lastTime = performance.now()
  animationId = requestAnimationFrame(gameLoop)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<template>
  <CircularViewport>
    <canvas
      ref="canvasRef"
      width="720"
      height="720"
      class="sigil-engine-canvas"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    />
  </CircularViewport>
</template>

<style scoped>
.sigil-engine-canvas {
  display: block;
  cursor: grab;
  touch-action: none;
}

.sigil-engine-canvas:active {
  cursor: grabbing;
}
</style>
