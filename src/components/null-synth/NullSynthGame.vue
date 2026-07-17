<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNullSynthStore, type SuitId } from '@/stores/null-synth'
import CircularViewport from '@/components/core/CircularViewport.vue'
import NullSynthTitleScreen from './NullSynthTitleScreen.vue'

const store = useNullSynthStore()
const xyPadRef = ref<HTMLDivElement | null>(null)
const cursorRef = ref<HTMLDivElement | null>(null)
let isXYActive = false

// Track recently triggered pads for flash animation
const triggeredPads = ref<Set<string>>(new Set())

// Keyboard mappings (matching original HTML)
const KEY_TO_NOTE: Record<string, number> = {
  'a': 0, 's': 1, 'd': 2, 'f': 3, 'g': 4, 'h': 5,
  'j': 6, 'k': 7, 'l': 8, ';': 9, "'": 10, 'z': 11
}
const KEY_TO_SUIT: Record<string, SuitId> = {
  '1': 'circuit', '2': 'signal', '3': 'code',
  '4': 'maker', '5': 'emergence', '6': 'glitch'
}

// Generate pad positions in 3 rings
const padPositions = computed(() => {
  const centerX = 360
  const centerY = 360
  const rings = [
    { count: 12, radius: 105, offset: 0 },
    { count: 12, radius: 165, offset: Math.PI / 12 },
    { count: 12, radius: 225, offset: 0 }
  ]

  const positions: Array<{
    x: number
    y: number
    sigil: (typeof store.allSigils)[number]
    note: number
    index: number
  }> = []

  let sigilIndex = 0

  rings.forEach(ring => {
    for (let i = 0; i < ring.count && sigilIndex < store.allSigils.length; i++) {
      const sigil = store.allSigils[sigilIndex]
      const angle = (i / ring.count) * Math.PI * 2 - Math.PI / 2 + ring.offset
      const x = centerX + Math.cos(angle) * ring.radius
      const y = centerY + Math.sin(angle) * ring.radius

      positions.push({
        x,
        y,
        sigil,
        note: sigilIndex % 12,
        index: sigilIndex
      })
      sigilIndex++
    }
  })

  return positions
})

// Sequencer step positions
const sequencerSteps = computed(() => {
  const centerX = 350
  const centerY = 350
  const radius = 290
  const steps: Array<{ x: number; y: number; index: number }> = []

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 - Math.PI / 2
    steps.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      index: i
    })
  }

  return steps
})

function handlePadTrigger(pad: (typeof padPositions.value)[0], e: Event): void {
  e.preventDefault()
  const padKey = `${pad.sigil.suit}-${pad.sigil.key}`
  store.triggerPad(pad.note, pad.sigil.suit, padKey)

  // Trigger flash animation
  triggeredPads.value.add(padKey)
  setTimeout(() => {
    triggeredPads.value.delete(padKey)
  }, 150)
}

function handlePadRelease(pad: (typeof padPositions.value)[0]): void {
  const padKey = `${pad.sigil.suit}-${pad.sigil.key}`
  store.clearPad(padKey)
}

function handleXYStart(e: MouseEvent | TouchEvent): void {
  e.preventDefault()
  isXYActive = true
  xyPadRef.value?.classList.add('active')
  updateXYCursor(e)
}

function handleXYMove(e: MouseEvent | TouchEvent): void {
  if (!isXYActive) return
  updateXYCursor(e)
}

function handleXYEnd(): void {
  isXYActive = false
  xyPadRef.value?.classList.remove('active')
}

