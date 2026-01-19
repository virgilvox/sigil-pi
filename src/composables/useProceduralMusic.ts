import { ref, onUnmounted } from 'vue'
import { useAudio } from './useAudio'
import { useGlobalStore } from '@/stores/global'

// D minor scale frequencies
const NOTES: Record<string, number> = {
  D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, C3: 130.81,
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, C4: 261.63,
  D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16, C5: 523.25,
  D5: 587.33
}

// Chord progressions
const CHORDS: Record<string, number[]> = {
  Dm: [NOTES.D3, NOTES.F3, NOTES.A3],
  Bb: [NOTES.Bb2, NOTES.D3, NOTES.F3],
  F: [NOTES.F3, NOTES.A3, NOTES.C4],
  C: [NOTES.C3, NOTES.E3, NOTES.G3]
}

// Arrangement sections
interface Section {
  name: string
  bars: number
  kick: boolean
  snare: boolean
  hat: boolean
  bass: boolean
  arp: boolean
  pad: boolean
  lead: boolean
  intensity: number
}

const SECTIONS: Section[] = [
  { name: 'intro', bars: 8, kick: false, snare: false, hat: false, bass: true, arp: false, pad: true, lead: false, intensity: 0.3 },
  { name: 'build1', bars: 8, kick: true, snare: false, hat: true, bass: true, arp: true, pad: true, lead: false, intensity: 0.5 },
  { name: 'drop1', bars: 16, kick: true, snare: true, hat: true, bass: true, arp: true, pad: true, lead: true, intensity: 1.0 },
  { name: 'break', bars: 8, kick: false, snare: false, hat: true, bass: true, arp: false, pad: true, lead: false, intensity: 0.4 },
  { name: 'drop2', bars: 16, kick: true, snare: true, hat: true, bass: true, arp: true, pad: true, lead: true, intensity: 1.0 }
]

const BPM = 128
const BEAT = 60 / BPM
const BAR = BEAT * 4

