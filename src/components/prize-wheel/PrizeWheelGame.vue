<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { usePrizeWheelStore } from '@/stores/prize-wheel'
import { useSFX } from '@/composables/useSFX'
import CircularViewport from '@/components/core/CircularViewport.vue'

const store = usePrizeWheelStore()
const sfx = useSFX()
const wheelRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

let animationId: number | null = null
// Track the segment under the pointer so we can tick on each crossing; the tick
// rate follows the wheel's speed (fast → rapid clicks, sparse as it settles).
let lastSeg = -1

// Win jingle — fires once when the spin settles on a prize.
watch(() => store.winner, (v) => { if (v) sfx.play('victory') })

// Generate SVG segments
const segments = computed(() => {
  const centerX = 290
  const centerY = 290
  const radius = 280

  return store.prizes.map((prize, i) => {
    const startAngle = (i * store.segmentAngle - 90) * Math.PI / 180
    const endAngle = ((i + 1) * store.segmentAngle - 90) * Math.PI / 180

    const x1 = centerX + radius * Math.cos(startAngle)
    const y1 = centerY + radius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)

    const largeArc = store.segmentAngle > 180 ? 1 : 0
    const d = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    const labelAngle = ((i + 0.5) * store.segmentAngle - 90) * Math.PI / 180
    const labelRadius = radius * 0.65
    const labelX = centerX + labelRadius * Math.cos(labelAngle)
    const labelY = centerY + labelRadius * Math.sin(labelAngle)

    return {
      prize,
      path: d,
      gradientId: `grad${i}`,
      colors: store.colors[i],
      labelX,
      labelY
    }
  })
})

// Generate tick marks
const tickMarks = computed(() => {
  const ticks = []
  for (let i = 0; i < 72; i++) {
    const isMajor = i % 9 === 0
    ticks.push({
      rotation: i * 5,
      isMajor
    })
  }
  return ticks
})

function getAngle(x: number, y: number): number {
  if (!wheelRef.value) return 0
  const rect = wheelRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  return Math.atan2(y - centerY, x - centerX) * (180 / Math.PI)
}

function handlePointerDown(e: MouseEvent): void {
  e.preventDefault()
  store.startDrag(getAngle(e.clientX, e.clientY))
}

function handlePointerMove(e: MouseEvent): void {
  store.updateDrag(getAngle(e.clientX, e.clientY))
}

function handlePointerUp(): void {
  store.endDrag()
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault()
  const touch = e.touches[0]
  store.startDrag(getAngle(touch.clientX, touch.clientY))
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault()
  const touch = e.touches[0]
  store.updateDrag(getAngle(touch.clientX, touch.clientY))
}

function handleTouchEnd(): void {
  store.endDrag()
}

function handleHubClick(e: Event): void {
  e.stopPropagation()
  store.quickSpin()
}

function gameLoop(): void {
  store.update()
  // Tick when the pointer crosses into a new segment (same math as the store's
  // winner calc). Only while spinning, so idle/drag-scrub doesn't chatter.
  if (store.state === 'spinning') {
    const norm = ((store.currentRotation % 360) + 360) % 360
    const pointerAngle = (360 - norm + 270) % 360
    const seg = Math.floor(pointerAngle / store.segmentAngle) % store.prizes.length
    if (seg !== lastSeg) { lastSeg = seg; sfx.play('click') }
  } else {
    lastSeg = -1
  }
  animationId = requestAnimationFrame(gameLoop)
}

onMounted(() => {
  store.reset()
  animationId = requestAnimationFrame(gameLoop)

  // Add global mouse listeners
  document.addEventListener('mousemove', handlePointerMove)
  document.addEventListener('mouseup', handlePointerUp)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  document.removeEventListener('mousemove', handlePointerMove)
  document.removeEventListener('mouseup', handlePointerUp)
})
</script>

