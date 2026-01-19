<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCarromStore } from '@/stores/carrom'
import { useCarromRendering } from '@/composables/useCarromRendering'
import CircularViewport from '@/components/core/CircularViewport.vue'

const store = useCarromStore()
const rendering = useCarromRendering(store)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

function getPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }

  const sx = store.W / rect.width
  const sy = store.H / rect.height
  let cx: number, cy: number

  if ('touches' in e && e.touches.length > 0) {
    cx = e.touches[0].clientX
    cy = e.touches[0].clientY
  } else if ('changedTouches' in e && e.changedTouches.length > 0) {
    cx = e.changedTouches[0].clientX
    cy = e.changedTouches[0].clientY
  } else if ('clientX' in e) {
    cx = e.clientX
    cy = e.clientY
  } else {
    return { x: 0, y: 0 }
  }

  return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy }
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  return dx * dx + dy * dy
}

function handleStart(e: MouseEvent | TouchEvent): void {
  e.preventDefault()
  store.initAudio()
  const pos = getPos(e)

  if (store.gameState === 'menu') {
    handleMenuInput(pos)
  } else if (store.gameState === 'rules') {
    handleRulesInput(pos)
  } else if (store.gameState === 'teams') {
    handleTeamsInput(pos)
  } else {
    handleGameInput(pos, true)
  }
}

function handleMove(e: MouseEvent | TouchEvent): void {
  e.preventDefault()
  if (store.gameState !== 'play') return
  const pos = getPos(e)

  if (store.dragMode === 1) {
    const zone = store.ZONES[store.currentPlayer]
    if (zone.horizontal) {
      store.sliderPos = Math.max(0, Math.min(1, (pos.x - (store.CX - 110)) / 220))
    } else {
      store.sliderPos = Math.max(0, Math.min(1, (pos.y - (store.CY - 110)) / 220))
    }
    store.updateSliderPosition()
  } else if (store.dragMode === 2) {
    store.aimCurX = pos.x
    store.aimCurY = pos.y
  }
}

function handleEnd(e: MouseEvent | TouchEvent): void {
  e.preventDefault()

  if (store.gameState === 'play' && store.dragMode === 2 && store.phase === 1) {
    const dx = store.aimStartX - store.aimCurX
    const dy = store.aimStartY - store.aimCurY
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 140)
    const ang = Math.atan2(dy, dx)

    if (power > 18) {
      store.shoot(power, ang)
    } else {
      store.phase = 0
    }
  }

  store.dragMode = 0

  if (store.gameState === 'play') {
    const pos = getPos(e)
    handleGameInput(pos, false)
  }
}

function handleMenuInput(pos: { x: number; y: number }): void {
  // Player count buttons
  if (pos.y >= 215 && pos.y <= 265) {
    if (pos.x >= store.CX - 130 && pos.x <= store.CX - 10) {
      store.playerCount = 2
      return
    }
    if (pos.x >= store.CX + 10 && pos.x <= store.CX + 130) {
      store.playerCount = 4
      return
    }
  }

  // Quick Play
  if (pos.y >= 310 && pos.y <= 380 && pos.x >= store.CX - 140 && pos.x <= store.CX + 140) {
    if (store.playerCount === 4) {
      store.gameState = 'teams'
    } else {
      store.initGame()
    }
    return
  }

  // Custom Rules
  if (pos.y >= 400 && pos.y <= 470 && pos.x >= store.CX - 140 && pos.x <= store.CX + 140) {
    store.gameState = 'rules'
    store.selectedRule = 0
  }
}

function handleRulesInput(pos: { x: number; y: number }): void {
  const startY = 90
  const rowH = 52

  for (let i = 0; i < store.ruleKeys.length; i++) {
    const y = startY + i * rowH
    if (pos.y >= y && pos.y <= y + 46 && pos.x >= 70 && pos.x <= 650) {
      store.selectedRule = i
      const key = store.ruleKeys[i] as keyof typeof store.rules

      if (pos.x > store.CX + 50) {
        store.setRule(key, 1)
      } else if (pos.x < store.CX - 20) {
        store.setRule(key, -1)
      }
      return
    }
  }

  if (pos.y >= 570 && pos.y <= 620 && pos.x >= store.CX - 100 && pos.x <= store.CX + 100) {
    if (store.is4Player) {
      store.gameState = 'teams'
    } else {
      store.initGame()
    }
  }
}

