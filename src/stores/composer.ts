import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { registerBuiltins, pitchClassName } from 'bellowsjs'
import { useBellows } from '@/composables/useBellows'
import {
  Composer, defaultTracks, applyMoodToTracks, macrosFor, patternFor, usableEngine,
  MOODS, MOOD_ORDER, MELODIC_ENGINES, STEPS,
  type PieceState, type TrackState, type MacroState
} from '@/composables/useComposer'

registerBuiltins()

const W1 = ['ember', 'iron', 'tuyere', 'copper', 'slag', 'forge', 'anvil', 'quench', 'billow', 'char', 'cinder', 'temper']
const W2 = ['spark', 'drift', 'bloom', 'veil', 'coil', 'husk', 'grain', 'flux', 'draft', 'thorn', 'wisp', 'crest']
// Seedable pseudo-random word-word-NNN (composition seed; folded into rng labels).
function freshSeed(): string {
  const r = () => Math.floor(Math.random() * 1000)
  return `${W1[r() % W1.length]}-${W2[r() % W2.length]}-${100 + (r() % 900)}`
}

const ROOT_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALE_NAMES = ['minor', 'dorian', 'lydian', 'mixolydian', 'phrygian', 'major',
  'harmonic minor', 'minor pentatonic', 'major pentatonic', 'blues']

