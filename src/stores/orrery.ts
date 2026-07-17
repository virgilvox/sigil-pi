import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { Bellows } from 'bellowsjs'
import { useBellows, type TrackId } from '@/composables/useBellows'
import { RINGS } from '@/components/orrery/geometry'

// ═══════════════════════════════════════════════════════════════════
// ORRERY store — radial step sequencer. Owns the pattern (reactive, read by the
// canvas and the ~8 Hz clock callback) and the audio engine (non-reactive).
// All bellowsjs engine/fx params below use the AUTHORITATIVE names/ranges from
// the bellowsjs 0.1.5 reference (unknown names are ignored by the kernel).
// ═══════════════════════════════════════════════════════════════════

export interface Step {
  on: boolean
  vel: number      // 0..1
  degree: number   // index into a melodic track's note table (ignored by drums)
}

export interface Track {
  id: TrackId
  label: string
  color: string
  melodic: boolean
  soundIndex: number          // index into SOUND_OPTIONS[category]
  steps: Step[]
  len: number
  muted: boolean
  solo: boolean
  noteTable: number[]         // midi notes selectable on melodic tracks
}

const TRACK_IDS: TrackId[] = RINGS.map(r => r.id)

// Curated swappable sounds per category. Params use real bellowsjs names.
export interface SoundOption {
  label: string
  engineId: string
  params: Record<string, number>
  poly?: number
}

export const SOUND_OPTIONS: Record<'kick' | 'snare' | 'hat' | 'melodic', SoundOption[]> = {
  kick: [
    { label: 'PUNCH',  engineId: 'kick', params: { clickTune: 6, pitchDecay: 0.05, decay: 0.4, drive: 2 } },
    { label: 'DEEP',   engineId: 'kick', params: { clickTune: 3, pitchDecay: 0.08, decay: 0.6, drive: 1.2 } },
    { label: 'TIGHT',  engineId: 'kick', params: { clickTune: 10, pitchDecay: 0.03, decay: 0.22, drive: 3 } }
  ],
  snare: [
    { label: 'SNARE',  engineId: 'snare', params: { tone: 0.5, decay: 0.18, snap: 0.15 } },
    { label: 'CLAP',   engineId: 'clap',  params: { decay: 0.25, spread: 0.012, tone: 1200 } },
    { label: 'RIM',    engineId: 'snare', params: { tone: 0.85, decay: 0.09, snap: 0.05 } }
  ],
  hat: [
    { label: 'HAT',    engineId: 'hat', params: { decay: 0.08, tone: 1 }, poly: 2 },
    { label: 'OPEN',   engineId: 'hat', params: { decay: 0.32, tone: 1.3 }, poly: 2 },
    { label: 'TICK',   engineId: 'hat', params: { decay: 0.04, tone: 1.8 }, poly: 2 }
  ],
  melodic: [
    { label: 'PLUCK',  engineId: 'pluck', params: { damp: 0.35, decay: 2.2 }, poly: 4 },
    { label: 'SAW',    engineId: 'va',    params: { shape: 0, sub: 0.4, cutoff: 1400, resonance: 0.3, decay: 0.25, sustain: 0.4 }, poly: 4 },
    { label: 'FM',     engineId: 'fm',    params: { algorithm: 1, brightness: 0.8, ratio2: 2, level2: 0.6 }, poly: 4 },
    { label: 'STRING', engineId: 'string', params: { damp: 0.3, sustain: 0.6 }, poly: 4 },
    { label: 'BELL',   engineId: 'modal', params: { material: 1, decay: 3, brightness: 0.6 }, poly: 4 }
  ]
}

function soundCategory(id: TrackId): 'kick' | 'snare' | 'hat' | 'melodic' {
  if (id === 'kick' || id === 'snare' || id === 'hat') return id
  return 'melodic'
}

// Scale note tables per melodic track (midi). Bass = C minor pentatonic low,
// pluck/lead = C dorian in higher octaves — they lock together musically.
function noteTableFor(id: TrackId): number[] {
  if (id === 'bass') return [36, 39, 41, 43, 46, 48]                    // C2 minor pentatonic
  if (id === 'pluck') return [48, 50, 51, 53, 55, 57, 58, 60]          // C3 dorian
  return [60, 62, 63, 65, 67, 69, 70, 72]                              // C4 dorian (lead)
}

function makeSteps(len: number): Step[] {
  return Array.from({ length: len }, () => ({ on: false, vel: 0.8, degree: 0 }))
}