function handleTeamsInput(pos: { x: number; y: number }): void {
  const positions = [
    { x: store.CX, y: store.CY + 200 },
    { x: store.CX + 200, y: store.CY },
    { x: store.CX, y: store.CY - 200 },
    { x: store.CX - 200, y: store.CY }
  ]

  for (let i = 0; i < 4; i++) {
    if (distSq(pos.x, pos.y, positions[i].x, positions[i].y) < 50 * 50) {
      store.togglePlayerTeam(i)
      return
    }
  }

  const team0Count = store.teamAssign.filter(t => t === 0).length
  if (team0Count === 2 && pos.y >= 580 && pos.y <= 630 && pos.x >= store.CX - 100 && pos.x <= store.CX + 100) {
    store.initGame()
  }
}

function handleGameInput(pos: { x: number; y: number }, isStart: boolean): void {
  if (store.gameOver) {
    if (!isStart) store.gameState = 'menu'
    return
  }
  if (store.phase === 2) return

  const zone = store.ZONES[store.currentPlayer]
  let sliderHit = false

  if (zone.horizontal) {
    const sliderY = zone.y + (store.currentPlayer === 0 ? 45 + 18 : -53 + 18)
    if (Math.abs(pos.y - sliderY) < 30 && pos.x >= store.CX - 130 && pos.x <= store.CX + 130) {
      sliderHit = true
      store.sliderPos = Math.max(0, Math.min(1, (pos.x - (store.CX - 110)) / 220))
    }
  } else {
    const sliderX = zone.x + (store.currentPlayer === 1 ? 45 : -53)
    if (Math.abs(pos.x - sliderX) < 30 && pos.y >= store.CY - 130 && pos.y <= store.CY + 130) {
      sliderHit = true
      store.sliderPos = Math.max(0, Math.min(1, (pos.y - (store.CY - 110)) / 220))
    }
  }

  if (isStart) {
    if (store.phase === 0) {
      if (sliderHit) {
        store.dragMode = 1
        store.updateSliderPosition()
        return
      }
      if (distSq(pos.x, pos.y, store.striker.x, store.striker.y) < (store.STRIKER_R + 35) * (store.STRIKER_R + 35)) {
        store.phase = 1
        store.aimStartX = store.striker.x
        store.aimStartY = store.striker.y
        store.aimCurX = pos.x
        store.aimCurY = pos.y
        store.dragMode = 2
        store.resetTurnTracking()
        return
      }
    }
    if (store.phase === 1) {
      store.aimStartX = store.striker.x
      store.aimStartY = store.striker.y
      store.aimCurX = pos.x
      store.aimCurY = pos.y
      store.dragMode = 2
    }
  }
}

function draw(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (store.gameState === 'menu') {
    rendering.drawMenu(ctx)
  } else if (store.gameState === 'rules') {
    rendering.drawRules(ctx)
  } else if (store.gameState === 'teams') {
    rendering.drawTeams(ctx)
  } else {
    drawGame(ctx)
  }
}

function drawGame(ctx: CanvasRenderingContext2D): void {
  // Draw board
  const boardCanvas = rendering.getBoardCanvas()
  if (boardCanvas) {
    ctx.drawImage(boardCanvas, 0, 0)
  }

  // Draw pieces
  store.pieces.forEach(p => {
    if (!p.sunk) {
      rendering.drawPiece(ctx, p.x, p.y, p.type, store.PIECE_R)
    }
  })

  // Draw striker
  if (store.striker.active) {
    rendering.drawStriker(ctx, store.striker.x, store.striker.y, store.currentPlayer)
  }

  // Draw UI
  if (store.phase === 0) {
    rendering.drawSlider(ctx)
  } else if (store.phase === 1) {
    rendering.drawAim(ctx)
  }

  rendering.drawScores(ctx)

  // Message
  if (store.msgTimer > 0) {
    store.msgTimer--
    ctx.font = 'bold 24px monospace'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(store.message, store.CX, store.CY)
  }

  if (store.gameOver && store.msgTimer < 50) {
    ctx.font = '14px monospace'
    ctx.fillStyle = '#666'
    ctx.fillText('TAP TO MENU', store.CX, store.CY + 30)
  }
}

function gameLoop(): void {
  if (store.gameState === 'play') {
    store.physics()
  }
  draw()
  animationId = requestAnimationFrame(gameLoop)
}

onMounted(() => {
  store.reset()
  rendering.renderBoard()
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
      class="carrom-canvas"
      @mousedown="handleStart"
      @mousemove="handleMove"
      @mouseup="handleEnd"
      @mouseleave="handleEnd"
      @touchstart="handleStart"
      @touchmove="handleMove"
      @touchend="handleEnd"
      @touchcancel="handleEnd"
    />
  </CircularViewport>
</template>

<style scoped>
.carrom-canvas {
  display: block;
  touch-action: none;
  user-select: none;
}
</style>
