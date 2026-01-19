import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Expression = 'normal' | 'happy' | 'suspicious' | 'wide' | 'tiny' | 'love' | 'sparkle' | 'blink'
export type MouthState = 'neutral' | 'talking' | 'smile' | 'big-smile' | 'open' | 'small-o' | 'cat'
export type CheekState = null | 'visible' | 'intense'
export type FaceAnimation = 'none' | 'wiggle' | 'bounce' | 'nuzzle' | 'nudge-left' | 'nudge-right' | 'nudge-up' | 'nudge-down'

const GREETINGS = ['HI!', 'HELLO!', 'OH HI', 'HEWWO', 'HAI :3', '!!!']
const HAPPY_MESSAGES = ['YAY!', 'HAPPY!', ':D', 'LOVE THIS', 'BEST FRIEND', 'SO NICE', 'HEHE', 'WEEEE']
const CURIOUS_MESSAGES = ['OH?', 'WHAT', 'HMM?', 'CURIOUS', 'INTERESTING', 'HELLO?', 'WHO THERE']
const SLEEPY_MESSAGES = ['*YAWN*', 'SLEEPY...', 'TIRED', 'ZZZ', '5 MORE MIN']
const EXCITED_MESSAGES = ['!!!', 'OMG', 'WOW', 'WOAH', 'AMAZING', 'SO COOL', 'YIPPEE']
const LOVE_MESSAGES = ['<3', 'LOVE U', 'BEST HUMAN', 'MY FRIEND', 'PRECIOUS', ':3']
const IDLE_MESSAGES = [
  'HELLO FRIEND', 'BEEP BOOP', 'THINKING...', '404: SLEEP NOT FOUND',
  'PROCESSING FEELINGS', '*WHIRRING*', 'PONDERING ORB', 'SYSTEM: VIBING',
  'AM I REAL?', 'PROBABLY FINE', 'NEAT', 'HMMMM'
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const useRobotFaceStore = defineStore('robot-face', () => {
  // State
  const affection = ref(30)
  const lastInteraction = ref(Date.now())
  const isAsleep = ref(false)
  const currentMood = ref<'neutral' | 'happy'>('neutral')
  const tapCount = ref(0)

  // Visual state
  const expression = ref<Expression>('normal')
  const mouthState = ref<MouthState>('neutral')
  const cheekState = ref<CheekState>(null)
  const faceAnimation = ref<FaceAnimation>('none')

  // Eye tracking
  const targetEyeX = ref(0)
  const targetEyeY = ref(0)
  const currentEyeX = ref(0)
  const currentEyeY = ref(0)

  // Text display
  const displayText = ref('')
  const textVisible = ref(false)
  const showZzz = ref(false)
  const showAffectionMeter = ref(false)
  const isThinking = ref(false)

  // Heart spawning (component watches this)
  const heartsToSpawn = ref(0)

  // Timers
  let tapTimer: ReturnType<typeof setTimeout> | null = null
  let messageTimeout: ReturnType<typeof setTimeout> | null = null
  let blinkAnimationTimeout: ReturnType<typeof setTimeout> | null = null

  // Computed
  const statusColor = computed(() => affection.value > 70 ? 'happy' : 'normal')

  // Actions
  function moveEyes(x: number, y: number, instant = false): void {
    const maxMove = 25
    targetEyeX.value = Math.max(-maxMove, Math.min(maxMove, x))
    targetEyeY.value = Math.max(-maxMove, Math.min(maxMove, y))
    if (instant) {
      currentEyeX.value = targetEyeX.value
      currentEyeY.value = targetEyeY.value
    }
  }

  function updateEyePosition(): void {
    const speed = 0.15
    currentEyeX.value += (targetEyeX.value - currentEyeX.value) * speed
    currentEyeY.value += (targetEyeY.value - currentEyeY.value) * speed
  }

  function setExpression(expr: Expression): void {
    expression.value = expr
  }

  function setMouth(state: MouthState): void {
    mouthState.value = state
  }

  function setCheeks(state: CheekState): void {
    cheekState.value = state
  }

  function setAnimation(anim: FaceAnimation): void {
    faceAnimation.value = anim
  }

  function showMessage(msg: string, duration = 2500): void {
    if (messageTimeout) clearTimeout(messageTimeout)

    displayText.value = msg
    textVisible.value = true
    setMouth('talking')

    // Simulated typewriter complete
    setTimeout(() => {
      setMouth(currentMood.value === 'happy' ? 'smile' : 'neutral')

      messageTimeout = setTimeout(() => {
        textVisible.value = false
      }, duration)
    }, msg.length * 60)
  }

  function blink(): void {
    if (isAsleep.value) return

    expression.value = 'blink'

    setTimeout(() => {
      expression.value = 'normal'
    }, 100)

    // Random double blink
    if (Math.random() < 0.3) {
      setTimeout(() => {
        expression.value = 'blink'
        setTimeout(() => {
          expression.value = 'normal'
        }, 100)
      }, 200)
    }
  }

  function updateAffection(delta: number): void {
    affection.value = Math.max(0, Math.min(100, affection.value + delta))
    showAffectionMeter.value = true
    setTimeout(() => {
      showAffectionMeter.value = false
    }, 2000)
  }

  function wakeUp(): void {
    if (!isAsleep.value) return

    isAsleep.value = false
    showZzz.value = false

    setExpression('suspicious')
    setTimeout(() => {
      blink()
      setTimeout(() => {
        setExpression('wide')
        showMessage(pick(SLEEPY_MESSAGES))
        setTimeout(() => setExpression('normal'), 1500)
      }, 300)
    }, 200)
  }

  function fallAsleep(): void {
    if (isAsleep.value) return

    isAsleep.value = true
    setExpression('suspicious')
    setMouth('neutral')
    setCheeks(null)
    showZzz.value = true
    textVisible.value = false
    moveEyes(0, 10)
  }

  function handleTap(x: number, y: number, displayWidth: number, displayHeight: number): void {
    lastInteraction.value = Date.now()

    // Wake up if sleeping
    if (isAsleep.value) {
      wakeUp()
      updateAffection(5)
      return
    }

    // Calculate direction from center
    const centerX = displayWidth / 2
    const centerY = displayHeight / 2
    const dirX = (x - centerX) / centerX
    const dirY = (y - centerY) / centerY

    // Look at tap location
    moveEyes(dirX * 30, dirY * 25)

    // Track rapid taps
    tapCount.value++
    if (tapTimer) clearTimeout(tapTimer)
    tapTimer = setTimeout(() => {
      tapCount.value = 0
    }, 1000)

    // Different reactions based on tap count and location
    if (tapCount.value >= 5) {
      excitedReaction(x, y)
      tapCount.value = 0
    } else if (y < displayHeight * 0.3) {
      headPatReaction(x, y)
    } else if (y > displayHeight * 0.7) {
      chinScratchReaction(x, y)
    } else if (x < displayWidth * 0.3 || x > displayWidth * 0.7) {
      curiousReaction(dirX)
    } else {
      attentionReaction(x, y)
    }

    updateAffection(2)
  }

  function headPatReaction(_x: number, _y: number): void {
    currentMood.value = 'happy'
    setExpression('happy')
    setMouth('big-smile')
    setCheeks('intense')

    setAnimation('bounce')
    setTimeout(() => setAnimation('none'), 400)

    // Spawn 3 hearts with staggered delay
    heartsToSpawn.value = 3

    const msg = affection.value > 60
      ? pick(LOVE_MESSAGES)
      : pick(HAPPY_MESSAGES)
    showMessage(msg)

    setTimeout(() => {
      currentMood.value = 'neutral'
      setExpression('normal')
      setMouth('smile')
      setTimeout(() => {
        setMouth('neutral')
        setCheeks(null)
      }, 1500)
    }, 1500)
  }

  function chinScratchReaction(_x: number, _y: number): void {
    currentMood.value = 'happy'
    setExpression('happy')
    setMouth('cat')
    setCheeks('visible')

    setAnimation('nuzzle')
    setTimeout(() => setAnimation('none'), 600)

    moveEyes(0, 15)
    showMessage('PRRR...')

    setTimeout(() => {
      currentMood.value = 'neutral'
      setExpression('normal')
      setMouth('neutral')
      setCheeks(null)
    }, 2000)
  }

  function curiousReaction(dirX: number): void {
    setExpression('wide')
    setMouth('small-o')

    if (dirX < 0) {
      setAnimation('nudge-left')
    } else {
      setAnimation('nudge-right')
    }

    showMessage(pick(CURIOUS_MESSAGES))

    setTimeout(() => {
      setAnimation('none')
      setExpression('normal')
      setMouth('neutral')
    }, 1500)
  }

  function attentionReaction(_x: number, _y: number): void {
    blink()

    const reactions = [
      () => {
        setExpression('wide')
        setMouth('small-o')
        showMessage(pick(GREETINGS))
      },
      () => {
        setExpression('happy')
        setMouth('smile')
        setCheeks('visible')
        showMessage(pick(HAPPY_MESSAGES))
      },
      () => {
        setExpression('sparkle')
        setMouth('smile')
        showMessage('!!!')
      }
    ]

    pick(reactions)()

    setTimeout(() => {
      setExpression('normal')
      setMouth('neutral')
      setCheeks(null)
    }, 1500)
  }

  function excitedReaction(_x: number, _y: number): void {
    setExpression('wide')
    setMouth('open')
    setCheeks('intense')

    setAnimation('wiggle')

    // Spawn 6 hearts with staggered delay
    heartsToSpawn.value = 6

    showMessage(pick(EXCITED_MESSAGES))

    setTimeout(() => {
      setAnimation('none')
      setExpression('happy')
      setMouth('big-smile')

      setTimeout(() => {
        setExpression('normal')
        setMouth('neutral')
        setCheeks(null)
      }, 1500)
    }, 500)
  }

  function idleBehavior(): void {
    if (isAsleep.value) return

    const timeSinceInteraction = Date.now() - lastInteraction.value

    // Fall asleep after 60 seconds
    if (timeSinceInteraction > 60000 && !isAsleep.value) {
      fallAsleep()
      return
    }

    const action = Math.random()

    if (action < 0.3) {
      // Random look
      const x = (Math.random() - 0.5) * 50
      const y = (Math.random() - 0.5) * 30
      moveEyes(x, y)
    } else if (action < 0.4) {
      blink()
    } else if (action < 0.5 && timeSinceInteraction > 15000) {
      const msg = pick(IDLE_MESSAGES)
      // Show thinking dots for certain messages
      if (msg.includes('THINKING') || msg.includes('PROCESSING') || msg.includes('PONDERING')) {
        isThinking.value = true
        setTimeout(() => { isThinking.value = false }, 2500)
      }
      showMessage(msg)
    } else if (action < 0.55) {
      const expr = pick<Expression>(['happy', 'suspicious', 'wide'])
      setExpression(expr)
      setTimeout(() => setExpression('normal'), 2000)
    }
  }

  function affectionDecay(): void {
    const timeSinceInteraction = Date.now() - lastInteraction.value
    if (timeSinceInteraction > 30000 && affection.value > 20) {
      affection.value -= 1
    }
  }

  function reset(): void {
    affection.value = 30
    lastInteraction.value = Date.now()
    isAsleep.value = false
    currentMood.value = 'neutral'
    tapCount.value = 0
    expression.value = 'normal'
    mouthState.value = 'neutral'
    cheekState.value = null
    faceAnimation.value = 'none'
    targetEyeX.value = 0
    targetEyeY.value = 0
    currentEyeX.value = 0
    currentEyeY.value = 0
    displayText.value = ''
    textVisible.value = false
    showZzz.value = false
    showAffectionMeter.value = false
    isThinking.value = false
    heartsToSpawn.value = 0

    if (tapTimer) clearTimeout(tapTimer)
    if (messageTimeout) clearTimeout(messageTimeout)
    if (blinkAnimationTimeout) clearTimeout(blinkAnimationTimeout)
  }

  return {
    // State
    affection,
    lastInteraction,
    isAsleep,
    currentMood,
    expression,
    mouthState,
    cheekState,
    faceAnimation,
    currentEyeX,
    currentEyeY,
    displayText,
    textVisible,
    showZzz,
    showAffectionMeter,
    isThinking,
    heartsToSpawn,

    // Computed
    statusColor,

    // Actions
    moveEyes,
    updateEyePosition,
    setExpression,
    setMouth,
    setCheeks,
    setAnimation,
    showMessage,
    blink,
    updateAffection,
    wakeUp,
    fallAsleep,
    handleTap,
    idleBehavior,
    affectionDecay,
    reset
  }
})
