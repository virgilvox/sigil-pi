<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRobotFaceStore } from '@/stores/robot-face'
import CircularViewport from '@/components/core/CircularViewport.vue'

const store = useRobotFaceStore()
const displayRef = ref<HTMLDivElement | null>(null)

let animationId: number | null = null
let idleInterval: ReturnType<typeof setInterval> | null = null
let blinkInterval: ReturnType<typeof setInterval> | null = null
let decayInterval: ReturnType<typeof setInterval> | null = null
let particleInterval: ReturnType<typeof setInterval> | null = null

// Particle system
interface Particle {
  id: number
  x: number
  y: number
  duration: number
}

interface Heart {
  id: number
  x: number
  y: number
}

interface Ripple {
  id: number
  x: number
  y: number
}

const particles = ref<Particle[]>([])
const hearts = ref<Heart[]>([])
const ripples = ref<Ripple[]>([])
let particleId = 0
let heartId = 0
let rippleId = 0

function createParticle(): void {
  const particle: Particle = {
    id: particleId++,
    x: 100 + Math.random() * 480,
    y: 100 + Math.random() * 480,
    duration: 2 + Math.random() * 2
  }
  particles.value.push(particle)
  setTimeout(() => {
    particles.value = particles.value.filter(p => p.id !== particle.id)
  }, 4000)
}

function createHeart(x: number, y: number): void {
  const heart: Heart = {
    id: heartId++,
    x,
    y
  }
  hearts.value.push(heart)
  setTimeout(() => {
    hearts.value = hearts.value.filter(h => h.id !== heart.id)
  }, 1500)
}

function createRipple(x: number, y: number): void {
  const ripple: Ripple = {
    id: rippleId++,
    x,
    y
  }
  ripples.value.push(ripple)
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== ripple.id)
  }, 600)
}

const eyeStyle = computed(() => ({
  transform: `translate(${store.currentEyeX}px, ${store.currentEyeY}px)`
}))

const faceContainerClass = computed(() => {
  const classes = ['face-container']
  if (store.faceAnimation !== 'none') {
    classes.push(store.faceAnimation)
  }
  return classes
})

function handleTap(e: MouseEvent | TouchEvent): void {
  e.preventDefault()

  if (!displayRef.value) return

  const rect = displayRef.value.getBoundingClientRect()
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

  const x = clientX - rect.left
  const y = clientY - rect.top

  // Create tap ripple effect
  createRipple(x, y)

  // Check if this is an affection action (cheek tap)
  const cheekLeft = x > 100 && x < 200 && y > 280 && y < 380
  const cheekRight = x > 520 && x < 620 && y > 280 && y < 380

  if (cheekLeft || cheekRight) {
    createHeart(x, y)
  }

  store.handleTap(x, y, rect.width, rect.height)
}

function gameLoop(): void {
  store.updateEyePosition()
  animationId = requestAnimationFrame(gameLoop)
}

function autoBlink(): void {
  if (!store.isAsleep) {
    store.blink()
  }
}

function initialGreeting(): void {
  store.setExpression('happy')
  store.setMouth('smile')
  store.showMessage('HELLO FRIEND')
  setTimeout(() => {
    store.setExpression('normal')
    store.setMouth('neutral')
  }, 2000)
}

// Watch for heart spawn requests from store
watch(() => store.heartsToSpawn, (count) => {
  if (count > 0) {
    // Create hearts with staggered delay (100ms apart for excited, 150ms for headpat)
    const delay = count === 6 ? 100 : 150
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        // Random position around the face area
        const x = 200 + Math.random() * 280
        const y = 200 + Math.random() * 280
        createHeart(x, y)
      }, i * delay)
    }
    // Reset after spawning
    store.heartsToSpawn = 0
  }
})

onMounted(() => {
  store.reset()

  // Start game loop
  animationId = requestAnimationFrame(gameLoop)

  // Start idle behaviors
  idleInterval = setInterval(() => {
    store.idleBehavior()
  }, 1500 + Math.random() * 3000)

  // Auto blink
  blinkInterval = setInterval(autoBlink, 2000 + Math.random() * 4000)

  // Affection decay
  decayInterval = setInterval(() => {
    store.affectionDecay()
  }, 5000)

  // Initial greeting
  setTimeout(initialGreeting, 500)

  // Ambient particles
  particleInterval = setInterval(createParticle, 1000)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (idleInterval) clearInterval(idleInterval)
  if (blinkInterval) clearInterval(blinkInterval)
  if (decayInterval) clearInterval(decayInterval)
  if (particleInterval) clearInterval(particleInterval)
})
</script>

