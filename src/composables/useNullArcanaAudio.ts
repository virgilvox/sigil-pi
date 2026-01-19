// Null Arcana Ambient Audio Engine
// A generative soundscape that responds to the oracle's state

import { ref } from 'vue'
import { useGlobalStore } from '@/stores/global'

export type AudioState = 'silent' | 'title' | 'awakening' | 'selecting' | 'processing' | 'reading'

// Frequencies - slightly detuned for unease
const FREQUENCIES = {
  root: 55,       // A1 - low, grounding
  fifth: 82.5,    // E2 - hollow, ancient
  tritone: 77.78, // D#2 - the devil's interval
  minor2: 58.27,  // A#1 - tension
  octave: 110,
  mains: 60       // electrical hum
}

// Suit timbres - each suit has a sonic character
const SUIT_TIMBRES: Record<string, { wave: OscillatorType; filter: number; resonance: number; attack: number }> = {
  circuit: { wave: 'sawtooth', filter: 200, resonance: 2, attack: 0.01 },
  signal: { wave: 'sine', filter: 800, resonance: 8, attack: 0.1 },
  code: { wave: 'square', filter: 1200, resonance: 1, attack: 0.005 },
  maker: { wave: 'triangle', filter: 400, resonance: 4, attack: 0.02 },
  emergence: { wave: 'sine', filter: 2000, resonance: 12, attack: 0.2 },
  glitch: { wave: 'sawtooth', filter: 600, resonance: 15, attack: 0.001 }
}

