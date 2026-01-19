<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { useNullArcanaStore } from '@/stores/null-arcana'
import { useNullArcanaAudio } from '@/composables/useNullArcanaAudio'
import { SUITS, type Sigil, type SuitId } from '@/data/sigils'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'
import NullArcanaTitleScreen from './NullArcanaTitleScreen.vue'

const globalStore = useGlobalStore()
const store = useNullArcanaStore()
const audio = useNullArcanaAudio()

// Computed: arrange sigils in a ring
const sigilRing = computed(() => {
  const sigils = store.availableSigils
  const count = sigils.length
  const radius = 220
  const cx = 360
  const cy = 360

  return sigils.map((sigil, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    return { sigil, x, y, angle }
  })
})

// Get suit color
function getSuitColor(suit: SuitId): string {
  return SUITS[suit]?.color || '#fff'
}

// Actions
function dismissTitle(): void {
  audio.init().then(() => {
    audio.setState('awakening')
  })
  store.startOracle()
}

function onSigilClick(sigil: Sigil): void {
  if (store.selectSigil(sigil)) {
    audio.playSigilSound(sigil.suit)
  }
}

function advanceReading(): void {
  audio.playTransition('shift')
  store.advanceReading()
}

function dissolve(): void {
  audio.playTransition('reveal')
  audio.setState('silent')
  store.dissolve()
}

// Current reading phase content
const phaseContent = computed(() => {
  if (!store.currentReading) return null

  const reading = store.currentReading
  const phase = store.readingPhase

  if (phase === 0) {
    return { type: 'opening', title: '', content: reading.opening }
  }

  if (phase <= reading.sections.length) {
    const section = reading.sections[phase - 1]
    return { type: 'section', title: section.title, content: section.content }
  }

  if (phase === reading.sections.length + 1) {
    return { type: 'synthesis', title: 'SYNTHESIS', content: reading.synthesis }
  }

  return { type: 'closing', title: '', content: reading.closing }
})

// Watch oracle state changes for audio
watch(() => store.oracleState, (newState) => {
  switch (newState) {
    case 'awakening':
      audio.setState('awakening')
      break
    case 'selecting':
      audio.setState('selecting')
      break
    case 'processing':
      audio.setState('processing')
      break
    case 'reading':
      audio.setState('reading')
      break
    case 'complete':
      audio.setState('reading')
      break
  }
})

watch(() => store.screen, (newScreen) => {
  if (newScreen === 'title') {
    audio.setState('title')
  }
})

onMounted(() => {
  globalStore.setCurrentGame('null-arcana')
})

onUnmounted(() => {
  audio.stop()
  store.reset()
  globalStore.setCurrentGame(null)
})
</script>

<template>
  <CircularViewport>
    <div class="null-arcana-game">
      <!-- Title Screen -->
      <NullArcanaTitleScreen
        v-if="store.screen === 'title'"
        @dismiss="dismissTitle"
      />

      <!-- Oracle Screen -->
      <div v-else class="oracle-screen">
        <!-- Decorative Rings (animated) -->
        <div class="deco-ring ring-outer" />
        <div class="deco-ring ring-mid" />
        <div class="deco-ring ring-inner" />

        <!-- Oracle Eye -->
        <div class="oracle-eye" :class="store.oracleState" />

        <!-- Oracle Text (greetings, transitions) -->
        <div class="oracle-text top" :class="{ visible: store.oracleTextVisible }">
          {{ store.oracleText }}
        </div>

        <!-- Sigil Ring (selection phase) -->
        <div class="sigil-ring" :class="{ visible: store.oracleState === 'selecting' }">
          <div
            v-for="item in sigilRing"
            :key="item.sigil.id"
            class="sigil-slot"
            :class="{ dimmed: store.selectedSigils.length >= 3 }"
            :style="{
              left: `${item.x - 27.5}px`,
              top: `${item.y - 27.5}px`
            }"
            @click="onSigilClick(item.sigil)"
          >
            <svg
              viewBox="0 0 100 100"
              :style="{ color: getSuitColor(item.sigil.suit) }"
              v-html="item.sigil.svg"
            />
          </div>
        </div>

        <!-- Selected Sigils Display -->
        <div class="selected-sigils" :class="{ visible: store.selectedSigils.length > 0 }">
          <div
            v-for="(sigil, i) in store.selectedSigils"
            :key="sigil.id"
            class="selected-sigil revealed"
          >
            <span class="position-label">{{ ['ROOT', 'PROCESS', 'EMERGE'][i] }}</span>
            <svg
              viewBox="0 0 100 100"
              :style="{ color: getSuitColor(sigil.suit) }"
              v-html="sigil.svg"
            />
            <span class="sigil-name">{{ sigil.name }}</span>
          </div>
        </div>

        <!-- Selection hint -->
        <div v-if="store.oracleState === 'selecting'" class="selection-hint">
          Select {{ 3 - store.selectedSigils.length }} more sigil{{ store.selectedSigils.length < 2 ? 's' : '' }}
        </div>

        <!-- Reading Display -->
        <div
          v-if="store.oracleState === 'reading' && phaseContent"
          class="reading-display visible"
          @click="advanceReading"
        >
          <div v-if="phaseContent.title" class="reading-title">{{ phaseContent.title }}</div>
          <div class="reading-content">{{ phaseContent.content }}</div>
          <div class="reading-tap">tap to continue</div>
        </div>

        <!-- Complete State -->
        <div v-if="store.oracleState === 'complete'" class="complete-screen">
          <div class="complete-title">The Reading Is Complete</div>
          <div class="complete-sigils">
            <div
              v-for="sigil in store.selectedSigils"
              :key="sigil.id"
              class="complete-sigil"
            >
              <svg
                viewBox="0 0 100 100"
                :style="{ color: getSuitColor(sigil.suit) }"
                v-html="sigil.svg"
              />
            </div>
          </div>
          <button class="action-btn" @click="dissolve">DISSOLVE</button>
        </div>
      </div>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.null-arcana-game {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #0a0a0f 0%, #050508 70%, #000 100%);
  font-family: 'Courier New', monospace;
  color: #e0e0e0;
}

