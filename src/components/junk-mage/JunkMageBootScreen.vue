<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

const currentSigil = ref(0)
let sigilInterval: ReturnType<typeof setInterval> | null = null

function startAnimation(): void {
  sigilInterval = setInterval(() => {
    currentSigil.value = (currentSigil.value + 1) % 4
  }, 1200)
}

function stopAnimation(): void {
  if (sigilInterval) {
    clearInterval(sigilInterval)
    sigilInterval = null
  }
}

function handleClick(): void {
  emit('dismiss')
}

onMounted(() => {
  startAnimation()
})

onUnmounted(() => {
  stopAnimation()
})
</script>

<template>
  <div class="boot-screen" @click="handleClick">
    <div class="intro-sigil">
      <!-- Sigil 1: Broken Rings -->
      <svg :class="{ active: currentSigil === 0 }" class="sigil" viewBox="0 0 64 64">
        <g class="orbit-ring"><circle cx="32" cy="32" r="28" fill="none" stroke="#4ecdc4" stroke-width="1.5" opacity="0.5"/></g>
        <g class="inner-glyph">
          <circle cx="32" cy="32" r="16" fill="none" stroke="#f1c40f" stroke-width="2" stroke-dasharray="18 8"/>
          <circle cx="32" cy="32" r="10" fill="none" stroke="#f1c40f" stroke-width="2" stroke-dasharray="12 6"/>
          <circle cx="32" cy="32" r="4" fill="#f1c40f"/>
        </g>
        <g class="orbital-dots">
          <circle cx="32" cy="4" r="4" fill="#9b59b6"/>
          <circle cx="60" cy="32" r="4" fill="#3498db"/>
          <circle cx="32" cy="60" r="4" fill="#c94a4a"/>
          <circle cx="4" cy="32" r="4" fill="#2ecc71"/>
        </g>
      </svg>
      <!-- Sigil 2: PCB Spiral -->
      <svg :class="{ active: currentSigil === 1 }" class="sigil" viewBox="0 0 64 64">
        <g class="orbit-ring"><circle cx="32" cy="32" r="28" fill="none" stroke="#4ecdc4" stroke-width="1.5" opacity="0.5"/></g>
        <g class="inner-glyph">
          <path d="M32,32 L32,24 L40,24 L40,40 L24,40 L24,20 L44,20 L44,44 L20,44 L20,16" fill="none" stroke="#f1c40f" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="32" r="3" fill="#f1c40f"/>
        </g>
        <g class="orbital-dots">
          <circle cx="32" cy="4" r="4" fill="#9b59b6"/>
          <circle cx="60" cy="32" r="4" fill="#3498db"/>
          <circle cx="32" cy="60" r="4" fill="#c94a4a"/>
          <circle cx="4" cy="32" r="4" fill="#2ecc71"/>
        </g>
      </svg>
      <!-- Sigil 3: Hex Chip -->
      <svg :class="{ active: currentSigil === 2 }" class="sigil" viewBox="0 0 64 64">
        <g class="orbit-ring"><circle cx="32" cy="32" r="28" fill="none" stroke="#4ecdc4" stroke-width="1.5" opacity="0.5"/></g>
        <g class="inner-glyph">
          <polygon points="32,16 46,24 46,40 32,48 18,40 18,24" fill="none" stroke="#f1c40f" stroke-width="2"/>
          <polygon points="32,22 40,26 40,38 32,42 24,38 24,26" fill="none" stroke="#f1c40f" stroke-width="1.5"/>
          <circle cx="32" cy="32" r="4" fill="#f1c40f"/>
        </g>
        <g class="orbital-dots">
          <circle cx="32" cy="4" r="4" fill="#9b59b6"/>
          <circle cx="60" cy="32" r="4" fill="#3498db"/>
          <circle cx="32" cy="60" r="4" fill="#c94a4a"/>
          <circle cx="4" cy="32" r="4" fill="#2ecc71"/>
        </g>
      </svg>
      <!-- Sigil 4: Waveform -->
      <svg :class="{ active: currentSigil === 3 }" class="sigil" viewBox="0 0 64 64">
        <g class="orbit-ring"><circle cx="32" cy="32" r="28" fill="none" stroke="#4ecdc4" stroke-width="1.5" opacity="0.5"/></g>
        <g class="inner-glyph">
          <path d="M14,32 L20,32 L24,18 L32,46 L40,18 L44,32 L50,32" fill="none" stroke="#f1c40f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <g class="orbital-dots">
          <circle cx="32" cy="4" r="4" fill="#9b59b6"/>
          <circle cx="60" cy="32" r="4" fill="#3498db"/>
          <circle cx="32" cy="60" r="4" fill="#c94a4a"/>
          <circle cx="4" cy="32" r="4" fill="#2ecc71"/>
        </g>
      </svg>
    </div>
    <div class="intro-title">JUNK MAGE</div>
    <div class="intro-subtitle">Salvage. Channel. Survive.</div>
    <div class="intro-start">[ TAP TO BEGIN ]</div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Silkscreen:wght@400;700&display=swap');

.boot-screen {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a12 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  cursor: pointer;
  font-family: 'VT323', monospace;
}

.intro-sigil {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 30px;
}

.intro-sigil .sigil {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.intro-sigil .sigil.active {
  opacity: 1;
}

.intro-sigil .orbit-ring {
  animation: spinOrbitSlow 10s linear infinite;
  transform-origin: 32px 32px;
}

.intro-sigil .orbital-dots {
  animation: spinOrbitFast 3s linear infinite reverse;
  transform-origin: 32px 32px;
}

.intro-sigil .inner-glyph {
  animation: pulseGlow 2s ease-in-out infinite;
  transform-origin: 32px 32px;
}

@keyframes spinOrbitSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spinOrbitFast {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 3px #f1c40f); }
  50% { opacity: 1; filter: drop-shadow(0 0 10px #f1c40f); }
}

.intro-title {
  font-family: 'Silkscreen', monospace;
  font-size: 48px;
  color: #4ecdc4;
  text-shadow: 0 0 20px #4ecdc4, 0 0 40px #4ecdc4;
  letter-spacing: 8px;
  animation: fadeInUp 0.3s ease-out;
}

.intro-subtitle {
  font-size: 18px;
  color: #888;
  margin-top: 10px;
  letter-spacing: 4px;
  animation: fadeInUp 0.3s ease-out 0.6s both;
}

.intro-start {
  font-size: 16px;
  color: #4ecdc4;
  margin-top: 60px;
  animation: blinkText 1.5s ease-in-out infinite, fadeInUp 0.3s ease-out 1s both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blinkText {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
