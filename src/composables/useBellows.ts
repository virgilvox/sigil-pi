import { ref } from 'vue'
import { Bellows, type Instrument } from 'bellowsjs'

// ═══════════════════════════════════════════════════════════════════
// useBellows — thin, non-reactive wrapper around the bellowsjs engine.
//
// Two hard rules (see ORRERY spec):
//   1. Audio-thread objects (Bellows, Instrument, AudioContext) live in plain
//      closure vars, NEVER inside a reactive ref — Vue's proxy corrupts their
//      private fields and wrecks performance.
//   2. boot() MUST be awaited from a real user gesture (Chromium keeps the
//      AudioContext suspended otherwise). It is idempotent (no double-boot).
//
// This is a plain factory (no onUnmounted inside) so a Pinia store can own it;
// the owning component calls teardown() explicitly on unmount.
// ═══════════════════════════════════════════════════════════════════

// Voice keys are free-form strings: the orrery uses fixed drum/melody ids, while
// Synth Lab keys voices by engine id or 'preset:<id>'.
export type TrackId = string

export interface UseBellowsOptions {
  seed?: string
  bpm?: number
  /** Only needed if the host CSP blocks blob: worklets (not the default kiosk). */
  workletUrl?: string
}

export function useBellows(opts: UseBellowsOptions = {}) {
  // --- non-reactive audio objects ---
  let b: Bellows | null = null
  const insts = new Map<TrackId, Instrument>()
  let unsubClock: (() => void) | null = null
  let booting: Promise<void> | null = null
  let onReady: ((bell: Bellows) => void) | null = null

  // --- UI-facing reactive state (safe to render) ---
  const ready = ref(false)
  const playing = ref(false)
  const bpm = ref(opts.bpm ?? 120)

  /** Register the callback that builds voices/buses/master fx right after boot. */
  function configure(fn: (bell: Bellows) => void) {
    onReady = fn
  }

  /** Await from a user-gesture handler. Idempotent — safe against double-tap. */
  async function boot(): Promise<void> {
    if (b) return
    if (booting) return booting
    booting = (async () => {
      const bell = await Bellows.boot({
        seed: opts.seed ?? 'orrery',
        bpm: bpm.value,
        ...(opts.workletUrl ? { workletUrl: opts.workletUrl } : {})
      })
      b = bell
      onReady?.(bell)
      ready.value = true
    })()
    try {
      await booting
    } finally {
      booting = null
    }
  }

  function registerVoice(id: TrackId, inst: Instrument): void {
    insts.set(id, inst)
  }
  function voice(id: TrackId): Instrument | null {
    return insts.get(id) ?? null
  }
  function bellows(): Bellows | null {
    return b
  }

  /** Live analyser node (post-master) for scope visuals; null before boot. */
  function analyser(): AnalyserNode | null {
    return b?.analyser ?? null
  }
  /** Latest meter frame ({ voices, peakL/R, ... }) or null. */
  function meter(): unknown {
    return b?.meter ?? null
  }

  function setBpm(n: number): void {
    bpm.value = Math.max(40, Math.min(240, Math.round(n)))
    b?.bpm(bpm.value)
  }
  function setSwing(amount: number): void {
    b?.swing(Math.max(0, Math.min(0.7, amount)), '8n')
  }

  /**
   * Subscribe a per-16th-note callback. cb receives the absolute context time t
   * (seconds) — pass it straight to note({ at: t }) — plus a monotonic tick.
   * Only one subscription is ever live.
   */
  function onStep(cb: (t: number, tick: number) => void): void {
    if (!b) return
    let tick = 0
    unsubClock?.()
    unsubClock = b.clock.at('16n', (t) => cb(t, tick++))
  }

  function start(): void {
    b?.start()
    playing.value = true
  }
  function stop(): void {
    b?.stop()
    playing.value = false
  }
  function panic(): void {
    b?.panic()
  }

  /** Teardown order matters: unsub clock → panic → dispose → null. */
  function teardown(): void {
    unsubClock?.()
    unsubClock = null
    try {
      b?.panic()
      b?.dispose()
    } catch {
      // engine may already be gone — ignore
    }
    b = null
    insts.clear()
    ready.value = false
    playing.value = false
  }

  return {
    ready,
    playing,
    bpm,
    boot,
    configure,
    teardown,
    registerVoice,
    voice,
    bellows,
    analyser,
    meter,
    setBpm,
    setSwing,
    onStep,
    start,
    stop,
    panic
  }
}
