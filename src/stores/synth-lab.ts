import { defineStore } from 'pinia'
import { ref, reactive, computed, markRaw } from 'vue'
import {
  registerBuiltins, listEngines, listEffects, getPreset, presetsByFamily,
  Scale, noteName, euclid,
  type Bellows, type Instrument, type ParamSpec, type EngineDef, type EffectDef,
  type InstrumentPreset, type InstrumentFamily
} from 'bellowsjs'
import { useBellows } from '@/composables/useBellows'
import { engineColor, familyColor } from '@/styles/palette'
import { isStepped } from '@/components/synth-lab/params'

// Populate the main-thread registry so listEngines()/listEffects()/params are
// available for the workbench editor (the worklet keeps its own copy).
registerBuiltins()

export type SynthMode = 'bench' | 'play' | 'seq'

// Curated playable engines for the workbench (exclude granular test-tone and
// sampler/soundfont which need external buffers). Order roughly simple → complex.
const BENCH_ENGINE_IDS = [
  'va', 'fm', 'additive', 'wavetable', 'pluck', 'string', 'tube',
  'modal', 'westcoast', 'formant', 'harmonic',
  'kick', 'snare', 'hat', 'clap', 'tom', 'noise'
]

export interface SeqStep {
  on: boolean
  slot: number   // index into palette
  midi: number
  vel: number
}

export interface BenchFxSlot { effectId: string; params: Record<string, number> }

interface VoiceSpec {
  engineId: string
  params: Record<string, number>
  poly?: number
  gain?: number
  fx?: InstrumentPreset['fx']
  octave?: number
}

// engines that support the string/tube legato freq-glide contract
const LEGATO_ENGINES = new Set(['string', 'tube'])

