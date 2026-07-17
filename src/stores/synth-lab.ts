import { defineStore } from 'pinia'
import { ref, reactive, computed, shallowRef, markRaw } from 'vue'
import {
  registerBuiltins, listEngines, getPreset, presetsByFamily,
  Scale, noteName, euclid,
  type Bellows, type Instrument, type ParamSpec, type EngineDef,
  type InstrumentPreset, type InstrumentFamily
} from 'bellowsjs'
import { useBellows } from '@/composables/useBellows'

// Populate the main-thread registry so listEngines()/EngineDef.params are available
// for the workbench's auto-generated param editor (the worklet registers its own copy).
registerBuiltins()

export type SynthMode = 'bench' | 'play' | 'seq'

// Curated playable engines for the workbench (exclude sampler/soundfont/granular
// which need external buffers). Order roughly simple → complex.
const BENCH_ENGINE_IDS = [
  'va', 'fm', 'additive', 'wavetable', 'pluck', 'string', 'tube',
  'modal', 'westcoast', 'formant', 'harmonic',
  'kick', 'snare', 'hat', 'clap', 'tom', 'noise'
]

// 8-swatch palette for the step sequencer (per-step instrument selection).
export const PALETTE_COLORS = [
  '#e85a3c', '#e8a13c', '#d9d089', '#3c8ee8',
  '#8a7cc8', '#4cc9a0', '#ff5c8a', '#b47cff'
]

export interface SeqStep {
  on: boolean
  slot: number   // index into palette
  midi: number
  vel: number
}

interface VoiceSpec {
  engineId: string
  params: Record<string, number>
  poly?: number
  gain?: number
  fx?: InstrumentPreset['fx']
  octave?: number
}