export function useNullArcanaAudio() {
  const globalStore = useGlobalStore()

  const initialized = ref(false)
  const currentState = ref<AudioState>('silent')

  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let masterFilter: BiquadFilterNode | null = null
  let compressor: DynamicsCompressorNode | null = null
  let convolver: ConvolverNode | null = null
  let reverbGain: GainNode | null = null
  let dryGain: GainNode | null = null

  // Layers
  let substrateGain: GainNode | null = null
  let substrateOscillators: { osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode }[] = []

  let staticGain: GainNode | null = null
  let staticFilter: BiquadFilterNode | null = null
  let staticFilter2: BiquadFilterNode | null = null
  let noiseBuffer: AudioBuffer | null = null
  let noiseSource: AudioBufferSourceNode | null = null

  let pulseGain: GainNode | null = null
  let pulseTimeout: ReturnType<typeof setTimeout> | null = null

  let tonesGain: GainNode | null = null
  let droneOsc: OscillatorNode | null = null
  let droneGain: GainNode | null = null
  let droneVibrato: OscillatorNode | null = null
  let droneFilter: BiquadFilterNode | null = null

  let animationId: number | null = null

  // Parameters
  const params = {
    masterGain: 0.7,
    pulseRate: 0.3,
    tension: 0,
    depth: 0
  }

  function createReverbImpulse(duration: number, decay: number): AudioBuffer {
    if (!ctx) throw new Error('AudioContext not initialized')
    const length = ctx.sampleRate * duration
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
      }
    }
    return impulse
  }

  function createSubstrateLayer(): void {
    if (!ctx || !master) return

    substrateGain = ctx.createGain()
    substrateGain.gain.value = 0
    substrateGain.connect(master)

    // Mains hum harmonics
    const harmonics = [
      { freq: 60, gain: 0.15 },
      { freq: 120, gain: 0.08 },
      { freq: 180, gain: 0.04 },
      { freq: 240, gain: 0.02 }
    ]

    harmonics.forEach(h => {
      if (!ctx || !substrateGain) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = h.freq
      gain.gain.value = h.gain

      // Subtle frequency wobble
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.1 + Math.random() * 0.1
      lfoGain.gain.value = 0.5
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)
      lfo.start()

      osc.connect(gain)
      gain.connect(substrateGain)
      osc.start()

      substrateOscillators.push({ osc, gain, lfo })
    })
  }

  function createStaticLayer(): void {
    if (!ctx || !master) return

    staticGain = ctx.createGain()
    staticGain.gain.value = 0
    staticGain.connect(master)

    // Create pink-ish noise
    const bufferSize = ctx.sampleRate * 2
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }

    staticFilter = ctx.createBiquadFilter()
    staticFilter.type = 'bandpass'
    staticFilter.frequency.value = 400
    staticFilter.Q.value = 2

    staticFilter2 = ctx.createBiquadFilter()
    staticFilter2.type = 'highpass'
    staticFilter2.frequency.value = 100

    staticFilter.connect(staticFilter2)
    staticFilter2.connect(staticGain)

    startNoiseLoop()
  }

  function startNoiseLoop(): void {
    if (!ctx || !noiseBuffer || !staticFilter) return

    noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = true
    noiseSource.connect(staticFilter)
    noiseSource.start()
  }

  function createPulseLayer(): void {
    if (!ctx || !master) return

    pulseGain = ctx.createGain()
    pulseGain.gain.value = 0
    pulseGain.connect(master)
  }

  function triggerPulse(): void {
    if (!ctx || !pulseGain || globalStore.muted || currentState.value === 'silent') return

    const now = ctx.currentTime

    // Low thump
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(FREQUENCIES.root * (0.5 + Math.random() * 0.1), now)
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3)

    filter.type = 'lowpass'
    filter.frequency.value = 150
    filter.Q.value = 8

    const attackTime = 0.01
    const decayTime = 0.2 + Math.random() * 0.3
    const pulseGainValue = 0.3 + params.tension * 0.2

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(pulseGainValue, now + attackTime)
    gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(pulseGain)

    osc.start(now)
    osc.stop(now + decayTime + 0.1)

    // Sometimes add click
    if (Math.random() > 0.6) {
      triggerClick()
    }

    // Schedule next pulse
    const baseInterval = 2000 / (params.pulseRate + 0.1)
    const variance = baseInterval * 0.5
    const nextPulse = baseInterval + (Math.random() - 0.5) * variance

    pulseTimeout = setTimeout(() => triggerPulse(), nextPulse)
  }

  function triggerClick(): void {
    if (!ctx || !pulseGain || globalStore.muted) return

    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'square'
    osc.frequency.setValueAtTime(2000 + Math.random() * 3000, now)
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.02)

    filter.type = 'bandpass'
    filter.frequency.value = 1500
    filter.Q.value = 5

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(pulseGain)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  function createToneLayer(): void {
    if (!ctx || !master) return

    tonesGain = ctx.createGain()
    tonesGain.gain.value = 0
    tonesGain.connect(master)
  }

  function startDrone(): void {
    if (!ctx || !tonesGain || droneOsc) return

    const now = ctx.currentTime

    droneOsc = ctx.createOscillator()
    droneGain = ctx.createGain()
    droneFilter = ctx.createBiquadFilter()

    droneOsc.type = 'triangle'
    droneOsc.frequency.value = FREQUENCIES.root

    // Vibrato
    droneVibrato = ctx.createOscillator()
    const vibratoGain = ctx.createGain()
    droneVibrato.frequency.value = 0.2
    vibratoGain.gain.value = 1
    droneVibrato.connect(vibratoGain)
    vibratoGain.connect(droneOsc.frequency)
    droneVibrato.start()

    droneFilter.type = 'lowpass'
    droneFilter.frequency.value = 300
    droneFilter.Q.value = 2

    droneGain.gain.setValueAtTime(0, now)
    droneGain.gain.linearRampToValueAtTime(0.15, now + 2)

    droneOsc.connect(droneFilter)
    droneFilter.connect(droneGain)
    droneGain.connect(tonesGain)

    droneOsc.start()
  }

  function stopDrone(): void {
    if (!ctx || !droneOsc || !droneGain) return

    const now = ctx.currentTime
    droneGain.gain.linearRampToValueAtTime(0, now + 2)

    setTimeout(() => {
      if (droneOsc) {
        droneOsc.stop()
        droneOsc = null
      }
      if (droneVibrato) {
        droneVibrato.stop()
        droneVibrato = null
      }
    }, 2500)
  }

  function playInterval(interval: 'tritone' | 'fifth' | 'minor2' | 'octave' = 'tritone', duration = 3): void {
    if (!ctx || !tonesGain || globalStore.muted) return

    const now = ctx.currentTime
    const intervals: Record<string, number[]> = {
      tritone: [FREQUENCIES.root, FREQUENCIES.tritone],
      fifth: [FREQUENCIES.root, FREQUENCIES.fifth],
      minor2: [FREQUENCIES.root, FREQUENCIES.minor2],
      octave: [FREQUENCIES.root, FREQUENCIES.octave]
    }

    const notes = intervals[interval] || intervals.tritone

    notes.forEach((freq, i) => {
      if (!ctx || !tonesGain) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = i === 0 ? 'triangle' : 'sine'
      osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.01)

      filter.type = 'lowpass'
      filter.frequency.value = 800 + i * 400
      filter.Q.value = 1

      const attackTime = 0.5 + Math.random() * 0.5
      const releaseTime = duration * 0.3

      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.08, now + attackTime)
      gain.gain.setValueAtTime(0.08, now + duration - releaseTime)
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(tonesGain)

      osc.start(now)
      osc.stop(now + duration + 0.1)
    })
  }

  function playSigilSound(suit: string): void {
    if (!ctx || !master || globalStore.muted) return

    const now = ctx.currentTime
    const timbre = SUIT_TIMBRES[suit] || SUIT_TIMBRES.circuit
    const baseFreq = 220 + Math.random() * 100

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = timbre.wave
    osc.frequency.setValueAtTime(baseFreq * 2, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.1)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(timbre.filter * 2, now)
    filter.frequency.exponentialRampToValueAtTime(timbre.filter, now + 0.3)
    filter.Q.value = timbre.resonance

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.2, now + timbre.attack)
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(master)

    osc.start(now)
    osc.stop(now + 2)

    // Harmonic overtone
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()

    osc2.type = 'sine'
    osc2.frequency.value = baseFreq * 3

    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.05, now + timbre.attack * 2)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1)

    osc2.connect(gain2)
    gain2.connect(master)

    osc2.start(now)
    osc2.stop(now + 1.5)

    triggerClick()
  }

  function playTransition(type: 'shift' | 'reveal' = 'shift'): void {
    if (!ctx || !master || !noiseBuffer || globalStore.muted) return

    const now = ctx.currentTime

    if (type === 'shift') {
      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(200, now)
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3)
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.8)
      filter.Q.value = 4

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(master)

      noise.start(now)
      noise.stop(now + 1)
    } else if (type === 'reveal') {
      playInterval('fifth', 2)

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = 880

      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.06, now + 0.5)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2)

      osc.connect(gain)
      gain.connect(master)

      osc.start(now)
      osc.stop(now + 2.5)
    }
  }

  function setState(newState: AudioState): void {
    if (!ctx || currentState.value === newState || globalStore.muted) return

    const now = ctx.currentTime
    currentState.value = newState

    switch (newState) {
      case 'title':
        master?.gain.linearRampToValueAtTime(params.masterGain * 0.5, now + 1)
        substrateGain?.gain.linearRampToValueAtTime(0.4, now + 2)
        staticGain?.gain.linearRampToValueAtTime(0.25, now + 2)
        pulseGain?.gain.linearRampToValueAtTime(0.3, now + 2)
        tonesGain?.gain.linearRampToValueAtTime(0.2, now + 2)
        params.pulseRate = 0.2
        params.tension = 0.2
        startDrone()
        if (!pulseTimeout) triggerPulse()
        staticFilter?.frequency.linearRampToValueAtTime(300, now + 2)
        break

      case 'awakening':
        master?.gain.linearRampToValueAtTime(params.masterGain * 0.7, now + 0.5)
        staticGain?.gain.linearRampToValueAtTime(0.15, now + 1)
        staticFilter?.frequency.linearRampToValueAtTime(600, now + 1)
        playInterval('fifth', 4)
        break

      case 'selecting':
        master?.gain.linearRampToValueAtTime(params.masterGain * 0.7, now + 0.5)
        substrateGain?.gain.linearRampToValueAtTime(0.3, now + 0.5)
        staticGain?.gain.linearRampToValueAtTime(0.2, now + 0.5)
        pulseGain?.gain.linearRampToValueAtTime(0.5, now + 0.5)
        params.pulseRate = 0.4
        params.tension = 0.4
        staticFilter?.frequency.linearRampToValueAtTime(800, now + 1)
        break

      case 'processing':
        master?.gain.linearRampToValueAtTime(params.masterGain * 0.8, now + 0.3)
        staticGain?.gain.linearRampToValueAtTime(0.35, now + 0.5)
        staticFilter?.frequency.linearRampToValueAtTime(1200, now + 2)
        if (staticFilter) staticFilter.Q.linearRampToValueAtTime(8, now + 2)
        params.pulseRate = 0.7
        params.tension = 0.8
        playInterval('tritone', 3)
        break

      case 'reading':
        master?.gain.linearRampToValueAtTime(params.masterGain * 0.65, now + 1)
        substrateGain?.gain.linearRampToValueAtTime(0.6, now + 1)
        staticGain?.gain.linearRampToValueAtTime(0.08, now + 2)
        staticFilter?.frequency.linearRampToValueAtTime(400, now + 2)
        if (staticFilter) staticFilter.Q.linearRampToValueAtTime(2, now + 2)
        pulseGain?.gain.linearRampToValueAtTime(0.35, now + 1)
        tonesGain?.gain.linearRampToValueAtTime(0.4, now + 1)
        params.pulseRate = 0.15
        params.tension = 0.3
        params.depth = 0.8
        droneFilter?.frequency.linearRampToValueAtTime(200, now + 2)
        break

      case 'silent':
        master?.gain.linearRampToValueAtTime(0, now + 2)
        substrateGain?.gain.linearRampToValueAtTime(0, now + 2)
        staticGain?.gain.linearRampToValueAtTime(0, now + 2)
        pulseGain?.gain.linearRampToValueAtTime(0, now + 2)
        tonesGain?.gain.linearRampToValueAtTime(0, now + 2)
        stopDrone()
        if (pulseTimeout) {
          clearTimeout(pulseTimeout)
          pulseTimeout = null
        }
        break
    }
  }

  function animate(): void {
    if (!ctx || currentState.value === 'silent') {
      animationId = requestAnimationFrame(animate)
      return
    }

    const now = ctx.currentTime

    // Modulate static filter
    if (staticFilter) {
      const baseFreq = currentState.value === 'processing' ? 1000 : 500
      const modulation = Math.sin(now * 0.3) * 200 + Math.sin(now * 0.7) * 100
      staticFilter.frequency.setTargetAtTime(baseFreq + modulation, now, 0.5)
    }

    // Modulate master filter
    if (masterFilter) {
      const filterFreq = 1500 + params.tension * 1500 + Math.sin(now * 0.2) * 200
      masterFilter.frequency.setTargetAtTime(filterFreq, now, 0.3)
    }

    animationId = requestAnimationFrame(animate)
  }

  async function init(): Promise<boolean> {
    if (initialized.value) return true

    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

      // Master output chain
      master = ctx.createGain()
      master.gain.value = 0

      masterFilter = ctx.createBiquadFilter()
      masterFilter.type = 'lowpass'
      masterFilter.frequency.value = 2000
      masterFilter.Q.value = 0.5

      compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -24
      compressor.knee.value = 12
      compressor.ratio.value = 4
      compressor.attack.value = 0.003
      compressor.release.value = 0.25

      convolver = ctx.createConvolver()
      convolver.buffer = createReverbImpulse(3, 2)
      reverbGain = ctx.createGain()
      reverbGain.gain.value = 0.3

      dryGain = ctx.createGain()
      dryGain.gain.value = 0.7

      // Connect chain
      master.connect(masterFilter)
      masterFilter.connect(compressor)
      compressor.connect(dryGain)
      compressor.connect(convolver)
      convolver.connect(reverbGain)
      dryGain.connect(ctx.destination)
      reverbGain.connect(ctx.destination)

      // Create layers
      createSubstrateLayer()
      createStaticLayer()
      createPulseLayer()
      createToneLayer()

      initialized.value = true
      animate()

      return true
    } catch (e) {
      console.warn('Null Arcana audio initialization failed:', e)
      return false
    }
  }

  function stop(): void {
    setState('silent')

    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }

    // Stop all oscillators
    substrateOscillators.forEach(({ osc, lfo }) => {
      try {
        osc.stop()
        lfo.stop()
      } catch (e) { /* ignore */ }
    })
    substrateOscillators = []

    if (noiseSource) {
      try { noiseSource.stop() } catch (e) { /* ignore */ }
      noiseSource = null
    }

    if (droneOsc) {
      try { droneOsc.stop() } catch (e) { /* ignore */ }
      droneOsc = null
    }

    if (droneVibrato) {
      try { droneVibrato.stop() } catch (e) { /* ignore */ }
      droneVibrato = null
    }

    if (pulseTimeout) {
      clearTimeout(pulseTimeout)
      pulseTimeout = null
    }

    if (ctx) {
      ctx.close()
      ctx = null
    }

    initialized.value = false
    currentState.value = 'silent'
  }

  return {
    initialized,
    currentState,
    init,
    stop,
    setState,
    playSigilSound,
    playTransition
  }
}