export function useProceduralMusic() {
  const audio = useAudio()
  const globalStore = useGlobalStore()

  const playing = ref(false)
  const currentSection = ref(0)
  const currentBeat = ref(0)

  let nodes: AudioNode[] = []
  let intervals: number[] = []
  let timeouts: number[] = []
  let chordIndex = 0
  let musicGain: GainNode | null = null

  function cleanup(): void {
    for (const interval of intervals) {
      clearInterval(interval)
    }
    for (const timeout of timeouts) {
      clearTimeout(timeout)
    }
    for (const node of nodes) {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          (node as OscillatorNode).stop()
        }
        node.disconnect()
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    nodes = []
    intervals = []
    timeouts = []
  }

  function createDrone(ctx: AudioContext, gain: GainNode): void {
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.value = NOTES.D2

    filter.type = 'lowpass'
    filter.frequency.value = 200
    filter.Q.value = 2

    oscGain.gain.value = 0.15

    osc.connect(filter)
    filter.connect(oscGain)
    oscGain.connect(gain)

    osc.start()
    nodes.push(osc, oscGain, filter)
  }

  function createPad(ctx: AudioContext, gain: GainNode): void {
    const chordNames = ['Dm', 'Bb', 'F', 'C']

    const interval = setInterval(() => {
      if (!playing.value || globalStore.muted) return

      const chord = CHORDS[chordNames[chordIndex % 4]]
      const now = ctx.currentTime

      for (const freq of chord) {
        const osc = ctx.createOscillator()
        const oscGain = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        osc.type = 'sine'
        osc.frequency.value = freq

        filter.type = 'lowpass'
        filter.frequency.value = 800

        oscGain.gain.setValueAtTime(0, now)
        oscGain.gain.linearRampToValueAtTime(0.08, now + 0.3)
        oscGain.gain.setValueAtTime(0.08, now + BAR - 0.5)
        oscGain.gain.linearRampToValueAtTime(0, now + BAR)

        osc.connect(filter)
        filter.connect(oscGain)
        oscGain.connect(gain)

        osc.start(now)
        osc.stop(now + BAR + 0.1)
      }

      chordIndex++
    }, BAR * 1000)

    intervals.push(interval as unknown as number)
  }

  function createBass(ctx: AudioContext, gain: GainNode): void {
    const bassRoots: Record<string, number> = {
      Dm: NOTES.D2,
      Bb: NOTES.Bb2 / 2,
      F: NOTES.F2 / 2,
      C: NOTES.C3 / 2
    }
    const chordNames = ['Dm', 'Bb', 'F', 'C']

    let step = 0
    const interval = setInterval(() => {
      if (!playing.value || globalStore.muted) return

      const now = ctx.currentTime
      const root = bassRoots[chordNames[Math.floor(step / 8) % 4]]
      const pattern = [1, 0, 0.6, 0, 1, 0, 0.4, 0.7]
      const vel = pattern[step % 8]

      if (vel > 0) {
        const osc = ctx.createOscillator()
        const oscGain = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        osc.type = 'sawtooth'
        osc.frequency.value = root

        filter.type = 'lowpass'
        filter.frequency.value = 400
        filter.Q.value = 4

        oscGain.gain.setValueAtTime(0.2 * vel, now)
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

        osc.connect(filter)
        filter.connect(oscGain)
        oscGain.connect(gain)

        osc.start(now)
        osc.stop(now + 0.2)
      }

      step++
    }, (BEAT / 2) * 1000)

    intervals.push(interval as unknown as number)
  }

  function createKick(ctx: AudioContext, gain: GainNode): void {
    let beat = 0
    const interval = setInterval(() => {
      if (!playing.value || globalStore.muted) return

      const section = SECTIONS[currentSection.value % SECTIONS.length]
      if (!section.kick) {
        beat++
        return
      }

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1)

      oscGain.gain.setValueAtTime(0.5, now)
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

      osc.connect(oscGain)
      oscGain.connect(gain)

      osc.start(now)
      osc.stop(now + 0.35)

      beat++
    }, BEAT * 1000)

    intervals.push(interval as unknown as number)
  }

  function createHiHat(ctx: AudioContext, gain: GainNode): void {
    let step = 0
    const interval = setInterval(() => {
      if (!playing.value || globalStore.muted) return

      const section = SECTIONS[currentSection.value % SECTIONS.length]
      if (!section.hat) {
        step++
        return
      }

      const now = ctx.currentTime
      const bufferSize = ctx.sampleRate * 0.05
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const noise = ctx.createBufferSource()
      const noiseGain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      noise.buffer = buffer
      filter.type = 'highpass'
      filter.frequency.value = 8000

      const vel = step % 2 === 0 ? 0.08 : 0.04
      noiseGain.gain.setValueAtTime(vel, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(gain)

      noise.start(now)

      step++
    }, (BEAT / 2) * 1000)

    intervals.push(interval as unknown as number)
  }

  function createArp(ctx: AudioContext, gain: GainNode): void {
    const arpNotes = [NOTES.D4, NOTES.F4, NOTES.A4, NOTES.D5, NOTES.A4, NOTES.F4]
    let step = 0

    const interval = setInterval(() => {
      if (!playing.value || globalStore.muted) return

      const section = SECTIONS[currentSection.value % SECTIONS.length]
      if (!section.arp) {
        step++
        return
      }

      const now = ctx.currentTime
      const note = arpNotes[step % arpNotes.length]

      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = 'square'
      osc.frequency.value = note

      filter.type = 'lowpass'
      filter.frequency.value = 2000

      oscGain.gain.setValueAtTime(0.06, now)
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

      osc.connect(filter)
      filter.connect(oscGain)
      oscGain.connect(gain)

      osc.start(now)
      osc.stop(now + 0.15)

      step++
    }, (BEAT / 4) * 1000)

    intervals.push(interval as unknown as number)
  }

  function createSnare(ctx: AudioContext, gain: GainNode): void {
    let step = 0
    const snarePattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]

    const interval = setInterval(() => {
      if (!playing.value || globalStore.muted) return

      const section = SECTIONS[currentSection.value % SECTIONS.length]
      if (!section.snare) {
        step++
        return
      }

      const hit = snarePattern[step % 16]
      if (hit) {
        const now = ctx.currentTime
        const bufferSize = ctx.sampleRate * 0.12
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)

        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1
        }

        const noise = ctx.createBufferSource()
        const noiseGain = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        noise.buffer = buffer
        filter.type = 'highpass'
        filter.frequency.value = 1800

        noiseGain.gain.setValueAtTime(0.15 * section.intensity, now)
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

        noise.connect(filter)
        filter.connect(noiseGain)
        noiseGain.connect(gain)

        noise.start(now)
      }

      step++
    }, (BEAT / 4) * 1000)

    intervals.push(interval as unknown as number)
  }

  function createLead(ctx: AudioContext, gain: GainNode): void {
    const melodies = [
      [NOTES.D5, 0, NOTES.F3 * 4, NOTES.E4, NOTES.D5, 0, NOTES.C4, NOTES.A4],
      [NOTES.A4, NOTES.Bb4, 0, NOTES.A4, NOTES.G4, NOTES.F4, 0, 0],
      [0, NOTES.F3 * 4, NOTES.E4, NOTES.D5, 0, NOTES.C4, NOTES.D5, 0],
      [NOTES.G4, 0, NOTES.A4, NOTES.Bb4, NOTES.C4, 0, NOTES.A4, 0]
    ]
    let melodyIndex = 0
    let melodyStep = 0
    let melodyPlaying = false

    // Trigger melody every 4 bars
    const triggerInterval = setInterval(() => {
      if (!playing.value || globalStore.muted) return
      const section = SECTIONS[currentSection.value % SECTIONS.length]
      if (section.lead) {
        melodyPlaying = true
        melodyStep = 0
      }
    }, BAR * 4 * 1000)
    intervals.push(triggerInterval as unknown as number)

    // Play melody notes
    const noteInterval = setInterval(() => {
      if (!playing.value || globalStore.muted || !melodyPlaying) return

      const section = SECTIONS[currentSection.value % SECTIONS.length]
      if (!section.lead) {
        melodyStep++
        if (melodyStep >= 8) melodyPlaying = false
        return
      }

      const melody = melodies[melodyIndex % melodies.length]
      const note = melody[melodyStep % 8]

      if (note) {
        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const oscGain = ctx.createGain()
        const filter = ctx.createBiquadFilter()

        osc.type = 'sawtooth'
        osc.frequency.value = note
        osc2.type = 'triangle'
        osc2.frequency.value = note * 0.999

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2000, now)
        filter.frequency.exponentialRampToValueAtTime(500, now + BEAT * 0.65)
        filter.Q.value = 2.5

        oscGain.gain.setValueAtTime(0.05 * section.intensity, now)
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + BEAT * 0.85)

        osc.connect(filter)
        osc2.connect(filter)
        filter.connect(oscGain)
        oscGain.connect(gain)

        osc.start(now)
        osc2.start(now)
        osc.stop(now + BEAT)
        osc2.stop(now + BEAT)
      }

      melodyStep++
      if (melodyStep >= 8) {
        melodyPlaying = false
        melodyIndex++
      }
    }, BEAT * 1000)
    intervals.push(noteInterval as unknown as number)
  }

  function updateSection(): void {
    const interval = setInterval(() => {
      if (!playing.value) return

      currentBeat.value++

      const section = SECTIONS[currentSection.value % SECTIONS.length]
      const beatsInSection = section.bars * 4

      if (currentBeat.value >= beatsInSection) {
        currentBeat.value = 0
        currentSection.value = (currentSection.value + 1) % SECTIONS.length
      }
    }, BEAT * 1000)

    intervals.push(interval as unknown as number)
  }

  function start(): void {
    if (playing.value) return
    if (!audio.init()) return

    const ctx = audio.getContext()
    const mainGain = audio.getMusicGain()
    if (!ctx || !mainGain) return

    // Create master music gain
    musicGain = ctx.createGain()
    musicGain.gain.value = 0.4
    musicGain.connect(mainGain)
    nodes.push(musicGain)

    playing.value = true
    currentSection.value = 0
    currentBeat.value = 0
    chordIndex = 0

    createDrone(ctx, musicGain)
    createPad(ctx, musicGain)
    createBass(ctx, musicGain)
    createKick(ctx, musicGain)
    createSnare(ctx, musicGain)
    createHiHat(ctx, musicGain)
    createArp(ctx, musicGain)
    createLead(ctx, musicGain)
    updateSection()
  }

  function stop(): void {
    playing.value = false
    cleanup()
    musicGain = null
  }

  function setVolume(volume: number): void {
    if (musicGain) {
      musicGain.gain.value = volume
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    playing,
    currentSection,
    currentBeat,
    start,
    stop,
    setVolume
  }
}
