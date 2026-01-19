import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type GamePhase = 'title' | 'playing' | 'gameover'

const RUNES = ['◈', '◇', '△', '▽', '○', '☽', '✧', '⬡', '⬢', '✕', '∞', '◯']

interface Rune {
  symbol: string
  angle: number
  glow: number
  aligned: boolean
}

interface Ring {
  radius: number
  width: number
  rotation: number
  velocity: number
  runes: Rune[]
  grabbed: boolean
  drift: number
}

interface TargetRune {
  ring: number
  rune: number
  symbol: string
}

interface Beam {
  angle: number
  life: number
  rings: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
}

// Audio context
let audioCtx: AudioContext | null = null

function initAudio(): void {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15): void {
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + duration)
}

function playAlign(): void {
  playTone(440, 0.15, 'sine', 0.1)
  setTimeout(() => playTone(554, 0.1, 'sine', 0.08), 50)
}

function playCast(): void {
  playTone(220, 0.3, 'triangle', 0.15)
  playTone(440, 0.25, 'sine', 0.1)
  setTimeout(() => playTone(660, 0.2, 'sine', 0.12), 80)
  setTimeout(() => playTone(880, 0.3, 'sine', 0.08), 150)
}

function playFail(): void {
  playTone(150, 0.2, 'sawtooth', 0.08)
}