export const useSynthLabStore = defineStore('synth-lab', () => {
  const engine = useBellows({ seed: 'synth-lab', bpm: 110 })

  // --- non-reactive audio graph ---
  const pool = new Map<string, Instrument>()
  let reverbBus: ReturnType<Bellows['bus']> | null = null
  let delayBus: ReturnType<Bellows['bus']> | null = null

  // static data kept out of deep reactivity
  const engineDefs = markRaw(new Map<string, EngineDef>(listEngines().map(e => [e.id, e])))
  const effectDefs = markRaw(new Map<string, EffectDef>(listEffects().map(e => [e.id, e])))
  const families = markRaw(presetsByFamily())
  const familyOrder = markRaw([...families.keys()])
  const allEffects = markRaw(listEffects().map(e => ({ id: e.id, label: e.label })).sort((a, b) => a.label.localeCompare(b.label)))

  // --- shared reactive state ---
  const mode = ref<SynthMode>('play')
  const ready = engine.ready
  const playing = engine.playing
  const bpm = engine.bpm
  const swing = ref(0)
  const scaleRoot = ref('C')
  const scaleName = ref('minor pentatonic')
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

  // ---------- generic note routing (bench audition + seq) ----------
  function trigger(key: string, midi: number, vel = 0.85, durSec = 0.4, at?: number): void {
    pooledVoice(key)?.note(midi, { at, vel, dur: { seconds: durSec } })
  }

  // ═══════════════ BENCH ═══════════════
  const benchEngine = ref('va')
  const benchParams = reactive<Record<string, number>>({})
  const benchFx = reactive<BenchFxSlot[]>([])
  const benchSpecs = computed<ParamSpec[]>(() => engineDefs.get(benchEngine.value)?.params ?? [])
  const BENCH_ENGINES = BENCH_ENGINE_IDS.filter(id => engineDefs.has(id))
  const benchColor = computed(() => engineColor(benchEngine.value))
  const benchLabel = computed(() => engineDefs.get(benchEngine.value)?.label ?? benchEngine.value)
  const benchPoly = computed(() => engineDefs.get(benchEngine.value)?.polyphony ?? 1)

  function engineMeta(id: string): { label: string; color: string; poly: number } {
    const d = engineDefs.get(id)
    return { label: d?.label ?? id, color: engineColor(id), poly: d?.polyphony ?? 1 }
  }

  function loadBenchDefaults(): void {
    const specs = engineDefs.get(benchEngine.value)?.params ?? []
    for (const k of Object.keys(benchParams)) delete benchParams[k]
    specs.forEach(s => { benchParams[s.name] = s.default })
    benchFx.splice(0, benchFx.length)
  }
  function selectEngine(id: string): void {
    if (!engineDefs.has(id)) return
    benchEngine.value = id
    loadBenchDefaults()
    const inst = pooledVoice(id)
    // re-apply defaults to a possibly-cached voice + clear its fx chain
    if (inst) {
      for (const [name, v] of Object.entries(benchParams)) inst.param(name, v)
      inst.fx()
    }
  }
  function cycleBenchEngine(dir: number): void {
    const i = BENCH_ENGINES.indexOf(benchEngine.value)
    selectEngine(BENCH_ENGINES[(i + dir + BENCH_ENGINES.length) % BENCH_ENGINES.length])
  }
  function setBenchParam(name: string, value: number): void {
    const v = isStepped(benchEngine.value, name) ? Math.round(value) : value
    benchParams[name] = v
    pooledVoice(benchEngine.value)?.param(name, v)
  }
  function resetBench(): void {
    selectEngine(benchEngine.value)
  }

  // --- bench fx rack ---
  function applyBenchFx(): void {
    const inst = pooledVoice(benchEngine.value)
    if (!inst) return
    inst.fx(...benchFx.map(f => ({ effectId: f.effectId, params: { ...f.params } })))
  }
  function addBenchFx(effectId: string): void {
    const def = effectDefs.get(effectId)
    if (!def) return
    const params: Record<string, number> = {}
    def.params.forEach(s => { params[s.name] = s.default })
    benchFx.push({ effectId, params })
    applyBenchFx()
  }
  function removeBenchFx(index: number): void {
    benchFx.splice(index, 1)
    applyBenchFx()
  }
  function setBenchFxParam(index: number, name: string, value: number): void {
    const slot = benchFx[index]; if (!slot) return
    slot.params[name] = value
    pooledVoice(benchEngine.value)?.fxParam(index, name, value)
  }
  function fxSpecs(effectId: string): ParamSpec[] {
    return effectDefs.get(effectId)?.params ?? []
  }
  function fxLabel(effectId: string): string {
    return effectDefs.get(effectId)?.label ?? effectId
  }

  // bench audition — play the scale root (or a small chord) on the bench voice
  const benchDrums = computed(() => /^(kick|snare|hat|clap|tom|noise)$/.test(benchEngine.value))
  function auditionBench(degree = 0): void {
    if (benchDrums.value) { trigger(benchEngine.value, 48, 0.95, 0.5); return }
    const midi = activeScale.value.degreeToMidi(degree, 4)
    trigger(benchEngine.value, midi, 0.9, benchPoly.value > 1 ? 0.9 : 0.5)
  }
  function auditionChord(): void {
    if (benchDrums.value) { trigger(benchEngine.value, 48, 0.95, 0.5); return }
    const s = activeScale.value
    for (const d of [0, 2, 4]) trigger(benchEngine.value, s.degreeToMidi(d, 4), 0.8, 1.0)
  }

  // ═══════════════ PLAY ═══════════════
  const playFamily = ref<InstrumentFamily>(familyOrder[0])
  const playPresetId = ref<string>(families.get(familyOrder[0])![0].id)
  const octave = ref(0)
  const presetsInFamily = computed<InstrumentPreset[]>(() => families.get(playFamily.value) ?? [])
  const currentPreset = computed(() => getPreset(playPresetId.value))
  const playKey = computed(() => `preset:${playPresetId.value}`)
  const playColor = computed(() => familyColor(playFamily.value))

  // expressive controls
  const sustainOn = ref(false)
  const legatoOn = ref(false)
  const legatoCapable = computed(() => {
    const p = getPreset(playPresetId.value)
    return LEGATO_ENGINES.has(p.engineId)
  })

  // note ledger (keyed by caller-supplied unique key, e.g. pointer id)
  const ledger = new Map<string, { noteId: number; sounding: number }>()
  const deferred = new Set<string>()
  const soundingCount = new Map<number, number>()
  const activeNotes = reactive(new Set<number>())
  // mono legato bookkeeping
  const legatoStack: { key: string; midi: number }[] = []
  let legatoNoteId = -1

  function litInc(midi: number): void {
    soundingCount.set(midi, (soundingCount.get(midi) ?? 0) + 1)
    activeNotes.add(midi)
  }
  function litDec(midi: number): void {
    const c = (soundingCount.get(midi) ?? 1) - 1
    if (c <= 0) { soundingCount.delete(midi); activeNotes.delete(midi) }
    else soundingCount.set(midi, c)
  }

  function selectPreset(id: string): void {
    releaseAllPlay()
    playPresetId.value = id
    const p = getPreset(id)
    playFamily.value = p.family
    octave.value = p.octave ?? 0
    pooledVoice(`preset:${id}`)
    // auto-enable legato for bowed/wind expressive families that can glide
    legatoOn.value = LEGATO_ENGINES.has(p.engineId) &&
      (p.family === 'strings' || p.family === 'winds' || p.family === 'brass')
  }
  function cyclePreset(dir: number): void {
    const list = presetsInFamily.value
    const i = list.findIndex(p => p.id === playPresetId.value)
    const next = list[(Math.max(0, i) + dir + list.length) % list.length]
    if (next) selectPreset(next.id)
  }
  function cycleFamily(dir: number): void {
    const i = familyOrder.indexOf(playFamily.value)
    const fam = familyOrder[(i + dir + familyOrder.length) % familyOrder.length]
    const first = families.get(fam)![0]
    selectPreset(first.id)
  }
  function shiftOctave(d: number): void {
    octave.value = Math.max(-3, Math.min(3, octave.value + d))
  }
  function setSustain(on: boolean): void {
    if (sustainOn.value === on) return
    sustainOn.value = on
    if (!on) {
      for (const key of [...deferred]) {
        const entry = ledger.get(key)
        if (entry) releaseEntry(key, entry)
      }
      deferred.clear()
    }
  }
  function toggleSustain(): void { setSustain(!sustainOn.value) }
  function toggleLegato(): void { if (legatoCapable.value) legatoOn.value = !legatoOn.value }

  function playNoteOn(midi: number, vel: number, key: string): void {
    const inst = pooledVoice(playKey.value)
    if (!inst) return
    const prev = ledger.get(key)
    if (prev) releaseEntry(key, prev)
    // mono legato glide (string/tube): later presses glide the one live voice
    if (legatoOn.value && legatoCapable.value && legatoStack.length > 0) {
      const bell = engine.bellows()
      if (bell) inst.param('freq', bell.freqOf(midi))
      const old = legatoStack[legatoStack.length - 1]
      activeNotes.delete(old.midi)
      activeNotes.add(midi)
      legatoStack.push({ key, midi })
      ledger.set(key, { noteId: -1, sounding: midi })
      return
    }
    const noteId = inst.on(midi, vel)
    ledger.set(key, { noteId, sounding: midi })
    if (legatoOn.value && legatoCapable.value) { legatoStack.push({ key, midi }); legatoNoteId = noteId }
    litInc(midi)
  }
  function playNoteOff(key: string): void {
    const entry = ledger.get(key)
    if (!entry) return
    if (sustainOn.value) { deferred.add(key); return }
    releaseEntry(key, entry)
  }
  function releaseEntry(key: string, entry: { noteId: number; sounding: number }): void {
    const inst = pooledVoice(playKey.value)
    const li = legatoStack.findIndex(e => e.key === key)
    if (li >= 0) {
      const wasTop = li === legatoStack.length - 1
      legatoStack.splice(li, 1)
      if (legatoStack.length === 0) { inst?.off(legatoNoteId); legatoNoteId = -1; activeNotes.delete(entry.sounding) }
      else if (wasTop) {
        const next = legatoStack[legatoStack.length - 1]
        const bell = engine.bellows()
        if (bell) inst?.param('freq', bell.freqOf(next.midi))
        activeNotes.delete(entry.sounding); activeNotes.add(next.midi)
      } else {
        activeNotes.delete(entry.sounding)
      }
    } else {
      if (entry.noteId >= 0) inst?.off(entry.noteId)
      litDec(entry.sounding)
    }
    ledger.delete(key)
    deferred.delete(key)
  }
  function releaseAllPlay(): void {
    for (const inst of pool.values()) inst.allOff()
    ledger.clear(); deferred.clear(); soundingCount.clear(); activeNotes.clear()
    legatoStack.length = 0; legatoNoteId = -1
    sustainOn.value = false
  }
  function isLit(midi: number): boolean { return activeNotes.has(midi) }

  // ═══════════════ SEQ ═══════════════
  const palette = reactive<string[]>([
    'kick', 'snare', 'hat', 'preset:sub-bass',
    'preset:marimba', 'preset:dx-epiano', 'preset:analog-lead', 'preset:nylon-guitar'
  ])
  const paletteLabels = computed(() => palette.map(k =>
    k.startsWith('preset:') ? getPreset(k.slice(7)).label : (engineDefs.get(k)?.label ?? k).toUpperCase()
  ))
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

  function isDrumSlot(slot: number): boolean {
    return /^(kick|snare|hat|clap|tom|noise)$/.test(palette[slot])
  }
  function defaultMidiFor(slot: number): number {
    if (isDrumSlot(slot)) return 48
    return activeScale.value.degreeToMidi(0, 4)
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
  function armSlot(i: number): void { armed.value = i % palette.length }
  function selectStep(i: number): void { selectedStep.value = i }
  function clearSteps(): void { steps.forEach(s => { s.on = false }); selectedStep.value = -1 }
  function euclidFill(pulses: number): void {
    const pattern = euclid(Math.max(0, Math.min(seqLength.value, pulses)), seqLength.value)
    for (let i = 0; i < seqLength.value; i++) {
      const s = steps[i]
      s.on = !!pattern[i]
      if (s.on) { s.slot = armed.value; s.midi = defaultMidiFor(armed.value); s.vel = 0.85 }
    }
  }
  function previewSlot(slot: number): void {
    trigger(palette[slot], defaultMidiFor(slot), 0.9, 0.3)
  }

  // ---------- transport / lifecycle ----------
  function setMode(m: SynthMode): void {
    if (m !== 'play') releaseAllPlay()
    if (m !== 'seq' && playing.value) engine.stop()
    for (const inst of pool.values()) inst.allOff()
    mode.value = m
  }
  function togglePlay(): void { playing.value ? engine.stop() : engine.start() }
  function setBpm(n: number): void { engine.setBpm(n) }
  function setSwing(a: number): void { swing.value = Math.max(0, Math.min(0.66, a)); engine.setSwing(swing.value) }
  function panic(): void { releaseAllPlay(); engine.panic() }

  // live scope / meter passthrough
  function analyser(): AnalyserNode | null { return engine.analyser() }
  function meterFrame(): { peakL: number; peakR: number; rmsL: number; rmsR: number; voices: number } | null {
    return engine.meter() as never
  }

  function buildMaster(bell: Bellows): void {
    bell.masterGain(0.85)
    bell.masterFx(['limiter', { ceiling: -1 }])
    reverbBus = bell.bus([['plate', { mix: 0.9, decay: 0.5 }]], { level: 0.3 })
    delayBus = bell.bus([['tapeDelay', { time: 0.34, feedback: 0.3, mix: 1 }]], { level: 0.25 })
  }

  let booting: Promise<void> | null = null
  async function boot(): Promise<void> {
    if (engine.bellows()) return
    if (booting) return booting
    booting = (async () => {
      engine.configure(buildMaster)
      await engine.boot()
      pool.clear()
      selectEngine(benchEngine.value)
      selectPreset(playPresetId.value)
      palette.forEach(k => pooledVoice(k))
      engine.onStep(seqScheduler)
    })()
    try { await booting } finally { booting = null }
  }

  function dispose(): void {
    engine.teardown()
    pool.clear()
    reverbBus = null
    delayBus = null
    currentTick.value = 0
    releaseAllPlay()
  }

  return {
    // shared
    mode, ready, playing, bpm, swing, scaleRoot, scaleName, activeScale,
    setMode, togglePlay, setBpm, setSwing, panic, boot, dispose,
    trigger, analyser, meterFrame, noteName,
    // bench
    benchEngine, benchParams, benchFx, benchSpecs, BENCH_ENGINES,
    benchColor, benchLabel, benchPoly, benchDrums, engineMeta,
    selectEngine, cycleBenchEngine, setBenchParam, resetBench,
    allEffects, addBenchFx, removeBenchFx, setBenchFxParam, fxSpecs, fxLabel,
    auditionBench, auditionChord,
    // play
    playFamily, playPresetId, octave, presetsInFamily, currentPreset, playKey,
    playColor, familyOrder, families,
    sustainOn, legatoOn, legatoCapable,
    selectPreset, cyclePreset, cycleFamily, shiftOctave,
    setSustain, toggleSustain, toggleLegato,
    playNoteOn, playNoteOff, releaseAllPlay, isLit, activeNotes,
    // seq
    palette, paletteLabels, armed, seqLength, steps, selectedStep, currentTick,
    toggleStep, paintStep, setStepVel, setStepMidi, armSlot, selectStep,
    clearSteps, euclidFill, previewSlot, isDrumSlot
  }
})
