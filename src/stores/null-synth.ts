import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type SuitId = 'circuit' | 'signal' | 'code' | 'maker' | 'emergence' | 'glitch'

interface SigilDef {
  key: string
  svg: string
}

interface Sigil extends SigilDef {
  suit: SuitId
  color: string
}

interface SequenceNote {
  note: number
  suit: SuitId
}

interface SuitSound {
  type: OscillatorType
  octave: number
  attack: number
  decay: number
  sustain: number
  release: number
  filterFreq: number
  filterQ: number
}

const SIGIL_DEFS: Record<SuitId, { color: string; sigils: Record<string, { svg: string }> }> = {
  circuit: {
    color: '#ffaa00',
    sigils: {
      resistor: { svg: `<svg viewBox="0 0 100 100"><path d="M10 50 L25 50 L30 30 L40 70 L50 30 L60 70 L70 30 L75 50 L90 50" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      capacitor: { svg: `<svg viewBox="0 0 100 100"><path d="M10 50 L40 50 M40 25 L40 75 M60 25 L60 75 M60 50 L90 50" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      inductor: { svg: `<svg viewBox="0 0 100 100"><path d="M10 50 L20 50 Q30 50 30 40 Q30 30 40 30 Q50 30 50 40 Q50 50 60 50 Q70 50 70 40 Q70 30 80 30 Q90 30 90 40 L90 50" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      diode: { svg: `<svg viewBox="0 0 100 100"><path d="M10 50 L35 50 M35 30 L35 70 L65 50 L35 30 M65 30 L65 70 M65 50 L90 50" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      transistor: { svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" stroke="currentColor" fill="none" stroke-width="2"/><path d="M35 35 L35 65 M35 45 L60 30 M35 55 L60 70" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      ground: { svg: `<svg viewBox="0 0 100 100"><path d="M50 20 L50 45 M30 45 L70 45 M35 55 L65 55 M40 65 L60 65 M45 75 L55 75" stroke="currentColor" fill="none" stroke-width="3"/></svg>` }
    }
  },
  signal: {
    color: '#00ffff',
    sigils: {
      wave: { svg: `<svg viewBox="0 0 100 100"><path d="M10 50 Q25 20 40 50 Q55 80 70 50 Q85 20 100 50" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      antenna: { svg: `<svg viewBox="0 0 100 100"><path d="M50 85 L50 40 M30 20 L50 40 L70 20 M35 30 L50 45 L65 30" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      node: { svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="12" stroke="currentColor" fill="none" stroke-width="3"/><path d="M50 38 L50 15 M50 62 L50 85 M38 50 L15 50 M62 50 L85 50" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      packet: { svg: `<svg viewBox="0 0 100 100"><rect x="25" y="35" width="50" height="30" stroke="currentColor" fill="none" stroke-width="3"/><path d="M25 35 L50 55 L75 35" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      firewall: { svg: `<svg viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" stroke="currentColor" fill="none" stroke-width="3"/><path d="M20 40 L80 40 M20 60 L80 60 M40 20 L40 80 M60 20 L60 80" stroke="currentColor" fill="none" stroke-width="1.5" opacity="0.5"/></svg>` },
      null: { svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" stroke="currentColor" fill="none" stroke-width="3"/><path d="M30 70 L70 30" stroke="currentColor" fill="none" stroke-width="3"/></svg>` }
    }
  },
  code: {
    color: '#aa44ff',
    sigils: {
      loop: { svg: `<svg viewBox="0 0 100 100"><path d="M70 35 A20 20 0 1 0 70 65 M70 35 L80 25 M70 35 L80 45" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      branch: { svg: `<svg viewBox="0 0 100 100"><path d="M50 80 L50 50 L25 25 M50 50 L75 25" stroke="currentColor" fill="none" stroke-width="3"/><circle cx="25" cy="25" r="6" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="75" cy="25" r="6" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      function: { svg: `<svg viewBox="0 0 100 100"><text x="50" y="65" text-anchor="middle" font-family="monospace" font-size="50" fill="none" stroke="currentColor" stroke-width="2">f</text></svg>` },
      pointer: { svg: `<svg viewBox="0 0 100 100"><path d="M30 70 L50 30 L70 70 M40 55 L60 55" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      recursion: { svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="50" r="25" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="50" r="15" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      exception: { svg: `<svg viewBox="0 0 100 100"><path d="M50 20 L80 75 L20 75 Z" stroke="currentColor" fill="none" stroke-width="3"/><path d="M50 40 L50 55 M50 62 L50 67" stroke="currentColor" fill="none" stroke-width="3"/></svg>` }
    }
  },
  maker: {
    color: '#ff3344',
    sigils: {
      solder: { svg: `<svg viewBox="0 0 100 100"><path d="M25 75 L75 25" stroke="currentColor" fill="none" stroke-width="3"/><circle cx="75" cy="25" r="8" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      multimeter: { svg: `<svg viewBox="0 0 100 100"><rect x="25" y="20" width="50" height="65" rx="5" stroke="currentColor" fill="none" stroke-width="3"/><circle cx="50" cy="45" r="15" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      pcb: { svg: `<svg viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="35" cy="35" r="5" stroke="currentColor" fill="none"/><circle cx="65" cy="35" r="5" stroke="currentColor" fill="none"/><circle cx="35" cy="65" r="5" stroke="currentColor" fill="none"/><circle cx="65" cy="65" r="5" stroke="currentColor" fill="none"/></svg>` },
      led: { svg: `<svg viewBox="0 0 100 100"><path d="M35 60 L35 40 L65 40 L65 60 Z" stroke="currentColor" fill="none" stroke-width="2"/><path d="M35 60 L25 75 M65 60 L75 75 M50 40 L50 25" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      wire: { svg: `<svg viewBox="0 0 100 100"><path d="M20 50 Q35 30 50 50 Q65 70 80 50" stroke="currentColor" fill="none" stroke-width="3"/><circle cx="20" cy="50" r="4" fill="currentColor"/><circle cx="80" cy="50" r="4" fill="currentColor"/></svg>` },
      prototype: { svg: `<svg viewBox="0 0 100 100"><rect x="20" y="30" width="60" height="40" stroke="currentColor" fill="none" stroke-width="2" stroke-dasharray="5,3"/><circle cx="35" cy="50" r="8" stroke="currentColor" fill="none"/><circle cx="65" cy="50" r="8" stroke="currentColor" fill="none"/></svg>` }
    }
  },
  emergence: {
    color: '#00ff88',
    sigils: {
      entropy: { svg: `<svg viewBox="0 0 100 100"><path d="M30 30 L45 45 M55 35 L70 50 M25 55 L40 70 M60 60 L75 75 M35 50 L65 45" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      emergenceSigil: { svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="70" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="35" cy="55" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="65" cy="55" r="5" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="40" r="8" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="25" r="12" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      feedback: { svg: `<svg viewBox="0 0 100 100"><path d="M65 30 A25 25 0 1 1 35 30" stroke="currentColor" fill="none" stroke-width="3"/><path d="M35 30 L25 25 M35 30 L30 40 M65 30 L75 25 M65 30 L70 40" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      sync: { svg: `<svg viewBox="0 0 100 100"><path d="M20 35 Q35 20 50 35 Q65 50 80 35" stroke="currentColor" fill="none" stroke-width="2"/><path d="M20 50 Q35 35 50 50 Q65 65 80 50" stroke="currentColor" fill="none" stroke-width="2"/><path d="M20 65 Q35 50 50 65 Q65 80 80 65" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      daemon: { svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="40" cy="45" r="5" fill="currentColor"/><circle cx="60" cy="45" r="5" fill="currentColor"/><path d="M35 60 Q50 70 65 60" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      sigil: { svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" stroke="currentColor" fill="none" stroke-width="2"/><path d="M50 20 L50 35 M50 65 L50 80 M20 50 L35 50 M65 50 L80 50" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="50" cy="50" r="8" stroke="currentColor" fill="none" stroke-width="2"/></svg>` }
    }
  },
  glitch: {
    color: '#ff00aa',
    sigils: {
      corrupt: { svg: `<svg viewBox="0 0 100 100"><rect x="25" y="25" width="50" height="50" stroke="currentColor" fill="none" stroke-width="2"/><path d="M25 40 L40 40 L40 25 M60 75 L60 60 L75 60 M30 70 L70 30" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      noise: { svg: `<svg viewBox="0 0 100 100"><path d="M20 50 L25 35 L30 55 L35 40 L40 60 L45 30 L50 55 L55 45 L60 65 L65 35 L70 50 L75 40 L80 55" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      overflow: { svg: `<svg viewBox="0 0 100 100"><rect x="30" y="40" width="40" height="40" stroke="currentColor" fill="none" stroke-width="2"/><path d="M35 40 L35 30 L65 30 L65 40 M40 30 L40 20 L60 20 L60 30" stroke="currentColor" fill="none" stroke-width="2"/></svg>` },
      deadlock: { svg: `<svg viewBox="0 0 100 100"><circle cx="35" cy="50" r="15" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="65" cy="50" r="15" stroke="currentColor" fill="none" stroke-width="2"/><path d="M45 45 L55 45 M55 55 L45 55" stroke="currentColor" fill="none" stroke-width="3"/></svg>` },
      phantom: { svg: `<svg viewBox="0 0 100 100"><path d="M30 70 L30 40 Q30 25 50 25 Q70 25 70 40 L70 70 Q65 60 60 70 Q55 60 50 70 Q45 60 40 70 Q35 60 30 70" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="40" cy="45" r="4" fill="currentColor"/><circle cx="60" cy="45" r="4" fill="currentColor"/></svg>` },
      voidSigil: { svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" stroke="currentColor" fill="none" stroke-width="1" opacity="0.4"/><circle cx="50" cy="50" r="25" stroke="currentColor" fill="none" stroke-width="1" opacity="0.6"/><circle cx="50" cy="50" r="15" stroke="currentColor" fill="none" stroke-width="1" opacity="0.8"/><circle cx="50" cy="50" r="5" fill="currentColor"/></svg>` }
    }
  }
}

const SUIT_COLORS: Record<SuitId, string> = {
  circuit: '#ffaa00',
  signal: '#00ffff',
  code: '#aa44ff',
  maker: '#ff3344',
  emergence: '#00ff88',
  glitch: '#ff00aa'
}

const SUIT_SOUNDS: Record<SuitId, SuitSound> = {
  circuit: { type: 'sawtooth', octave: -1, attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.3, filterFreq: 600, filterQ: 3 },
  signal: { type: 'sine', octave: 0, attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.5, filterFreq: 2000, filterQ: 1 },
  code: { type: 'square', octave: 0, attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.2, filterFreq: 1200, filterQ: 5 },
  maker: { type: 'triangle', octave: -1, attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.15, filterFreq: 800, filterQ: 2 },
  emergence: { type: 'sine', octave: 0, attack: 0.2, decay: 0.4, sustain: 0.7, release: 0.8, filterFreq: 1500, filterQ: 0.7 },
  glitch: { type: 'sawtooth', octave: 1, attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.1, filterFreq: 3000, filterQ: 12 }
}

const SCALE = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33]

export const useNullSynthStore = defineStore('null-synth', () => {
  // Audio state
  let audioCtx: AudioContext | null = null
  let masterGain: GainNode | null = null
  let filter: BiquadFilterNode | null = null
  let compressor: DynamicsCompressorNode | null = null
  let reverb: ConvolverNode | null = null
  let reverbGain: GainNode | null = null
  let delay: DelayNode | null = null
  let delayFeedback: GainNode | null = null
  let delayGain: GainNode | null = null
  let noiseBuffer: AudioBuffer | null = null

  // State
  const initialized = ref(false)
  const showTitle = ref(true)
  const currentSuit = ref<SuitId>('emergence')
  const bpm = ref(120)
  const isPlaying = ref(false)
  const currentStep = ref(0)
  const sequence = ref<(SequenceNote | null)[]>(new Array(16).fill(null))
  const activePads = ref<Set<string>>(new Set())
  const xyPosition = ref({ x: 0.5, y: 0.5 })

  // Generate all sigils
  const allSigils = computed<Sigil[]>(() => {
    const sigils: Sigil[] = []
    const suitIds: SuitId[] = ['circuit', 'signal', 'code', 'maker', 'emergence', 'glitch']

    suitIds.forEach(suitId => {
      const suitDef = SIGIL_DEFS[suitId]
      Object.entries(suitDef.sigils).forEach(([key, sigil]) => {
        sigils.push({
          key,
          svg: sigil.svg,
          suit: suitId,
          color: suitDef.color
        })
      })
    })
    return sigils
  })

  // Actions
  function createReverbImpulse(duration: number, decay: number): AudioBuffer {
    if (!audioCtx) throw new Error('Audio not initialized')
    const length = audioCtx.sampleRate * duration
    const impulse = audioCtx.createBuffer(2, length, audioCtx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }
    return impulse
  }

  function createNoiseBuffer(): void {
    if (!audioCtx) return
    const bufferSize = audioCtx.sampleRate * 2
    noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }

  async function initAudio(): Promise<void> {
    if (initialized.value) return

    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.7

    compressor = audioCtx.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.ratio.value = 4

    filter = audioCtx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 2000
    filter.Q.value = 1

    reverb = audioCtx.createConvolver()
    reverb.buffer = createReverbImpulse(2, 2.5)

    reverbGain = audioCtx.createGain()
    reverbGain.gain.value = 0.2

    delay = audioCtx.createDelay(1)
    delay.delayTime.value = 0.2

    delayFeedback = audioCtx.createGain()
    delayFeedback.gain.value = 0.25

    delayGain = audioCtx.createGain()
    delayGain.gain.value = 0.15

    // Connect nodes
    masterGain.connect(filter)
    filter.connect(compressor)
    compressor.connect(audioCtx.destination)
    compressor.connect(reverb)
    reverb.connect(reverbGain)
    reverbGain.connect(audioCtx.destination)
    compressor.connect(delay)
    delay.connect(delayFeedback)
    delayFeedback.connect(delay)
    delay.connect(delayGain)
    delayGain.connect(audioCtx.destination)

    createNoiseBuffer()
    initialized.value = true
  }

  function setFilterParams(x: number, y: number): void {
    if (filter && audioCtx) {
      const now = audioCtx.currentTime
      filter.frequency.setTargetAtTime(200 + x * 7800, now, 0.05)
      filter.Q.setTargetAtTime(0.5 + (1 - y) * 14.5, now, 0.05)
    }
    xyPosition.value = { x, y }
  }

  function playNote(noteIndex: number, suit: SuitId = 'emergence'): void {
    if (!initialized.value || !audioCtx || !masterGain) return

    const sound = SUIT_SOUNDS[suit]
    const now = audioCtx.currentTime

    let freq = SCALE[noteIndex % SCALE.length]
    if (sound.octave) freq *= Math.pow(2, sound.octave)

    const gain = audioCtx.createGain()
    const noteFilter = audioCtx.createBiquadFilter()
    noteFilter.type = 'lowpass'
    noteFilter.frequency.value = sound.filterFreq
    noteFilter.Q.value = sound.filterQ

    const totalTime = sound.attack + sound.decay + sound.release + 0.5

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.35, now + sound.attack)
    gain.gain.linearRampToValueAtTime(sound.sustain * 0.35, now + sound.attack + sound.decay)
    gain.gain.setValueAtTime(sound.sustain * 0.35, now + sound.attack + sound.decay + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.001, now + totalTime)

    // Glitch noise
    if (suit === 'glitch' && Math.random() > 0.5 && noiseBuffer) {
      const noise = audioCtx.createBufferSource()
      noise.buffer = noiseBuffer
      const noiseGain = audioCtx.createGain()
      const noiseFilter = audioCtx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.value = freq * 2
      noiseFilter.Q.value = 10
      noiseGain.gain.setValueAtTime(0.1, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(masterGain)
      noise.start(now)
      noise.stop(now + 0.2)
    }

    const osc = audioCtx.createOscillator()
    osc.type = sound.type
    osc.frequency.value = freq

    const osc2 = audioCtx.createOscillator()
    osc2.type = sound.type
    osc2.frequency.value = freq * 1.004

    const oscGain = audioCtx.createGain()
    oscGain.gain.value = 0.5

    osc.connect(noteFilter)
    osc2.connect(oscGain)
    oscGain.connect(noteFilter)
    noteFilter.connect(gain)
    gain.connect(masterGain)

    // Pitch envelope for maker/circuit
    if (suit === 'maker' || suit === 'circuit') {
      osc.frequency.setValueAtTime(freq * 1.5, now)
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05)
    }

    osc.start(now)
    osc2.start(now)
    osc.stop(now + totalTime + 0.1)
    osc2.stop(now + totalTime + 0.1)
  }

  function triggerPad(noteIndex: number, suit: SuitId, padKey: string): void {
    playNote(noteIndex, suit)
    currentSuit.value = suit
    activePads.value.add(padKey)
    setTimeout(() => activePads.value.delete(padKey), 150)

    if (isPlaying.value) {
      sequence.value[currentStep.value] = { note: noteIndex, suit }
    }
  }

  function clearPad(padKey: string): void {
    activePads.value.delete(padKey)
  }

  function setSuit(suit: SuitId): void {
    currentSuit.value = suit
  }

  let sequencerInterval: ReturnType<typeof setInterval> | null = null

  function startSequencer(): void {
    isPlaying.value = true
    currentStep.value = 0
    sequencerInterval = setInterval(advanceStep, (60 / bpm.value) * 250)
  }

  function stopSequencer(): void {
    isPlaying.value = false
    if (sequencerInterval) {
      clearInterval(sequencerInterval)
      sequencerInterval = null
    }
  }

  function toggleSequencer(): void {
    if (isPlaying.value) {
      stopSequencer()
    } else {
      startSequencer()
    }
  }

  function advanceStep(): void {
    const note = sequence.value[currentStep.value]
    if (note) {
      playNote(note.note, note.suit)
    }
    currentStep.value = (currentStep.value + 1) % 16
  }

  function clearSequence(): void {
    sequence.value = new Array(16).fill(null)
  }

  function clearStep(index: number): void {
    sequence.value[index] = null
  }

  function setBpm(newBpm: number): void {
    bpm.value = Math.max(60, Math.min(200, newBpm))
    if (isPlaying.value) {
      stopSequencer()
      startSequencer()
    }
  }

  async function start(): Promise<void> {
    await initAudio()
    if (audioCtx?.state === 'suspended') {
      await audioCtx.resume()
    }
    showTitle.value = false
    setTimeout(() => playNote(5, 'emergence'), 300)
  }

  function reset(): void {
    stopSequencer()
    showTitle.value = true
    currentSuit.value = 'emergence'
    bpm.value = 120
    sequence.value = new Array(16).fill(null)
    currentStep.value = 0
    activePads.value.clear()
    xyPosition.value = { x: 0.5, y: 0.5 }
  }

  return {
    // Config
    SUIT_COLORS,
    allSigils,

    // State
    initialized,
    showTitle,
    currentSuit,
    bpm,
    isPlaying,
    currentStep,
    sequence,
    activePads,
    xyPosition,

    // Actions
    initAudio,
    start,
    setFilterParams,
    playNote,
    triggerPad,
    clearPad,
    setSuit,
    toggleSequencer,
    clearSequence,
    clearStep,
    setBpm,
    reset
  }
})
