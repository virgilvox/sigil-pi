import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type WheelState = 'idle' | 'dragging' | 'spinning' | 'result'

export const usePrizeWheelStore = defineStore('prize-wheel', () => {
  // Configuration
  const prizes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  const colors: [string, string][] = [
    ['#00ffff', '#00cccc'],
    ['#ff0080', '#cc0066'],
    ['#00ff88', '#00cc6a'],
    ['#ffff00', '#cccc00'],
    ['#ff6600', '#cc5200'],
    ['#aa00ff', '#8800cc'],
    ['#ff3333', '#cc2929'],
    ['#33ff33', '#29cc29'],
    ['#3399ff', '#297acc'],
    ['#ff66ff', '#cc52cc']
  ]
  const segmentAngle = 360 / prizes.length

  // State
  const state = ref<WheelState>('idle')
  const currentRotation = ref(0)
  const velocity = ref(0)
  const winner = ref<string | null>(null)
  const showHint = ref(true)

  // Drag tracking
  const isDragging = ref(false)
  const lastAngle = ref(0)
  const angularVelocities = ref<number[]>([])
  const lastTime = ref(0)

  // Computed
  const isSpinning = computed(() => state.value === 'spinning')

  // Actions
  function startDrag(angle: number): void {
    isDragging.value = true
    state.value = 'dragging'
    velocity.value = 0
    lastAngle.value = angle
    lastTime.value = performance.now()
    angularVelocities.value = []
    showHint.value = false
    winner.value = null
  }

  function updateDrag(angle: number): void {
    if (!isDragging.value) return

    let deltaAngle = angle - lastAngle.value

    // Handle wrap-around
    if (deltaAngle > 180) deltaAngle -= 360
    if (deltaAngle < -180) deltaAngle += 360

    currentRotation.value += deltaAngle

    // Track velocity
    const now = performance.now()
    const dt = now - lastTime.value
    if (dt > 0) {
      const instantVelocity = deltaAngle / dt * 1000
      angularVelocities.value.push(instantVelocity)
      if (angularVelocities.value.length > 5) {
        angularVelocities.value.shift()
      }
    }

    lastAngle.value = angle
    lastTime.value = now
  }

  function endDrag(): void {
    if (!isDragging.value) return
    isDragging.value = false

    // Calculate average velocity
    if (angularVelocities.value.length > 0) {
      velocity.value = angularVelocities.value.reduce((a, b) => a + b, 0) / angularVelocities.value.length
    }

    // Clamp velocity
    const maxVelocity = 800
    velocity.value = Math.max(-maxVelocity, Math.min(maxVelocity, velocity.value))

    if (Math.abs(velocity.value) > 30) {
      state.value = 'spinning'
    } else {
      state.value = 'idle'
    }
  }

  function quickSpin(): void {
    showHint.value = false
    winner.value = null
    velocity.value = 600 + Math.random() * 400
    if (Math.random() > 0.5) velocity.value *= -1
    state.value = 'spinning'
  }

  function update(): void {
    if (state.value !== 'spinning') return

    const friction = 0.97
    const minVelocity = 8

    velocity.value *= friction
    currentRotation.value += velocity.value * 0.016

    if (Math.abs(velocity.value) <= minVelocity) {
      velocity.value = 0
      state.value = 'result'
      calculateWinner()
    }
  }

  function calculateWinner(): void {
    // Normalize rotation to 0-360
    let normalizedRotation = ((currentRotation.value % 360) + 360) % 360

    // The pointer is at the top (270 degrees in standard position)
    // Adjust for where the pointer points
    const pointerAngle = (360 - normalizedRotation + 270) % 360

    // Find which segment
    const segmentIndex = Math.floor(pointerAngle / segmentAngle) % prizes.length
    winner.value = prizes[segmentIndex]

    // Reset hint after delay
    setTimeout(() => {
      showHint.value = true
    }, 3000)
  }

  function reset(): void {
    state.value = 'idle'
    currentRotation.value = 0
    velocity.value = 0
    winner.value = null
    showHint.value = true
    isDragging.value = false
    angularVelocities.value = []
  }

  return {
    // Config
    prizes,
    colors,
    segmentAngle,

    // State
    state,
    currentRotation,
    velocity,
    winner,
    showHint,
    isDragging,

    // Computed
    isSpinning,

    // Actions
    startDrag,
    updateDrag,
    endDrag,
    quickSpin,
    update,
    reset
  }
})