<template>
  <CircularViewport>
    <div
      class="robot-face-game"
      ref="displayRef"
      @click="handleTap"
      @touchstart="handleTap"
    >
      <div class="scanlines"></div>
      <div class="status-ring" :class="store.statusColor"></div>
      <div class="antenna-glow"></div>

      <div :class="faceContainerClass">
        <div class="cheek left" :class="store.cheekState"></div>
        <div class="cheek right" :class="store.cheekState"></div>
        <div class="zzz" :class="{ visible: store.showZzz }">Z z z</div>

        <div class="eyes">
          <div class="eye" :class="store.expression">
            <div class="eyelid"></div>
            <div class="eye-inner" :style="eyeStyle">
              <div class="pupil"></div>
            </div>
          </div>
          <div class="eye" :class="store.expression">
            <div class="eyelid"></div>
            <div class="eye-inner" :style="eyeStyle">
              <div class="pupil"></div>
            </div>
          </div>
        </div>

        <div class="mouth-area">
          <div class="mouth" :class="store.mouthState"></div>
        </div>

        <div class="text-display" :class="{ visible: store.textVisible }">
          {{ store.displayText }}
        </div>
      </div>

      <div class="affection-meter" :class="{ visible: store.showAffectionMeter }">
        <div class="affection-fill" :style="{ width: `${store.affection}%` }"></div>
      </div>

      <!-- Ambient particles -->
      <div
        v-for="particle in particles"
        :key="particle.id"
        class="particle"
        :style="{
          left: `${particle.x}px`,
          top: `${particle.y}px`,
          animationDuration: `${particle.duration}s`
        }"
      />

      <!-- Hearts for affection -->
      <div
        v-for="heart in hearts"
        :key="heart.id"
        class="heart"
        :style="{
          left: `${heart.x}px`,
          top: `${heart.y}px`
        }"
      >❤️</div>

      <!-- Tap ripples -->
      <div
        v-for="ripple in ripples"
        :key="ripple.id"
        class="tap-ripple"
        :style="{
          left: `${ripple.x}px`,
          top: `${ripple.y}px`
        }"
      />

      <!-- Thinking dots -->
      <div class="thinking-dots" :class="{ visible: store.isThinking }">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  </CircularViewport>
</template>

<style scoped>
.robot-face-game {
  width: 100%;
  height: 100%;
  position: relative;
  background: radial-gradient(circle at 30% 30%, #1a1a2e 0%, #0a0a12 100%);
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
}

.scanlines {
  position: absolute;
  top: 0;
  left: 0;
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
  z-index: 100;
  opacity: 0.3;
}

.face-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.face-container.nudge-left { transform: translateX(-8px) rotate(-2deg); }
.face-container.nudge-right { transform: translateX(8px) rotate(2deg); }
.face-container.nudge-up { transform: translateY(-8px); }
.face-container.nudge-down { transform: translateY(8px); }
.face-container.wiggle { animation: wiggle 0.5s ease; }
.face-container.bounce { animation: petBounce 0.4s ease; }
.face-container.nuzzle { animation: nuzzle 0.6s ease; }

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}

@keyframes petBounce {
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.05) translateY(-10px); }
}

@keyframes nuzzle {
  0%, 100% { transform: rotate(0deg) translateX(0); }
  25% { transform: rotate(-8deg) translateX(-15px); }
  75% { transform: rotate(8deg) translateX(15px); }
}

.status-ring {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: #00ffc8;
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(0, 255, 200, 0.8);
  animation: pulse 2s ease infinite;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.status-ring.happy {
  background: #ff6b9d;
  box-shadow: 0 0 20px rgba(255, 100, 150, 0.8);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.5; transform: translateX(-50%) scale(1.2); }
}

.antenna-glow {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 200, 0.5), transparent);
}

.eyes {
  display: flex;
  gap: 80px;
  margin-top: -40px;
  position: relative;
}

.eye {
  width: 140px;
  height: 140px;
  background: #0f0f18;
  border-radius: 30px;
  position: relative;
  overflow: hidden;
  box-shadow:
    inset 0 0 30px rgba(0, 255, 200, 0.1),
    0 0 20px rgba(0, 255, 200, 0.2);
  border: 3px solid rgba(0, 255, 200, 0.3);
  transition: all 0.3s ease;
}

.eye-inner {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease-out;
}

.pupil {
  width: 70px;
  height: 70px;
  background: radial-gradient(circle at 30% 30%, #00ffc8, #00aa88);
  border-radius: 50%;
  position: relative;
  box-shadow:
    0 0 30px rgba(0, 255, 200, 0.6),
    0 0 60px rgba(0, 255, 200, 0.3);
  transition: all 0.3s ease;
}

.pupil::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  top: 12px;
  left: 12px;
  transition: all 0.3s ease;
}

.pupil::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  bottom: 15px;
  right: 15px;
}

.eyelid {
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  height: 0%;
  background: linear-gradient(180deg, #0a0a12, #1a1a2e);
  border-bottom: 3px solid rgba(0, 255, 200, 0.5);
  transition: height 0.08s ease-in;
  z-index: 10;
}

.eye.blink .eyelid { height: 103%; }
.eye.happy { border-radius: 30px 30px 60px 60px; }
.eye.suspicious .eyelid { height: 40%; }
.eye.wide .pupil { width: 90px; height: 90px; }
.eye.tiny .pupil { width: 30px; height: 30px; }
.eye.love .pupil {
  background: radial-gradient(circle at 30% 30%, #ff6b9d, #ff4777);
  box-shadow: 0 0 30px rgba(255, 100, 150, 0.6), 0 0 60px rgba(255, 100, 150, 0.3);
}
.eye.sparkle .pupil::after {
  animation: sparkle 0.3s ease infinite;
}

@keyframes sparkle {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.5); opacity: 1; }
}