function updateXYCursor(e: MouseEvent | TouchEvent): void {
  if (!xyPadRef.value || !cursorRef.value) return

  const rect = xyPadRef.value.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  let clientX: number, clientY: number
  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else if ('clientX' in e) {
    clientX = e.clientX
    clientY = e.clientY
  } else {
    return
  }

  let x = clientX - rect.left
  let y = clientY - rect.top

  const dx = x - centerX
  const dy = y - centerY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const maxDist = rect.width / 2 - 10

  if (dist > maxDist) {
    x = centerX + (dx / dist) * maxDist
    y = centerY + (dy / dist) * maxDist
  }

  cursorRef.value.style.left = `${x}px`
  cursorRef.value.style.top = `${y}px`

  store.setFilterParams(
    Math.max(0, Math.min(1, x / rect.width)),
    Math.max(0, Math.min(1, y / rect.height))
  )
}

function handleStepClick(step: (typeof sequencerSteps.value)[0]): void {
  if (store.sequence[step.index]) {
    store.clearStep(step.index)
  }
}

function handleBpmChange(delta: number): void {
  store.setBpm(store.bpm + delta)
}

// Keyboard controls
const activeKeyPads = new Set<string>()

function handleKeyDown(e: KeyboardEvent): void {
  if (store.showTitle) return

  const key = e.key.toLowerCase()

  // Note keys (A-L, ;, ', Z)
  if (KEY_TO_NOTE[key] !== undefined && !activeKeyPads.has(key)) {
    e.preventDefault()
    activeKeyPads.add(key)
    const note = KEY_TO_NOTE[key]
    const padKey = `keyboard-${note}`
    store.triggerPad(note, store.currentSuit, padKey)

    // Trigger flash animation for keyboard
    triggeredPads.value.add(padKey)
    setTimeout(() => {
      triggeredPads.value.delete(padKey)
    }, 150)
  }

  // Suit keys (1-6)
  if (KEY_TO_SUIT[key]) {
    e.preventDefault()
    store.setSuit(KEY_TO_SUIT[key])
  }

  // BPM controls
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    handleBpmChange(5)
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    handleBpmChange(-5)
  }

  // Spacebar to toggle play
  if (e.key === ' ') {
    e.preventDefault()
    store.toggleSequencer()
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  const key = e.key.toLowerCase()
  if (KEY_TO_NOTE[key] !== undefined) {
    activeKeyPads.delete(key)
    const note = KEY_TO_NOTE[key]
    const padKey = `keyboard-${note}`
    store.clearPad(padKey)
  }
}

function isPadActive(pad: (typeof padPositions.value)[0]): boolean {
  return store.activePads.has(`${pad.sigil.suit}-${pad.sigil.key}`)
}

function isPadTriggered(pad: (typeof padPositions.value)[0]): boolean {
  const padKey = `${pad.sigil.suit}-${pad.sigil.key}`
  // Also check keyboard triggers by matching note index
  const note = pad.index % 12
  return triggeredPads.value.has(padKey) || triggeredPads.value.has(`keyboard-${note}`)
}

onMounted(() => {
  store.reset()

  // Global event listeners
  document.addEventListener('mousemove', handleXYMove)
  document.addEventListener('mouseup', handleXYEnd)
  document.addEventListener('touchmove', handleXYMove as EventListener)
  document.addEventListener('touchend', handleXYEnd)

  // Keyboard event listeners
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleXYMove)
  document.removeEventListener('mouseup', handleXYEnd)
  document.removeEventListener('touchmove', handleXYMove as EventListener)
  document.removeEventListener('touchend', handleXYEnd)

  // Keyboard event listeners
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)

  store.dispose()   // tear down the bellows engine (unsub clock → panic → dispose)
})
</script>

