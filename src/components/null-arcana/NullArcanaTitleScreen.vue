<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { SIGILS, SUITS, type Sigil, type SuitId } from '@/data/sigils'

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

// Title animation state
const titleSigilIndex = ref(0)
const titleSigilVisible = ref(false)
const randomSigils = ref<Sigil[]>([])
const orbitSigils = ref<{ sigil: Sigil; angle: number; color: string }[]>([])
let titleInterval: ReturnType<typeof setInterval> | null = null
let orbitInterval: ReturnType<typeof setInterval> | null = null

function getSuitColor(suit: SuitId): string {
  return SUITS[suit]?.color || '#fff'
}

// Get current title sigil
const currentTitleSigil = computed(() => {
  const displaySigils = randomSigils.value.slice(6, 12)
  return displaySigils[titleSigilIndex.value % displaySigils.length] || SIGILS[0]
})

function startTitleAnimation(): void {
  randomSigils.value = [...SIGILS].sort(() => Math.random() - 0.5).slice(0, 12)

  // Initialize orbit sigils
  orbitSigils.value = randomSigils.value.slice(0, 6).map((sigil, i) => ({
    sigil,
    angle: (i / 6) * Math.PI * 2,
    color: getSuitColor(sigil.suit)
  }))

  // Cycle through featured sigils
  let idx = 0
  const displaySigils = randomSigils.value.slice(6)

  titleInterval = setInterval(() => {
    titleSigilVisible.value = false
    setTimeout(() => {
      titleSigilIndex.value = idx
      titleSigilVisible.value = true
      idx = (idx + 1) % displaySigils.length
    }, 300)
  }, 3000)

  // Initial display
  titleSigilVisible.value = true

  // Orbit animation
  orbitInterval = setInterval(() => {
    orbitSigils.value = orbitSigils.value.map(o => ({
      ...o,
      angle: o.angle + 0.02
    }))
  }, 50)
}

function stopTitleAnimation(): void {
  if (titleInterval) {
    clearInterval(titleInterval)
    titleInterval = null
  }
  if (orbitInterval) {
    clearInterval(orbitInterval)
    orbitInterval = null
  }
}

function handleClick(): void {
  stopTitleAnimation()
  emit('dismiss')
}

onMounted(() => {
  startTitleAnimation()
})

onUnmounted(() => {
  stopTitleAnimation()
})
</script>

<template>
  <div class="screen title-screen" @click="handleClick">
    <!-- Animated sigil display -->
    <div class="title-sigil-display">
      <!-- Central featured sigil -->
      <div class="title-sigil" :class="{ active: titleSigilVisible }">
        <svg
          viewBox="0 0 100 100"
          :style="{ color: getSuitColor(currentTitleSigil.suit) }"
          v-html="currentTitleSigil.svg"
        />
      </div>

      <!-- Orbiting sigils -->
      <div
        v-for="(orbit, i) in orbitSigils"
        :key="i"
        class="orbit-sigil"
        :style="{
          left: `${200 + Math.cos(orbit.angle) * 150}px`,
          top: `${200 + Math.sin(orbit.angle) * 150}px`,
          color: orbit.color
        }"
      >
        <svg viewBox="0 0 100 100" v-html="orbit.sigil.svg" />
      </div>
    </div>

    <div class="title-sigil-name">{{ currentTitleSigil.name }}</div>

    <div class="title-text">
      <div class="oracle-title">NULL ARCANA</div>
      <div class="oracle-subtitle">THE PATTERN SPEAKS</div>
    </div>
    <div class="title-prompt">TOUCH TO BEGIN</div>
  </div>
</template>

<style scoped>
.screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 50%;
  font-family: 'Courier New', monospace;
  color: #e0e0e0;
}

.title-screen {
  cursor: pointer;
  background: radial-gradient(ellipse at center, rgba(10,10,15,1) 0%, rgba(10,10,15,0.95) 50%, rgba(10,10,15,0.8) 100%);
}

.title-sigil-display {
  position: absolute;
  width: 400px;
  height: 400px;
  top: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-sigil {
  position: absolute;
  opacity: 0;
  transition: all 0.5s ease-out;
}

.title-sigil svg {
  width: 100px;
  height: 100px;
  filter: drop-shadow(0 0 15px currentColor) drop-shadow(0 0 30px currentColor);
}

.title-sigil.active {
  opacity: 1;
  animation: sigil-pulse 0.8s ease-out;
}

@keyframes sigil-pulse {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* Orbiting sigils */
.orbit-sigil {
  position: absolute;
  opacity: 0.4;
  transition: left 0.05s linear, top 0.05s linear;
}

.orbit-sigil svg {
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 0 6px currentColor);
}

.title-sigil-name {
  position: absolute;
  top: 350px;
  font-size: 11px;
  letter-spacing: 4px;
  color: rgba(255,255,255,0.6);
  transition: all 0.3s;
  text-shadow: 0 0 10px rgba(0,0,0,0.9);
}

.title-text {
  position: absolute;
  bottom: 160px;
  z-index: 10;
  text-align: center;
  background: radial-gradient(ellipse at center, rgba(10,10,15,0.9) 0%, transparent 70%);
  padding: 20px 40px;
  border-radius: 20px;
}

.oracle-title {
  font-size: 22px;
  letter-spacing: 6px;
  color: #00ff88;
  text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
  margin-bottom: 8px;
}

.oracle-subtitle {
  font-size: 11px;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.7);
}

.title-prompt {
  position: absolute;
  bottom: 120px;
  font-size: 11px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.5);
  animation: prompt-pulse 2s ease-in-out infinite;
}

@keyframes prompt-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
</style>