.mouth-area {
  margin-top: 50px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.mouth {
  width: 120px;
  height: 8px;
  background: rgba(0, 255, 200, 0.6);
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(0, 255, 200, 0.4);
  transition: all 0.3s ease;
}

.mouth.talking { animation: talk 0.15s ease infinite; }
.mouth.smile {
  width: 100px;
  height: 50px;
  background: transparent;
  border: 4px solid rgba(0, 255, 200, 0.6);
  border-top: none;
  border-radius: 0 0 60px 60px;
  box-shadow: 0 0 20px rgba(0, 255, 200, 0.3);
}
.mouth.big-smile {
  width: 140px;
  height: 70px;
  background: transparent;
  border: 5px solid rgba(0, 255, 200, 0.8);
  border-top: none;
  border-radius: 0 0 80px 80px;
  box-shadow: 0 0 30px rgba(0, 255, 200, 0.5);
}
.mouth.open {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #0a0a12;
  border: 4px solid rgba(0, 255, 200, 0.6);
}
.mouth.small-o {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #0a0a12;
  border: 3px solid rgba(0, 255, 200, 0.6);
}
.mouth.cat {
  width: 50px;
  height: 25px;
  background: transparent;
  border: none;
  position: relative;
}
.mouth.cat::before, .mouth.cat::after {
  content: '';
  position: absolute;
  width: 30px;
  height: 15px;
  border: 3px solid rgba(0, 255, 200, 0.6);
  border-top: none;
  border-radius: 0 0 30px 30px;
  top: 0;
}
.mouth.cat::before { left: -5px; }
.mouth.cat::after { right: -5px; }

@keyframes talk {
  0%, 100% { height: 8px; width: 120px; }
  50% { height: 30px; width: 80px; border-radius: 20px; }
}

.text-display {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Courier New', monospace;
  font-size: 28px;
  color: #00ffc8;
  text-shadow: 0 0 20px rgba(0, 255, 200, 0.8);
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.text-display.visible { opacity: 1; }

.cheek {
  position: absolute;
  width: 40px;
  height: 25px;
  background: rgba(255, 100, 150, 0.3);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.cheek.left { left: 120px; top: 50%; }
.cheek.right { right: 120px; top: 50%; }
.cheek.visible { opacity: 1; }
.cheek.intense {
  opacity: 1;
  background: rgba(255, 100, 150, 0.5);
  width: 50px;
  height: 30px;
}

.affection-meter {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 6px;
  background: rgba(0, 255, 200, 0.2);
  border-radius: 3px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.affection-meter.visible { opacity: 1; }

.affection-fill {
  height: 100%;
  background: linear-gradient(90deg, #00ffc8, #ff6b9d);
  border-radius: 3px;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(0, 255, 200, 0.5);
}

.zzz {
  position: absolute;
  top: 80px;
  right: 150px;
  font-family: 'Courier New', monospace;
  font-size: 24px;
  color: rgba(0, 255, 200, 0.6);
  opacity: 0;
  pointer-events: none;
}

.zzz.visible {
  animation: sleepZ 2s ease-in-out infinite;
}

@keyframes sleepZ {
  0%, 100% { opacity: 0; transform: translateY(0) scale(0.8); }
  50% { opacity: 1; transform: translateY(-20px) scale(1); }
}

/* Ambient particles */
.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(0, 255, 200, 0.6);
  border-radius: 50%;
  pointer-events: none;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
  50% { transform: translateY(-20px) scale(1.5); opacity: 1; }
}

/* Hearts for affection */
.heart {
  position: absolute;
  font-size: 30px;
  pointer-events: none;
  animation: floatHeart 1.5s ease-out forwards;
  z-index: 200;
}

@keyframes floatHeart {
  0% { transform: translateY(0) scale(0); opacity: 1; }
  50% { transform: translateY(-50px) scale(1.2); opacity: 1; }
  100% { transform: translateY(-120px) scale(0.8); opacity: 0; }
}

/* Tap ripple effect */
.tap-ripple {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 3px solid rgba(0, 255, 200, 0.6);
  background: transparent;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0);
  animation: ripple 0.6s ease-out forwards;
  z-index: 150;
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
  }
}

/* Thinking dots animation */
.thinking-dots {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 60px);
  display: flex;
  gap: 12px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.thinking-dots.visible {
  opacity: 1;
}

.thinking-dots .dot {
  width: 16px;
  height: 16px;
  background: rgba(0, 255, 200, 0.6);
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite;
}

.thinking-dots .dot:nth-child(1) { animation-delay: 0s; }
.thinking-dots .dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-20px);
    opacity: 1;
  }
}
</style>