<template>
  <CircularViewport>
    <div class="null-synth-game">
      <div class="bg-grid"></div>
      <div class="bg-hex"></div>

      <!-- Title overlay -->
      <NullSynthTitleScreen v-if="store.showTitle" @start="store.start" />

      <template v-if="!store.showTitle">
        <!-- BPM control -->
        <div class="edge-control bpm-control">
          <button class="ctrl-btn" @click="handleBpmChange(-5)">-</button>
          <div class="bpm-display">{{ store.bpm }} BPM</div>
          <button class="ctrl-btn" @click="handleBpmChange(5)">+</button>
        </div>

        <!-- Play control -->
        <div class="edge-control play-control">
          <button
            class="ctrl-btn"
            :class="{ active: store.isPlaying }"
            @click="store.toggleSequencer"
          >
            {{ store.isPlaying ? '■' : '▶' }}
          </button>
          <button class="ctrl-btn danger" @click="store.clearSequence">✕</button>
        </div>

        <!-- Sequencer ring -->
        <div class="sequencer-ring">
          <div
            v-for="step in sequencerSteps"
            :key="step.index"
            class="seq-step"
            :class="{
              playing: store.currentStep === step.index && store.isPlaying,
              recorded: store.sequence[step.index] !== null
            }"
            :style="{
              left: `${step.x - 10}px`,
              top: `${step.y - 10}px`,
              borderColor: store.sequence[step.index] ? store.SUIT_COLORS[store.sequence[step.index]!.suit] : undefined,
              color: store.sequence[step.index] ? store.SUIT_COLORS[store.sequence[step.index]!.suit] : undefined
            }"
            @click="handleStepClick(step)"
          >
            <span v-if="!store.sequence[step.index]" class="step-number">{{ step.index + 1 }}</span>
          </div>
        </div>

        <!-- Synth pads -->
        <div class="pad-container">
          <div
            v-for="pad in padPositions"
            :key="pad.index"
            class="synth-pad"
            :class="[pad.sigil.suit, { active: isPadActive(pad), triggered: isPadTriggered(pad) }]"
            :style="{ left: `${pad.x - 26}px`, top: `${pad.y - 26}px` }"
            @mousedown="handlePadTrigger(pad, $event)"
            @touchstart="handlePadTrigger(pad, $event)"
            @mouseup="handlePadRelease(pad)"
            @mouseleave="handlePadRelease(pad)"
            @touchend="handlePadRelease(pad)"
            v-html="pad.sigil.svg"
          />
        </div>

        <!-- Center XY Pad -->
        <div
          class="center-hub"
          ref="xyPadRef"
          @mousedown="handleXYStart"
          @touchstart="handleXYStart"
        >
          <div class="xy-crosshair-h"></div>
          <div class="xy-crosshair-v"></div>
          <div class="xy-cursor" ref="cursorRef"></div>
          <div
            class="suit-indicator"
            :style="{ color: store.SUIT_COLORS[store.currentSuit] }"
          >
            {{ store.currentSuit.toUpperCase() }}
          </div>
        </div>
      </template>

      <!-- CRT effects -->
      <div class="crt-effects">
        <div class="phosphor-mask"></div>
        <div class="scanlines"></div>
        <div class="scan-beam"></div>
        <div class="glass-bubble"></div>
        <div class="vignette"></div>
      </div>
    </div>
  </CircularViewport>
</template>

<style scoped>
.null-synth-game {
  position: relative;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(ellipse at center, rgba(0,255,136,0.04) 0%, transparent 50%),
    radial-gradient(circle at 25% 25%, rgba(0,255,255,0.03) 0%, transparent 25%),
    radial-gradient(circle at 75% 75%, rgba(255,0,170,0.03) 0%, transparent 25%),
    #0a0a0f;
  border-radius: 50%;
  overflow: hidden;
}