// Better out-of-box timbres: bass = SAW (va), lead = FM, others = list default.
const DEFAULT_SOUND_INDEX: Partial<Record<TrackId, number>> = { bass: 1, lead: 2 }

function defaultTracks(): Track[] {
  return RINGS.map(r => {
    const steps = makeSteps(16)
    // A gentle default groove so the first tap makes music.
    if (r.id === 'kick') [0, 4, 8, 12].forEach(i => (steps[i].on = true))
    if (r.id === 'snare') [4, 12].forEach(i => (steps[i].on = true))
    if (r.id === 'hat') [0, 2, 4, 6, 8, 10, 12, 14].forEach(i => (steps[i].on = true, steps[i].vel = 0.55))
    if (r.id === 'bass') [0, 3, 8, 11].forEach(i => (steps[i].on = true, steps[i].degree = 0))
    return {
      id: r.id,
      label: r.label,
      color: r.color,
      melodic: r.melodic,
      soundIndex: DEFAULT_SOUND_INDEX[r.id] ?? 0,
      steps,
      len: 16,
      muted: false,
      solo: false,
      noteTable: noteTableFor(r.id)
    }
  })
}

const STORAGE_KEY = 'sigil-pi:orrery'

export const useOrreryStore = defineStore('orrery', () => {
  // Non-reactive engine wrapper (holds Bellows in a closure).
  const engine = useBellows({ seed: 'orrery', bpm: 112 })

  const tracks = reactive<Track[]>(defaultTracks())
  const bpm = engine.bpm
  const swing = ref(0)
  const ready = engine.ready
  const playing = engine.playing
  const selectedTrack = ref(0)
  const currentTick = ref(0)            // active-step highlight (audio-driven)
  const gridVersion = ref(0)            // bump to force canvas repaint on edits

  const anySolo = computed(() => tracks.some(t => t.solo))

  // Build the instrument graph once, right after boot.
  function buildKit(bell: Bellows): void {
    bell.masterFx(['limiter', { ceiling: -1 }])

    // Drum glue bus + a little room.
    const drumBus = bell.bus([['plate', { mix: 0.14, decay: 0.4 }]], { level: 0.9 })
    // Lead echo bus.
    const echo = bell.bus([['tapeDelay', { time: 0.33, feedback: 0.3, mix: 0.28 }]], { level: 0.8 })

    tracks.forEach((tr) => {
      const cat = soundCategory(tr.id)
      const opt = SOUND_OPTIONS[cat][tr.soundIndex] || SOUND_OPTIONS[cat][0]
      const inst = bell.voice(opt.engineId, opt.params, opt.poly ? { polyphony: opt.poly } : undefined)
      if (cat === 'kick' || cat === 'snare' || cat === 'hat') {
        inst.send(drumBus, 0.3)
      }
      if (tr.id === 'lead') {
        inst.gain(0.7)
        inst.send(echo, 0.28)
      }
      if (tr.id === 'pluck') inst.gain(0.75)
      if (tr.id === 'bass') inst.gain(0.95)
      engine.registerVoice(tr.id, inst)
    })
  }

  // The ~8 Hz clock callback: read the plain pattern, schedule notes at absolute t.
  function scheduler(t: number, tick: number): void {
    const solo = anySolo.value
    for (let i = 0; i < tracks.length; i++) {
      const tr = tracks[i]
      if (tr.muted || (solo && !tr.solo)) continue
      const s = tr.steps[tick % tr.len]
      if (!s || !s.on) continue
      const inst = engine.voice(tr.id)
      if (!inst) continue
      const note = tr.melodic
        ? tr.noteTable[Math.max(0, Math.min(tr.noteTable.length - 1, s.degree))]
        : 48
      inst.note(note, { at: t, dur: '16n', vel: s.vel })
    }
    currentTick.value = tick
  }

  /** Boot the engine from a user gesture, then start the loop. */
  async function boot(): Promise<void> {
    engine.configure(buildKit)
    await engine.boot()
    engine.onStep(scheduler)
    engine.setSwing(swing.value)
    engine.start()
  }

  function play(): void { engine.start() }
  function stop(): void { engine.stop() }
  function togglePlay(): void { playing.value ? engine.stop() : engine.start() }
  function panic(): void { engine.panic() }

  function setBpm(n: number): void { engine.setBpm(n) }
  function setSwing(a: number): void {
    swing.value = Math.max(0, Math.min(0.66, a))
    engine.setSwing(swing.value)
  }

  function toggleStep(t: number, i: number): void {
    const s = tracks[t]?.steps[i]
    if (!s) return
    s.on = !s.on
    if (s.on) s.vel = 0.8
    selectedTrack.value = t
    gridVersion.value++
  }
  function setStep(t: number, i: number, on: boolean): void {
    const s = tracks[t]?.steps[i]
    if (!s || s.on === on) return
    s.on = on
    gridVersion.value++
  }
  function setVelocity(t: number, i: number, vel: number): void {
    const s = tracks[t]?.steps[i]
    if (!s) return
    s.vel = Math.max(0.05, Math.min(1, vel))
    gridVersion.value++
  }
  function setDegree(t: number, i: number, degree: number): void {
    const tr = tracks[t]
    if (!tr?.melodic) return
    const s = tr.steps[i]
    if (!s) return
    s.degree = Math.max(0, Math.min(tr.noteTable.length - 1, degree))
    gridVersion.value++
  }
  function toggleMute(t: number): void { if (tracks[t]) tracks[t].muted = !tracks[t].muted }
  function toggleSolo(t: number): void { if (tracks[t]) tracks[t].solo = !tracks[t].solo }
  function clearTrack(t: number): void {
    tracks[t]?.steps.forEach(s => { s.on = false })
    gridVersion.value++
  }
  function selectTrack(t: number): void { selectedTrack.value = t }

  /** Swap a track's engine live (cycles through its category's options). */
  function cycleSound(t: number, dir = 1): void {
    const tr = tracks[t]
    if (!tr) return
    const cat = soundCategory(tr.id)
    const opts = SOUND_OPTIONS[cat]
    tr.soundIndex = (tr.soundIndex + dir + opts.length) % opts.length
    rebuildVoice(t)
  }
  function rebuildVoice(t: number): void {
    const bell = engine.bellows()
    if (!bell) return
    const tr = tracks[t]
    const cat = soundCategory(tr.id)
    const opt = SOUND_OPTIONS[cat][tr.soundIndex]
    engine.voice(tr.id)?.allOff()
    const inst = bell.voice(opt.engineId, opt.params, opt.poly ? { polyphony: opt.poly } : undefined)
    if (cat === 'kick' || cat === 'snare' || cat === 'hat') inst.send(bell.bus([['plate', { mix: 0.14, decay: 0.4 }]], { level: 0.9 }), 0.3)
    if (tr.id === 'lead') inst.gain(0.7)
    if (tr.id === 'pluck') inst.gain(0.75)
    if (tr.id === 'bass') inst.gain(0.95)
    engine.registerVoice(tr.id, inst)
  }

  function currentSoundLabel(t: number): string {
    const tr = tracks[t]
    if (!tr) return ''
    return SOUND_OPTIONS[soundCategory(tr.id)][tr.soundIndex]?.label ?? ''
  }

  // --- persistence ---
  function save(): void {
    try {
      const data = {
        bpm: bpm.value,
        swing: swing.value,
        tracks: tracks.map(t => ({ soundIndex: t.soundIndex, len: t.len, muted: t.muted, steps: t.steps }))
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
  }
  function load(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const data = JSON.parse(raw)
      if (typeof data.bpm === 'number') engine.setBpm(data.bpm)
      if (typeof data.swing === 'number') setSwing(data.swing)
      if (Array.isArray(data.tracks)) {
        data.tracks.forEach((td: Partial<Track>, i: number) => {
          const tr = tracks[i]
          if (!tr || !Array.isArray(td.steps)) return
          tr.soundIndex = td.soundIndex ?? 0
          tr.muted = !!td.muted
          tr.len = td.len ?? 16
          td.steps.forEach((s, j) => { if (tr.steps[j]) Object.assign(tr.steps[j], s) })
        })
      }
      gridVersion.value++
      return true
    } catch { return false }
  }
  function clearAll(): void {
    tracks.forEach(t => t.steps.forEach(s => { s.on = false }))
    gridVersion.value++
  }

  function dispose(): void { engine.teardown() }

  return {
    tracks, bpm, swing, ready, playing, selectedTrack, currentTick, gridVersion, anySolo,
    boot, play, stop, togglePlay, panic,
    setBpm, setSwing,
    toggleStep, setStep, setVelocity, setDegree,
    toggleMute, toggleSolo, clearTrack, selectTrack,
    cycleSound, currentSoundLabel,
    save, load, clearAll, dispose
  }
})