<template>
  <CircularViewport>
    <div class="prize-wheel-game" ref="containerRef">
      <!-- Outer ring -->
      <div class="outer-ring"></div>

      <!-- Tick marks -->
      <div class="tick-marks">
        <div
          v-for="(tick, i) in tickMarks"
          :key="i"
          class="tick"
          :class="{ major: tick.isMajor }"
          :style="{ transform: `rotate(${tick.rotation}deg)` }"
        />
      </div>

      <!-- The wheel -->
      <div
        class="wheel"
        ref="wheelRef"
        :style="{ transform: `translate(-50%, -50%) rotate(${store.currentRotation}deg)` }"
        @mousedown="handlePointerDown"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchEnd"
      >
        <svg viewBox="0 0 580 580" width="580" height="580">
          <defs>
            <radialGradient
              v-for="(seg, i) in segments"
              :key="`grad-${i}`"
              :id="seg.gradientId"
              cx="50%"
              cy="50%"
              r="70%"
            >
              <stop offset="0%" :stop-color="seg.colors[0]" />
              <stop offset="100%" :stop-color="seg.colors[1]" />
            </radialGradient>
          </defs>
          <path
            v-for="(seg, i) in segments"
            :key="`seg-${i}`"
            :d="seg.path"
            :fill="`url(#${seg.gradientId})`"
            stroke="#000"
            stroke-width="2"
          />
          <text
            v-for="(seg, i) in segments"
            :key="`text-${i}`"
            :x="seg.labelX"
            :y="seg.labelY"
            class="segment-text"
          >
            {{ seg.prize }}
          </text>
        </svg>
      </div>

      <!-- Center hub -->
      <div
        class="center-hub"
        :class="{ active: store.isDragging }"
        @click="handleHubClick"
        @touchstart.stop
      >
        <span v-if="!store.isDragging">SPIN</span>
        <span v-else class="spinning-text">>>></span>
      </div>

      <!-- Pointer -->
      <div class="pointer">
        <svg viewBox="0 0 50 60" fill="none">
          <defs>
            <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ff0080" />
              <stop offset="100%" stop-color="#ff4499" />
            </linearGradient>
          </defs>
          <path d="M25 60 L5 10 L25 20 L45 10 Z" fill="#ff0080" stroke="#fff" stroke-width="2" />
          <path d="M25 55 L10 15 L25 23 L40 15 Z" fill="url(#pointerGrad)" />
        </svg>
      </div>

      <!-- Winner display -->
      <div class="winner-display" :class="{ show: store.winner }">
        <span>{{ store.winner }}</span>
      </div>

      <!-- Touch hint -->
      <div class="touch-hint" :class="{ hidden: !store.showHint }">
        [ SWIPE TO SPIN ]
      </div>

      <!-- Scanlines -->
      <div class="scanlines"></div>
    </div>
  </CircularViewport>
</template>

<style scoped>
.prize-wheel-game {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #0d1117 0%, #010409 100%);
  border-radius: 50%;
  overflow: hidden;
}

.outer-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid transparent;
  background: linear-gradient(#0d1117, #0d1117) padding-box,
              linear-gradient(135deg, #00ffff, #ff0080, #00ffff) border-box;
  animation: ringPulse 2s ease-in-out infinite;
}

@keyframes ringPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.wheel {
  position: absolute;
  width: 580px;
  height: 580px;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  cursor: grab;
  touch-action: none;
}

.wheel:active {
  cursor: grabbing;
}

.wheel svg {
  position: absolute;
  top: 0;
  left: 0;
}

.segment-text {
  font-family: 'Courier New', monospace;
  font-size: 28px;
  font-weight: bold;
  fill: #000;
  text-anchor: middle;
  dominant-baseline: middle;
  filter: drop-shadow(0 0 4px rgba(255,255,255,0.5));
}

.center-hub {
  position: absolute;
  width: 120px;
  height: 120px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #2a2a3a, #0a0a0f);
  border: 3px solid #00ffff;
  box-shadow:
    0 0 20px rgba(0, 255, 255, 0.5),
    0 0 40px rgba(0, 255, 255, 0.3),
    inset 0 0 20px rgba(0, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: pointer;
  color: #00ffff;
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 3px;
  text-shadow: 0 0 10px #00ffff;
}

.center-hub.active {
  border-color: #ff0080;
  box-shadow:
    0 0 20px rgba(255, 0, 128, 0.5),
    0 0 40px rgba(255, 0, 128, 0.3),
    inset 0 0 20px rgba(255, 0, 128, 0.2);
  color: #ff0080;
  text-shadow: 0 0 10px #ff0080;
}

.spinning-text {
  animation: spinText 0.1s linear infinite;
}

@keyframes spinText {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.pointer {
  position: absolute;
  top: 35px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  filter: drop-shadow(0 0 10px rgba(255, 0, 128, 0.8));
}

.pointer svg {
  width: 50px;
  height: 60px;
}

.winner-display {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid #00ffff;
  padding: 10px 30px;
  border-radius: 5px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 30;
}

.winner-display.show {
  opacity: 1;
  animation: winnerGlow 0.5s ease-in-out infinite alternate;
}

@keyframes winnerGlow {
  from {
    box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff;
    border-color: #00ffff;
  }
  to {
    box-shadow: 0 0 20px #ff0080, 0 0 40px #ff0080;
    border-color: #ff0080;
  }
}

.winner-display span {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.scanlines {
  position: absolute;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
  border-radius: 50%;
}

.touch-hint {
  position: absolute;
  bottom: 140px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(0, 255, 255, 0.5);
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  animation: hintPulse 2s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.touch-hint.hidden {
  display: none;
}

.tick-marks {
  position: absolute;
  width: 620px;
  height: 620px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  pointer-events: none;
}

.tick {
  position: absolute;
  width: 2px;
  height: 15px;
  background: rgba(0, 255, 255, 0.6);
  top: 0;
  left: 50%;
  transform-origin: center 310px;
}

.tick.major {
  height: 25px;
  background: #ff0080;
}
</style>