.bg-grid {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image:
    radial-gradient(circle at center, transparent 0%, transparent 18%, rgba(0,255,136,0.035) 18.5%, transparent 19%),
    radial-gradient(circle at center, transparent 0%, transparent 38%, rgba(0,255,136,0.025) 38.5%, transparent 39%),
    radial-gradient(circle at center, transparent 0%, transparent 58%, rgba(0,255,136,0.02) 58.5%, transparent 59%),
    radial-gradient(circle at center, transparent 0%, transparent 78%, rgba(0,255,136,0.015) 78.5%, transparent 79%);
  animation: bg-pulse 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes bg-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.bg-hex {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0.02;
  pointer-events: none;
}

/* Edge Controls */
.edge-control {
  position: absolute;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(10,10,15,0.95);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(0,255,136,0.3);
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

.bpm-control {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.play-control {
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.ctrl-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0,255,136,0.1);
  border: 2px solid rgba(0,255,136,0.5);
  color: #00ff88;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ctrl-btn:hover {
  background: rgba(0,255,136,0.2);
  box-shadow: 0 0 15px rgba(0,255,136,0.5);
  transform: scale(1.1);
}

.ctrl-btn.active {
  background: #00ff88 !important;
  color: #0a0a0f !important;
  box-shadow: 0 0 25px #00ff88;
}

.ctrl-btn.danger {
  border-color: rgba(255,51,68,0.5);
  color: #ff3344;
  background: rgba(255,51,68,0.1);
}

.ctrl-btn.danger:hover {
  background: rgba(255,51,68,0.2);
  box-shadow: 0 0 15px rgba(255,51,68,0.5);
}

.bpm-display {
  font-size: 11px;
  color: #00ff88;
  text-shadow: 0 0 10px #00ff88;
  min-width: 65px;
  text-align: center;
}

/* Synth Pads */
.pad-container {
  position: absolute;
  width: 720px;
  height: 720px;
  pointer-events: none;
}

.synth-pad {
  position: absolute;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
  background: rgba(10,10,15,0.9);
  border: 2px solid;
}

.synth-pad:hover {
  transform: scale(1.2);
  z-index: 50;
}

.synth-pad.active {
  transform: scale(1.25);
  z-index: 50;
}

.synth-pad.triggered {
  animation: pad-flash 0.15s ease-out;
}

@keyframes pad-flash {
  0% {
    filter: brightness(2) saturate(1.5);
    box-shadow: 0 0 40px currentColor, 0 0 60px currentColor;
  }
  100% {
    filter: brightness(1) saturate(1);
  }
}

.synth-pad :deep(svg) {
  width: 26px;
  height: 26px;
  pointer-events: none;
  filter: drop-shadow(0 0 3px currentColor);
}

.synth-pad:hover :deep(svg),
.synth-pad.active :deep(svg) {
  filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor);
}

/* Suit colors */
.synth-pad.circuit { border-color: #ffaa00; color: #ffaa00; }
.synth-pad.circuit:hover, .synth-pad.circuit.active {
  background: radial-gradient(circle, rgba(255,170,0,0.4) 0%, rgba(10,10,15,0.9) 70%);
  box-shadow: 0 0 25px rgba(255,170,0,0.5);
}

.synth-pad.signal { border-color: #00ffff; color: #00ffff; }
.synth-pad.signal:hover, .synth-pad.signal.active {
  background: radial-gradient(circle, rgba(0,255,255,0.4) 0%, rgba(10,10,15,0.9) 70%);
  box-shadow: 0 0 25px rgba(0,255,255,0.5);
}

.synth-pad.code { border-color: #aa44ff; color: #aa44ff; }
.synth-pad.code:hover, .synth-pad.code.active {
  background: radial-gradient(circle, rgba(170,68,255,0.4) 0%, rgba(10,10,15,0.9) 70%);
  box-shadow: 0 0 25px rgba(170,68,255,0.5);
}

.synth-pad.maker { border-color: #ff3344; color: #ff3344; }
.synth-pad.maker:hover, .synth-pad.maker.active {
  background: radial-gradient(circle, rgba(255,51,68,0.4) 0%, rgba(10,10,15,0.9) 70%);
  box-shadow: 0 0 25px rgba(255,51,68,0.5);
}

.synth-pad.emergence { border-color: #00ff88; color: #00ff88; }
.synth-pad.emergence:hover, .synth-pad.emergence.active {
  background: radial-gradient(circle, rgba(0,255,136,0.4) 0%, rgba(10,10,15,0.9) 70%);
  box-shadow: 0 0 25px rgba(0,255,136,0.5);
}

.synth-pad.glitch { border-color: #ff00aa; color: #ff00aa; }
.synth-pad.glitch:hover, .synth-pad.glitch.active {
  background: radial-gradient(circle, rgba(255,0,170,0.4) 0%, rgba(10,10,15,0.9) 70%);
  box-shadow: 0 0 25px rgba(255,0,170,0.5);
}

/* Sequencer */
.sequencer-ring {
  position: absolute;
  width: 700px;
  height: 700px;
  pointer-events: none;
}

.seq-step {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(10,10,15,0.95);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.seq-step .step-number {
  font-size: 7px;
  color: rgba(255,255,255,0.25);
  pointer-events: none;
}

.seq-step.recorded .step-number { display: none; }

.seq-step.recorded::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.seq-step.playing {
  transform: scale(1.5);
  box-shadow: 0 0 20px #00ff88;
  border-color: #00ff88 !important;
  z-index: 100;
}

/* Center XY Pad */
.center-hub {
  position: absolute;
  width: 140px;
  height: 140px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(0,255,136,0.1) 0%, rgba(10,10,15,0.98) 70%);
  border: 2px solid rgba(0,255,136,0.5);
  box-shadow:
    0 0 50px rgba(0,0,0,0.8),
    0 0 30px rgba(0,255,136,0.15),
    inset 0 0 40px rgba(0,255,136,0.08);
  cursor: crosshair;
  transition: all 0.3s;
}

.center-hub:hover, .center-hub.active {
  border-color: #00ff88;
  box-shadow:
    0 0 50px rgba(0,0,0,0.8),
    0 0 40px rgba(0,255,136,0.4),
    inset 0 0 60px rgba(0,255,136,0.15);
}

.xy-cursor {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #00ff88;
  box-shadow: 0 0 15px #00ff88, 0 0 30px #00ff88;
  pointer-events: none;
  transform: translate(-50%, -50%);
  left: 50%;
  top: 50%;
}

.xy-crosshair-h, .xy-crosshair-v {
  position: absolute;
  background: rgba(0,255,136,0.25);
  pointer-events: none;
}

.xy-crosshair-h { width: 100%; height: 1px; top: 50%; left: 0; }
.xy-crosshair-v { width: 1px; height: 100%; left: 50%; top: 0; }

.suit-indicator {
  position: absolute;
  bottom: 18px;
  font-size: 8px;
  letter-spacing: 2px;
  text-shadow: 0 0 10px currentColor;
  pointer-events: none;
}

/* CRT Effects */
.crt-effects {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 100;
  pointer-events: none;
  border-radius: 50%;
  overflow: hidden;
}

.phosphor-mask {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-image:
    radial-gradient(ellipse 33% 100% at 16% 50%, rgba(255, 0, 0, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse 33% 100% at 50% 50%, rgba(0, 255, 0, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse 33% 100% at 84% 50%, rgba(0, 100, 255, 0.06) 0%, transparent 50%);
  background-size: 3px 3px;
  mix-blend-mode: screen;
}

.scanlines {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px, transparent 2px,
    rgba(0, 0, 0, 0.04) 2px, rgba(0, 0, 0, 0.04) 4px
  );
}

.scan-beam {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(
    to bottom,
    transparent 0%, transparent 45%,
    rgba(255, 255, 255, 0.01) 50%,
    transparent 55%, transparent 100%
  );
  animation: beam-roll 5s linear infinite;
}

@keyframes beam-roll {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

.glass-bubble {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background:
    radial-gradient(ellipse 45% 35% at 30% 25%, rgba(255, 255, 255, 0.03) 0%, transparent 60%),
    radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.15) 75%, rgba(0, 0, 0, 0.4) 90%, rgba(0, 0, 0, 0.7) 100%);
  border-radius: 50%;
}

.vignette {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border-radius: 50%;
  box-shadow:
    inset 0 0 80px 20px rgba(0, 0, 0, 0.5),
    inset 0 0 150px 40px rgba(0, 0, 0, 0.25);
}
</style>
