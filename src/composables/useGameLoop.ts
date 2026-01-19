import { ref, onUnmounted } from 'vue'

export interface GameLoopCallbacks {
  update: (deltaTime: number, time: number) => void
  render: () => void
}

export function useGameLoop(callbacks: GameLoopCallbacks) {
  const running = ref(false)
  const time = ref(0)
  const deltaTime = ref(0)
  const fps = ref(0)

  let lastTime = 0
  let frameId: number | null = null
  let frameCount = 0
  let fpsTime = 0

  function loop(timestamp: number): void {
    if (!running.value) return

    // Calculate delta time (capped at 100ms to prevent spiral of death)
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1)
    lastTime = timestamp
    deltaTime.value = dt
    time.value += dt

    // FPS calculation
    frameCount++
    fpsTime += dt
    if (fpsTime >= 1) {
      fps.value = Math.round(frameCount / fpsTime)
      frameCount = 0
      fpsTime = 0
    }

    // Game loop
    callbacks.update(dt, time.value)
    callbacks.render()

    frameId = requestAnimationFrame(loop)
  }

  function start(): void {
    if (running.value) return
    running.value = true
    lastTime = performance.now()
    frameId = requestAnimationFrame(loop)
  }

  function stop(): void {
    running.value = false
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
  }

  function reset(): void {
    time.value = 0
    deltaTime.value = 0
    fps.value = 0
    frameCount = 0
    fpsTime = 0
    lastTime = performance.now()
  }

  onUnmounted(() => {
    stop()
  })

  return {
    running,
    time,
    deltaTime,
    fps,
    start,
    stop,
    reset
  }
}