export const useSynthLabStore = defineStore('synth-lab', () => {
  const engine = useBellows({ seed: 'synth-lab', bpm: 110 })

  // --- non-reactive audio graph ---
  const pool = new Map<string, Instrument>()
  let reverbBus: ReturnType<Bellows['bus']> | null = null
  let delayBus: ReturnType<Bellows['bus']> | null = null

  // engine defs are static data; keep them out of deep reactivity
  const engineDefs = markRaw(new Map<string, EngineDef>(listEngines().map(e => [e.id, e])))
  const families = markRaw(presetsByFamily())
  const familyOrder = markRaw([...families.keys()])

  // --- shared reactive state ---
  const mode = ref<SynthMode>('play')
  const ready = engine.ready
  const playing = engine.playing
  const bpm = engine.bpm
  const swing = ref(0)
  const scaleRoot = ref('C')
  const scaleName = ref('dorian')
  const activeScale = computed(() => markRaw(new Scale(scaleRoot.value, scaleName.value)))

  // ---------- voice resolution + pooling ----------
  function resolveSpec(key: string): VoiceSpec {
    if (key.startsWith('preset:')) {
      const p = getPreset(key.slice(7))
      return { engineId: p.engineId, params: { ...p.params }, gain: p.gain ?? 0.8, fx: p.fx, octave: p.octave ?? 0 }
    }
    const def = engineDefs.get(key)
    const params: Record<string, number> = {}
    def?.params.forEach(s => { params[s.name] = s.default })
    return { engineId: key, params, poly: def?.polyphony }
  }

  function pooledVoice(key: string): Instrument | null {
    const bell = engine.bellows()
    if (!bell) return null
    const cached = pool.get(key)
    if (cached) return cached
    const spec = resolveSpec(key)
    const inst = bell.voice(spec.engineId, spec.params, spec.poly ? { polyphony: spec.poly } : undefined)
    if (spec.gain != null) inst.gain(spec.gain)
    if (spec.fx?.length) inst.fx(...spec.fx.map(f => ({ effectId: f.effectId, params: f.params ?? {} })))
    if (reverbBus) inst.send(reverbBus, 0.12)
    if (delayBus) inst.send(delayBus, 0.08)
    pool.set(key, inst)
    return inst
  }

  // ---------- generic note routing ----------
  function noteOn(key: string, midi: number, vel = 0.85): number {
    const inst = pooledVoice(key)
    return inst ? inst.on(midi, vel) : -1
  }
  function noteOff(key: string, id: number): void {
    if (id >= 0) pooledVoice(key)?.off(id)
  }
  function trigger(key: string, midi: number, vel = 0.85, durSec = 0.4, at?: number): void {
    pooledVoice(key)?.note(midi, { at, vel, dur: { seconds: durSec } })
  }

  // ═══════════════ BENCH ═══════════════
  const benchEngine = ref('va')
  const benchParams = reactive<Record<string, number>>({})
  const benchSpecs = computed<ParamSpec[]>(() => engineDefs.get(benchEngine.value)?.params ?? [])
  const BENCH_ENGINES = BENCH_ENGINE_IDS.filter(id => engineDefs.has(id))

  function loadBenchDefaults(): void {
    const specs = engineDefs.get(benchEngine.value)?.params ?? []
    for (const k of Object.keys(benchParams)) delete benchParams[k]
    specs.forEach(s => { benchParams[s.name] = s.default })
  }
  function selectEngine(id: string): void {
    if (!engineDefs.has(id)) return
    benchEngine.value = id
    loadBenchDefaults()
    pooledVoice(id) // build it
  }
  function cycleBenchEngine(dir: number): void {
    const i = BENCH_ENGINES.indexOf(benchEngine.value)
    selectEngine(BENCH_ENGINES[(i + dir + BENCH_ENGINES.length) % BENCH_ENGINES.length])
  }
  function setBenchParam(name: string, value: number): void {
    benchParams[name] = value
    pooledVoice(benchEngine.value)?.param(name, value)
  }

  // ═══════════════ PLAY ═══════════════
  const playFamily = ref<InstrumentFamily>(familyOrder[0])
  const playPresetId = ref<string>(families.get(familyOrder[0])![0].id)
  const octave = ref(0)
  const presetsInFamily = computed<InstrumentPreset[]>(() => families.get(playFamily.value) ?? [])
  const currentPreset = computed(() => getPreset(playPresetId.value))
  const playKey = computed(() => `preset:${playPresetId.value}`)

  function selectPreset(id: string): void {
    playPresetId.value = id
    const p = getPreset(id)
    octave.value = p.octave ?? 0
    pooledVoice(`preset:${id}`)
  }
  function cyclePreset(dir: number): void {
    const list = presetsInFamily.value
    const i = list.findIndex(p => p.id === playPresetId.value)
    const next = list[(Math.max(0, i) + dir + list.length) % list.length]
    if (next) selectPreset(next.id)
  }
  function cycleFamily(dir: number): void {
    const i = familyOrder.indexOf(playFamily.value)
    playFamily.value = familyOrder[(i + dir + familyOrder.length) % familyOrder.length]
    const first = families.get(playFamily.value)![0]
    selectPreset(first.id)
  }
  function shiftOctave(d: number): void {
    octave.value = Math.max(-3, Math.min(3, octave.value + d))
  }

  // ═══════════════ SEQ ═══════════════
  const palette = reactive<string[]>([
    'preset:marimba', 'preset:sub-bass', 'preset:dx-epiano', 'preset:nylon-guitar',
    'kick', 'snare', 'hat', 'preset:analog-lead'
  ])
  const armed = ref(0)
  const seqLength = ref(16)
  const steps = reactive<SeqStep[]>(
    Array.from({ length: 32 }, () => ({ on: false, slot: 0, midi: 60, vel: 0.85 }))
  )
  const selectedStep = ref(-1)
  const currentTick = ref(0)

  function seqScheduler(t: number, tick: number): void {
    currentTick.value = tick
    if (mode.value !== 'seq' || !playing.value) return
    const step = steps[tick % seqLength.value]
    if (!step?.on) return
    const key = palette[step.slot]
    pooledVoice(key)?.note(step.midi, { at: t, dur: '16n', vel: step.vel })
  }

  function toggleStep(i: number): void {
    const s = steps[i]; if (!s) return
    s.on = !s.on
    if (s.on) { s.slot = armed.value; s.vel = 0.85; if (selectedStep.value < 0) s.midi = defaultMidiFor(armed.value) }
    selectedStep.value = i
  }
  function paintStep(i: number, on: boolean): void {
    const s = steps[i]; if (!s || s.on === on) return
    s.on = on
    if (on) { s.slot = armed.value; s.vel = 0.85; s.midi = defaultMidiFor(armed.value) }
  }
  function setStepVel(i: number, v: number): void {
    const s = steps[i]; if (s) s.vel = Math.max(0.05, Math.min(1, v))
  }
  function setStepMidi(i: number, midi: number): void {
    const s = steps[i]; if (s) s.midi = Math.max(24, Math.min(96, Math.round(midi)))
  }
  function defaultMidiFor(slot: number): number {
    // drums use a fixed pitch; melodic default to scale root at a sensible octave
    const key = palette[slot]
    if (/^(kick|snare|hat|clap|tom|noise)$/.test(key)) return 48
    return activeScale.value.degreeToMidi(0, 4)
  }
  function armSlot(i: number): void { armed.value = i % palette.length }
  function selectStep(i: number): void { selectedStep.value = i }
  function clearSteps(): void { steps.forEach(s => { s.on = false }); selectedStep.value = -1 }
  function euclidFill(pulses: number): void {
    const pattern = euclid(pulses, seqLength.value)
    for (let i = 0; i < seqLength.value; i++) {
      const s = steps[i]
      s.on = !!pattern[i]
      if (s.on) { s.slot = armed.value; s.midi = defaultMidiFor(armed.value); s.vel = 0.85 }
    }
  }

  // ---------- transport / lifecycle ----------
  function setMode(m: SynthMode): void {
    if (m !== 'seq' && playing.value) engine.stop()
    for (const inst of pool.values()) inst.allOff()
    mode.value = m
  }
  function togglePlay(): void { playing.value ? engine.stop() : engine.start() }
  function setBpm(n: number): void { engine.setBpm(n) }
  function setSwing(a: number): void { swing.value = Math.max(0, Math.min(0.66, a)); engine.setSwing(swing.value) }
  function panic(): void { engine.panic() }

  function buildMaster(bell: Bellows): void {
    bell.masterGain(0.85)
    bell.masterFx(['limiter', { ceiling: -1 }])
    reverbBus = bell.bus([['plate', { mix: 0.9, decay: 0.5 }]], { level: 0.3 })
    delayBus = bell.bus([['tapeDelay', { time: 0.34, feedback: 0.3, mix: 1 }]], { level: 0.25 })
  }

  async function boot(): Promise<void> {
    engine.configure(buildMaster)
    await engine.boot()
    pool.clear()
    // warm the current voices for each mode
    selectEngine(benchEngine.value)
    selectPreset(playPresetId.value)
    palette.forEach(k => pooledVoice(k))
    engine.onStep(seqScheduler)
  }

  function dispose(): void {
    engine.teardown()
    pool.clear()
    reverbBus = null
    delayBus = null
    currentTick.value = 0
  }

  return {
    // shared
    mode, ready, playing, bpm, swing, scaleRoot, scaleName, activeScale,
    setMode, togglePlay, setBpm, setSwing, panic, boot, dispose,
    noteOn, noteOff, trigger,
    // bench
    benchEngine, benchParams, benchSpecs, BENCH_ENGINES,
    selectEngine, cycleBenchEngine, setBenchParam,
    // play
    playFamily, playPresetId, octave, presetsInFamily, currentPreset, playKey,
    familyOrder,
    selectPreset, cyclePreset, cycleFamily, shiftOctave,
    // seq
    palette, PALETTE_COLORS, armed, seqLength, steps, selectedStep, currentTick,
    toggleStep, paintStep, setStepVel, setStepMidi, armSlot, selectStep,
    clearSteps, euclidFill, noteName
  }
})