/* Oracle Screen */
.oracle-screen {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Decorative Rings (animated) */
.deco-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid;
  opacity: 0.15;
  pointer-events: none;
}

.ring-outer {
  width: 580px;
  height: 580px;
  border-color: #00ff88;
  animation: ring-rotate 60s linear infinite;
}

.ring-mid {
  width: 420px;
  height: 420px;
  border-color: #00ffff;
  animation: ring-rotate 45s linear infinite reverse;
}

.ring-inner {
  width: 260px;
  height: 260px;
  border-color: #ffaa00;
  animation: ring-rotate 30s linear infinite;
}

@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Oracle Eye */
.oracle-eye {
  position: absolute;
  border-radius: 50%;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 5;
}

.oracle-eye.dormant {
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(0, 255, 136, 0.4) 0%, transparent 70%);
  animation: dormant-pulse 4s ease-in-out infinite;
}

.oracle-eye.awakening {
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, rgba(170, 68, 255, 0.15) 50%, transparent 70%);
  animation: awaken-pulse 1s ease-out;
}

.oracle-eye.selecting {
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(240, 240, 232, 0.2) 0%, rgba(255, 170, 0, 0.1) 30%, transparent 70%);
  animation: active-glow 2s ease-in-out infinite;
}

.oracle-eye.processing {
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(255, 0, 170, 0.2) 0%, rgba(170, 68, 255, 0.1) 40%, transparent 70%);
  animation: processing-spin 1s linear infinite;
}

.oracle-eye.reading,
.oracle-eye.complete {
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, rgba(255, 0, 170, 0.15) 0%, rgba(170, 68, 255, 0.1) 40%, transparent 70%);
  animation: reading-intense 0.5s ease-in-out infinite;
}

@keyframes dormant-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes awaken-pulse {
  0% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 0.8; transform: scale(1.2); }
  100% { opacity: 0.6; transform: scale(1); }
}

@keyframes active-glow {
  0%, 100% { opacity: 0.5; filter: blur(15px); }
  50% { opacity: 0.7; filter: blur(20px); }
}

@keyframes processing-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes reading-intense {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.6; }
}

/* Oracle Text */
.oracle-text {
  position: absolute;
  width: 400px;
  text-align: center;
  color: #ffffff;
  font-size: 15px;
  line-height: 1.6;
  padding: 20px;
  opacity: 0;
  transition: opacity 0.5s;
  z-index: 60;
  text-shadow: 0 0 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7);
  background: radial-gradient(ellipse at center, rgba(10,10,15,0.85) 0%, rgba(10,10,15,0.4) 70%, transparent 100%);
  border-radius: 20px;
  pointer-events: none;
}

.oracle-text.visible { opacity: 1; }
.oracle-text.top { top: 120px; }

/* Sigil Ring */
.sigil-ring {
  position: absolute;
  width: 720px;
  height: 720px;
  opacity: 0;
  transition: opacity 0.8s;
  pointer-events: none;
}

.sigil-ring.visible {
  opacity: 1;
  pointer-events: auto;
}

.sigil-slot {
  position: absolute;
  width: 55px;
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(10,10,15,0.7) 0%, transparent 70%);
}