export const useComposerStore = defineStore('composer', () => {
  const engine = useBellows({ seed: 'composer', bpm: 90 })
  let composer: Composer | null = null
  let disposed = false

  const seed = ref(freshSeed())
  const piece = reactive<PieceState>({
    mood: 'EMBER',
    evolve: true,
    root: 0,
    scaleName: 'minor',
    tracks: defaultTracks(),
    fx: { delayTime: 0.42, delayFb: 0.35, verbSize: 1.2, verbDecay: 3, comp: true }
  })
  // seed the initial mood into the default tracks
  const seeded = applyMoodToTracks(piece.tracks, piece.mood)
  piece.scaleName = seeded.scaleName

  const ready = engine.ready
  const playing = engine.playing
  const bpm = engine.bpm
  const swing = ref(seeded.swing / 100)
  const selectedTrack = ref<string | null>(null)
  const readout = reactive({ bar: 0, chord: '—', phrase: 'A', step: 0 })

  const rootName = computed(() => ROOT_NAMES[piece.root])
  const moods = MOOD_ORDER
  const scaleNames = SCALE_NAMES
  const engineOptions = MELODIC_ENGINES

  function trackById(id: string): TrackState | undefined { return piece.tracks.find(t => t.id === id) }

  // ---------- lifecycle ----------
  let booting: Promise<void> | null = null
  async function boot(): Promise<void> {
    if (engine.bellows()) return
    if (booting) return booting
    disposed = false
    booting = (async () => {
      engine.configure(b => b.masterGain(0.9))
      await engine.boot()
      // If the component unmounted mid-boot, tear the freshly-booted engine back
      // down instead of building an orphaned Composer (whose 16n clock sub leaks).
      if (disposed) { engine.teardown(); return }
      engine.setBpm(MOODS[piece.mood]?.bpm ?? 90)
      engine.setSwing(swing.value)
      buildComposer()
    })()
    try { await booting } finally { booting = null }
  }
  function buildComposer(): void {
    const b = engine.bellows(); if (!b) return
    composer?.dispose()
    composer = new Composer(b, piece, seed.value)
  }

  // ---------- transport ----------
  function togglePlay(): void {
    if (!composer) return
    if (playing.value) engine.stop()
    else { composer.resetPosition(); engine.start() }
  }
  function panic(): void { engine.panic() }
  function setBpm(n: number): void { engine.setBpm(n) }
  function setSwing(a: number): void { swing.value = Math.max(0, Math.min(0.66, a)); engine.setSwing(swing.value) }

  // ---------- compose / randomize / step editing ----------
  // Role-sensible pulse ranges so a random pattern still grooves.
  const PULSE_RANGE: Record<string, [number, number]> = {
    bass: [2, 6], melody: [3, 9], pad: [1, 3], kit: [4, 12], texture: [1, 5]
  }
  function randInt(a: number, b: number): number { return a + Math.floor(Math.random() * (b - a + 1)) }
  function randomizeTrackPattern(tr: TrackState): void {
    const [lo, hi] = PULSE_RANGE[tr.role] ?? [2, 8]
    tr.pulses = randInt(lo, Math.min(hi, STEPS))
    tr.rot = randInt(0, STEPS - 1)
    tr.pattern = patternFor(tr.pulses, tr.rot)
  }
  function randomizeAll(): void { for (const tr of piece.tracks) randomizeTrackPattern(tr) }

  // COMPOSE = a whole new piece: new seed (new progression + melodies) AND new
  // rhythms, so the rings visibly change and it plays fresh notes.
  function compose(newSeed?: string): void {
    seed.value = newSeed && newSeed.trim() ? newSeed.trim() : freshSeed()
    randomizeAll()
    composer?.reseed(seed.value)
  }
  // DICE = re-roll the grooves only (keep the seed's melody + harmony character).
  function dice(): void { randomizeAll() }
  function randomizeTrack(id: string): void {
    const tr = trackById(id); if (tr) randomizeTrackPattern(tr)
  }

  // Manual step editing — place / remove notes on a track's 16-step ring.
  function stepOn(id: string, step: number): boolean {
    const tr = trackById(id); return !!(tr && tr.pattern[step])
  }
  function toggleStep(id: string, step: number): void {
    const tr = trackById(id); if (tr) tr.pattern[step] = tr.pattern[step] ? 0 : 1
  }
  function paintStep(id: string, step: number, on: boolean): void {
    const tr = trackById(id); if (tr) tr.pattern[step] = on ? 1 : 0
  }
  function clearTrack(id: string): void {
    const tr = trackById(id); if (tr) tr.pattern = new Array(STEPS).fill(0)
  }

  function toggleEvolve(): void { piece.evolve = !piece.evolve }
  function toggleComp(): void { piece.fx.comp = !piece.fx.comp; composer?.applyMasterFx() }

  function setMood(mood: string): void {
    if (!MOODS[mood]) return
    piece.mood = mood
    // remember engines so we only rebuild the voices that actually change
    // (bellows voices can't be disposed — rebuilding unchanged ones would leak)
    const prevEngines = new Map(piece.tracks.map(t => [t.id, t.engine]))
    const m = applyMoodToTracks(piece.tracks, mood)
    piece.scaleName = m.scaleName
    engine.setBpm(m.bpm)
    setSwing(m.swing / 100)
    if (composer) {
      composer.setScale(piece.root, piece.scaleName)
      for (const tr of piece.tracks) {
        if (tr.kind !== 'kit' && prevEngines.get(tr.id) !== tr.engine) {
          composer.swapEngine(tr)
          for (const mc of tr.macros) composer.setMacro(tr, mc)
        }
        composer.setLevel(tr)
      }
      composer.reseed(seed.value)
    }
  }
  function setRoot(pc: number): void {
    piece.root = ((pc % 12) + 12) % 12
    composer?.setScale(piece.root, piece.scaleName)
  }
  function shiftRoot(d: number): void { setRoot(piece.root + d) }
  function setScaleName(name: string): void {
    piece.scaleName = name
    composer?.setScale(piece.root, piece.scaleName)
  }

  // ---------- track controls ----------
  function selectTrack(id: string | null): void { selectedTrack.value = id }
  function toggleMute(id: string): void {
    const tr = trackById(id); if (tr) tr.mute = !tr.mute
  }
  function setTrackEngine(id: string, engineId: string): void {
    const tr = trackById(id); if (!tr || tr.kind === 'kit' || tr.engine === engineId) return
    tr.engine = engineId
    tr.macros = macrosFor(engineId)
    composer?.swapEngine(tr)
    if (composer) for (const mc of tr.macros) composer.setMacro(tr, mc)
  }
  function setTrackLevel(id: string, v: number): void {
    const tr = trackById(id); if (!tr) return
    tr.level = Math.max(0, Math.min(1, v)); composer?.setLevel(tr)
  }
  function setTrackSend(id: string, which: 'delay' | 'verb', v: number): void {
    const tr = trackById(id); if (!tr) return
    const c = Math.max(0, Math.min(1, v))
    if (which === 'delay') tr.sendDelay = c; else tr.sendVerb = c
    composer?.setSends(tr)
  }
  function setTrackMacro(id: string, idx: number, v: number): void {
    const tr = trackById(id); if (!tr) return
    const m: MacroState | undefined = tr.macros[idx]; if (!m) return
    m.value = Math.max(m.min, Math.min(m.max, v))
    composer?.setMacro(tr, m)
  }
  function shiftOct(id: string, d: number): void {
    const tr = trackById(id); if (!tr) return
    tr.oct = Math.max(1, Math.min(7, tr.oct + d))
  }
  function setPulses(id: string, v: number): void {
    const tr = trackById(id); if (!tr) return
    tr.pulses = Math.max(0, Math.min(STEPS, v))
    tr.pattern = patternFor(tr.pulses, tr.rot)
  }
  function setRot(id: string, v: number): void {
    const tr = trackById(id); if (!tr) return
    tr.rot = ((v % STEPS) + STEPS) % STEPS
    tr.pattern = patternFor(tr.pulses, tr.rot)
  }
  function setDensity(id: string, v: number): void {
    const tr = trackById(id); if (!tr) return
    tr.density = Math.max(0, Math.min(1, v))
  }

  // ---------- readout playhead (drained each frame by the view) ----------
  function tickReadout(): void {
    if (!composer) return
    const now = engine.bellows()?.now() ?? 0
    const q = composer.drawQueue
    let latest: typeof q[number] | null = null
    while (q.length && q[0].t <= now + 0.02) latest = q.shift()!
    if (latest) { readout.bar = latest.bar; readout.chord = latest.chord; readout.phrase = latest.phrase; readout.step = latest.step }
  }
  function currentStep(): number { return playing.value ? readout.step : -1 }

  function dispose(): void {
    disposed = true
    composer?.dispose(); composer = null
    engine.teardown()
    readout.step = 0
  }

  return {
    // state
    piece, seed, ready, playing, bpm, swing, selectedTrack, readout,
    rootName, moods, scaleNames, engineOptions, usableEngine, pitchClassName,
    // lifecycle / transport
    boot, dispose, togglePlay, panic, setBpm, setSwing,
    compose, dice, randomizeTrack, toggleEvolve, toggleComp, setMood, setRoot, shiftRoot, setScaleName,
    stepOn, toggleStep, paintStep, clearTrack,
    // tracks
    trackById, selectTrack, toggleMute, setTrackEngine, setTrackLevel, setTrackSend,
    setTrackMacro, shiftOct, setPulses, setRot, setDensity,
    // readout
    tickReadout, currentStep
  }
})