export const useSigilEngineStore = defineStore('sigil-engine', () => {
  const CX = 360
  const CY = 360

  // State
  const phase = ref<GamePhase>('title')
  const level = ref(1)
  const score = ref(0)
  const combo = ref(0)
  const maxCombo = ref(0)
  const timeLeft = ref(30)
  const castCooldown = ref(0)
  const screenShake = ref(0)
  const message = ref('')
  const messageTimer = ref(0)

  const rings = ref<Ring[]>([])
  const beams = ref<Beam[]>([])
  const particles = ref<Particle[]>([])
  const targetRunes = ref<TargetRune[]>([])
  const targetAngle = ref(0)

  // Drag state
  const dragRingIndex = ref<number | null>(null)
  const lastDragAngle = ref(0)

  // Computed
  const ringCount = computed(() => rings.value.length)

  // Actions
  function createRing(radius: number, width: number, runeCount: number, drift = 0): Ring {
    const runes: Rune[] = []
    for (let i = 0; i < runeCount; i++) {
      runes.push({
        symbol: RUNES[Math.floor(Math.random() * RUNES.length)],
        angle: (i / runeCount) * Math.PI * 2,
        glow: 0,
        aligned: false
      })
    }

    return {
      radius,
      width,
      rotation: Math.random() * Math.PI * 2,
      velocity: 0,
      runes,
      grabbed: false,
      drift
    }
  }

  function generateTarget(): void {
    targetAngle.value = Math.random() * Math.PI * 2
    targetRunes.value = []

    rings.value.forEach((ring, i) => {
      const runeIndex = Math.floor(Math.random() * ring.runes.length)
      targetRunes.value.push({
        ring: i,
        rune: runeIndex,
        symbol: ring.runes[runeIndex].symbol
      })
    })
  }

  function initLevel(lvl: number): void {
    rings.value = []
    beams.value = []
    particles.value = []
    targetRunes.value = []
    phase.value = 'playing'
    castCooldown.value = 0
    level.value = lvl

    const ringCount = Math.min(2 + Math.floor(lvl / 2), 5)
    const baseRadius = 280
    const ringSpacing = 55
    const baseDrift = lvl > 3 ? 0.1 + (lvl - 3) * 0.05 : 0

    for (let i = 0; i < ringCount; i++) {
      const radius = baseRadius - i * ringSpacing
      const runeCount = 6 + i
      const drift = (i % 2 === 0 ? 1 : -1) * baseDrift * (i + 1) * 0.3
      rings.value.push(createRing(radius, 45, runeCount, drift))
    }

    generateTarget()
    timeLeft.value = 20 + lvl * 5
    showMessage(`LEVEL ${lvl}`)
  }

  function showMessage(msg: string): void {
    message.value = msg
    messageTimer.value = 90
  }

  function spawnParticles(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 4
      const size = 2 + Math.random() * 4
      particles.value.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5
      })
    }
  }

  function getWorldAngle(ringIndex: number, runeIndex: number): number {
    const ring = rings.value[ringIndex]
    return ring.runes[runeIndex].angle + ring.rotation
  }

  function checkAlignment(): { allAligned: boolean; alignedCount: number } {
    const tolerance = 0.15
    let allAligned = true
    let alignedCount = 0

    targetRunes.value.forEach(target => {
      const ring = rings.value[target.ring]
      const rune = ring.runes[target.rune]
      const worldAngle = getWorldAngle(target.ring, target.rune)

      let diff = worldAngle - targetAngle.value
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2

      if (Math.abs(diff) < tolerance) {
        rune.aligned = true
        rune.glow = Math.max(rune.glow, 0.8)
        alignedCount++
      } else {
        rune.aligned = false
        allAligned = false
      }
    })

    return { allAligned, alignedCount }
  }

  function cast(): void {
    if (castCooldown.value > 0) return

    const result = checkAlignment()

    if (result.allAligned) {
      combo.value++
      maxCombo.value = Math.max(maxCombo.value, combo.value)

      const basePoints = 100 * rings.value.length
      const comboBonus = combo.value > 1 ? combo.value * 50 : 0
      const timeBonus = Math.floor(timeLeft.value * 2)
      score.value += basePoints + comboBonus + timeBonus

      screenShake.value = 15
      playCast()

      beams.value.push({
        angle: targetAngle.value,
        life: 1,
        rings: rings.value.length
      })

      spawnParticles(CX, CY, 30 + combo.value * 10, 'rgba(255, 230, 150, 1)')

      rings.value.forEach(ring => {
        const x = CX + Math.cos(targetAngle.value) * ring.radius
        const y = CY + Math.sin(targetAngle.value) * ring.radius
        spawnParticles(x, y, 15, 'rgba(255, 200, 100, 1)')
      })

      showMessage(combo.value > 1 ? `×${combo.value} CHAIN!` : 'CAST!')

      setTimeout(() => {
        if (phase.value === 'playing') generateTarget()
      }, 400)

      castCooldown.value = 0.5
    } else if (result.alignedCount > 0) {
      playAlign()
      showMessage(`${result.alignedCount}/${rings.value.length}`)
      castCooldown.value = 0.2
    } else {
      combo.value = 0
      playFail()
      screenShake.value = 5
      showMessage('MISALIGNED')
      castCooldown.value = 0.3
    }
  }

  function startDrag(ringIndex: number, angle: number): void {
    initAudio()

    if (phase.value === 'title') {
      initLevel(1)
      return
    }

    if (phase.value === 'gameover') {
      phase.value = 'title'
      score.value = 0
      combo.value = 0
      maxCombo.value = 0
      level.value = 1
      return
    }

    if (phase.value !== 'playing') return

    dragRingIndex.value = ringIndex
    if (ringIndex !== null && ringIndex >= 0) {
      rings.value[ringIndex].grabbed = true
      lastDragAngle.value = angle
    }
  }

  function updateDrag(angle: number): void {
    if (dragRingIndex.value === null || dragRingIndex.value < 0) return

    const ring = rings.value[dragRingIndex.value]
    let delta = angle - lastDragAngle.value

    if (delta > Math.PI) delta -= Math.PI * 2
    if (delta < -Math.PI) delta += Math.PI * 2

    ring.rotation += delta
    ring.velocity = delta * 0.5
    lastDragAngle.value = angle

    checkAlignment()
  }

  function endDrag(): void {
    if (dragRingIndex.value !== null && dragRingIndex.value >= 0) {
      rings.value[dragRingIndex.value].grabbed = false
    }
    dragRingIndex.value = null
  }

  function handleCenterTap(): void {
    initAudio()

    if (phase.value === 'title') {
      initLevel(1)
      return
    }

    if (phase.value === 'gameover') {
      phase.value = 'title'
      score.value = 0
      combo.value = 0
      maxCombo.value = 0
      level.value = 1
      return
    }

    if (phase.value === 'playing') {
      cast()
    }
  }

  function update(dt: number): void {
    if (messageTimer.value > 0) messageTimer.value -= dt * 60
    if (castCooldown.value > 0) castCooldown.value -= dt
    if (screenShake.value > 0) screenShake.value *= 0.9

    // Update rings
    rings.value.forEach(ring => {
      if (!ring.grabbed) {
        ring.rotation += ring.velocity
        ring.velocity *= 0.92
        ring.rotation += ring.drift * dt
      }

      while (ring.rotation > Math.PI * 2) ring.rotation -= Math.PI * 2
      while (ring.rotation < 0) ring.rotation += Math.PI * 2

      ring.runes.forEach(rune => {
        rune.glow *= 0.9
      })
    })

    // Update beams
    beams.value.forEach(beam => {
      beam.life -= dt * 2
    })
    beams.value = beams.value.filter(b => b.life > 0)

    // Update particles
    particles.value.forEach(p => {
      p.x += p.vx * dt * 60
      p.y += p.vy * dt * 60
      p.vx *= 0.98
      p.vy *= 0.98
      p.life -= dt
    })
    particles.value = particles.value.filter(p => p.life > 0)

    // Timer
    if (phase.value === 'playing') {
      timeLeft.value -= dt
      if (timeLeft.value <= 0) {
        phase.value = 'gameover'
      }

      // Level up
      const levelThreshold = level.value * 500
      if (score.value >= levelThreshold && combo.value > 0) {
        level.value++
        initLevel(level.value)
      }
    }
  }

  function reset(): void {
    phase.value = 'title'
    level.value = 1
    score.value = 0
    combo.value = 0
    maxCombo.value = 0
    timeLeft.value = 30
    castCooldown.value = 0
    screenShake.value = 0
    message.value = ''
    messageTimer.value = 0
    rings.value = []
    beams.value = []
    particles.value = []
    targetRunes.value = []
    targetAngle.value = 0
    dragRingIndex.value = null
  }

  return {
    // Constants
    CX,
    CY,

    // State
    phase,
    level,
    score,
    combo,
    maxCombo,
    timeLeft,
    castCooldown,
    screenShake,
    message,
    messageTimer,
    rings,
    beams,
    particles,
    targetRunes,
    targetAngle,
    dragRingIndex,

    // Computed
    ringCount,

    // Actions
    initLevel,
    showMessage,
    spawnParticles,
    checkAlignment,
    cast,
    startDrag,
    updateDrag,
    endDrag,
    handleCenterTap,
    update,
    reset
  }
})