.sigil-slot:hover,
.sigil-slot:active {
  transform: scale(1.3);
  z-index: 100;
  background: radial-gradient(ellipse at center, rgba(10,10,15,0.9) 0%, transparent 70%);
}

.sigil-slot.selected {
  animation: selected-pulse 0.5s ease-out;
}

.sigil-slot.dimmed {
  opacity: 0.2;
  pointer-events: none;
}

@keyframes selected-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.5); }
  100% { transform: scale(0); opacity: 0; }
}

.sigil-slot svg {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 0 8px currentColor) drop-shadow(0 0 3px currentColor);
  transition: all 0.3s;
  pointer-events: none;
}

.sigil-slot:hover svg,
.sigil-slot:active svg {
  filter: drop-shadow(0 0 15px currentColor) drop-shadow(0 0 5px currentColor);
}

/* Selected Sigils */
.selected-sigils {
  position: absolute;
  top: 100px;
  display: flex;
  gap: 30px;
  justify-content: center;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s;
  z-index: 55;
}

.selected-sigils.visible {
  opacity: 1;
  pointer-events: auto;
}

.selected-sigil {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(10,10,15,0.85) 0%, transparent 70%);
  border-radius: 10px;
  padding: 8px;
  opacity: 0;
  transform: scale(0);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.selected-sigil.revealed {
  opacity: 1;
  transform: scale(1);
}

.selected-sigil svg {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 0 10px currentColor);
}

.position-label {
  font-size: 8px;
  letter-spacing: 2px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 3px;
  text-shadow: 0 0 10px rgba(0,0,0,0.9);
}

.sigil-name {
  font-size: 9px;
  letter-spacing: 1px;
  margin-top: 5px;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(0,0,0,0.9);
}

/* Selection hint */
.selection-hint {
  position: absolute;
  bottom: 100px;
  font-size: 12px;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.5);
}

/* Reading Display */
.reading-display {
  position: absolute;
  width: 480px;
  height: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s;
  z-index: 70;
  padding: 50px;
  text-align: center;
  background: radial-gradient(ellipse at center, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.7) 60%, transparent 100%);
  border-radius: 50%;
  cursor: pointer;
}

.reading-display.visible {
  opacity: 1;
  pointer-events: auto;
}

.reading-title {
  font-size: 13px;
  letter-spacing: 3px;
  margin-bottom: 15px;
  color: #ffaa00;
  text-shadow: 0 0 10px currentColor;
}

.reading-content {
  font-size: 14px;
  line-height: 1.7;
  color: #ffffff;
  max-height: 260px;
  overflow-y: auto;
  padding: 10px;
  text-shadow: 0 0 15px rgba(0,0,0,0.8);
  white-space: pre-wrap;
}

.reading-content::-webkit-scrollbar {
  width: 4px;
}

.reading-content::-webkit-scrollbar-track {
  background: transparent;
}

.reading-content::-webkit-scrollbar-thumb {
  background: #00ff88;
  border-radius: 2px;
}

.reading-tap {
  margin-top: 20px;
  font-size: 10px;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.4);
  animation: prompt-pulse 2s ease-in-out infinite;
}

/* Complete Screen */
.complete-screen {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 80;
}

.complete-title {
  font-size: 16px;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 30px;
}

.complete-sigils {
  display: flex;
  gap: 20px;
  margin-bottom: 40px;
}

.complete-sigil svg {
  width: 60px;
  height: 60px;
  filter: drop-shadow(0 0 15px currentColor);
}

/* Action Button */
.action-btn {
  padding: 14px 28px;
  background: rgba(10, 10, 15, 0.9);
  border: 2px solid #00ff88;
  color: #ffffff;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  letter-spacing: 3px;
  cursor: pointer;
  transition: all 0.3s;
  text-shadow: 0 0 10px #00ff88;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3), inset 0 0 20px rgba(0, 255, 136, 0.1);
}

.action-btn:hover,
.action-btn:active {
  background: #00ff88;
  color: #0a0a0f;
  text-shadow: none;
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
}

/* Glitch effect for transitions */
.glitch {
  animation: glitch 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes glitch {
  0% { filter: none; }
  20% { filter: hue-rotate(90deg) saturate(2); transform: translate(-2px, 1px); }
  40% { filter: hue-rotate(-90deg) saturate(0.5); transform: translate(2px, -1px); }
  60% { filter: hue-rotate(180deg); transform: translate(-1px, 2px); }
  80% { filter: hue-rotate(-180deg) saturate(1.5); transform: translate(1px, -2px); }
  100% { filter: none; transform: translate(0, 0); }
}
</style>
