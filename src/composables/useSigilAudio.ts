import { Scale, euclid, type Bellows, type Instrument } from 'bellowsjs'
import { useBellows } from '@/composables/useBellows'

// ═══════════════════════════════════════════════════════════════════
// Sigil audio — bellowsjs SFX + a randomized, high-energy EUCLIDEAN backing
// track for the circular duel. Boots from the game-start gesture; SFX no-op
// silently until booted. Music (full/Sigil+ mode) generates fresh euclidean
// drum/bass/lead patterns and re-rolls them every few bars for evolving drive.
// ═══════════════════════════════════════════════════════════════════

export type SigilSfx =
  | 'cast' | 'hit' | 'block' | 'collect' | 'damage' | 'heal' | 'victory' | 'defeat' | 'click'

export function useSigilAudio() {
  const engine = useBellows({ seed: 'sigil-duel', bpm: 156 }) // fast = energetic

  // non-reactive voices
  const v: Record<string, Instrument> = {}
  let musicScale: Scale | null = null

  // euclidean pattern state (0/1 arrays) + note tables, re-rolled periodically
  let pat = { kick: [] as number[], snare: [] as number[], hat: [] as number[], bass: [] as number[], lead: [] as number[] }
  let bassNotes: number[] = []
  let leadNotes: number[] = []

  function ri(lo: number, hi: number): number { return lo + Math.floor(Math.random() * (hi - lo + 1)) }
  function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }

  function buildKit(bell: Bellows): void {
    bell.masterGain(0.8)
    bell.masterFx(['limiter', { ceiling: -1 }])
    const drums = bell.bus([['plate', { mix: 0.1, decay: 0.3 }]], { level: 0.9 })
    const delay = bell.bus([['tapeDelay', { time: 0.19, feedback: 0.34, mix: 1 }]], { level: 0.3 })

    // rhythm section — punchy, driving
    v.kick = bell.voice('kick', { clickTune: 8, pitchDecay: 0.04, decay: 0.32, drive: 4 })
    v.snare = bell.voice('snare', { tone: 0.5, decay: 0.16, snap: 0.5 })
    v.hat = bell.voice('hat', { decay: 0.05, tone: 1.4 }, { polyphony: 3 })
    ;[v.kick, v.snare, v.hat].forEach(x => x.send(drums, 0.3))
    v.bass = bell.voice('va', { shape: 0, sub: 0.7, cutoff: 1100, resonance: 0.45, attack: 0.002, decay: 0.18, sustain: 0.35, release: 0.08 }, { polyphony: 1 })
    v.bass.gain(0.95)
    v.lead = bell.voice('fm', { algorithm: 2, brightness: 1.3, ratio2: 2, level2: 0.7 }, { polyphony: 4 })
    v.lead.gain(0.55); v.lead.send(delay, 0.3)

    // SFX voices
    v.zap = bell.voice('fm', { algorithm: 3, brightness: 1.8, feedback: 0.4 }, { polyphony: 4 })
    v.zap.send(delay, 0.2)
    v.perc = bell.voice('noise', { color: 1, filterMode: 1, cutoff: 3000, resonance: 0.3, attack: 0.001, decay: 0.12, sustain: 0 }, { polyphony: 4 })
    v.tone = bell.voice('pluck', { damp: 0.3, decay: 1.4 }, { polyphony: 6 })
    v.chord = bell.voice('va', { shape: 0, detune: 12, sub: 0.3, cutoff: 2400, resonance: 0.2, attack: 0.01, decay: 0.4, sustain: 0.5, release: 0.6 }, { polyphony: 8 })
    v.chord.send(delay, 0.2)

    musicScale = new Scale('E', 'phrygian') // dark, tense, energetic
  }

  function regenerate(): void {
    if (!musicScale) return
    pat.kick = euclid(pick([4, 5, 4]), 16)          // driving four-ish on the floor
    pat.snare = euclid(pick([2, 4]), 16, 4)         // backbeat + ghosts, rotated to beat 2
    pat.hat = euclid(ri(11, 14), 16, ri(0, 3))      // busy hats
    pat.bass = euclid(ri(7, 10), 16)                // fast bassline
    pat.lead = euclid(ri(5, 8), 16, ri(0, 4))       // arpeggiated stabs
    bassNotes = pat.bass.map(() => musicScale!.degreeToMidi(pick([0, 0, 2, 4, -3]), 2))
    leadNotes = pat.lead.map(() => musicScale!.degreeToMidi(ri(0, 7), 4))
  }

  function scheduler(t: number, step: number): void {
    const s = ((step % 16) + 16) % 16
    if (s === 0 && Math.floor(step / 16) % 4 === 0) regenerate()  // re-roll every 4 bars
    if (pat.kick[s]) v.kick?.note(48, { at: t, vel: 1 })
    if (pat.snare[s]) v.snare?.note(48, { at: t, vel: 0.9 })
    if (pat.hat[s]) v.hat?.note(48, { at: t, vel: 0.4 + Math.random() * 0.35 })
    if (pat.bass[s]) v.bass?.note(bassNotes[s] ?? 40, { at: t, dur: '16n', vel: 0.9 })
    if (pat.lead[s]) v.lead?.note(leadNotes[s] ?? 64, { at: t, dur: '16n', vel: 0.7 })
  }

  async function boot(): Promise<void> {
    engine.configure(buildKit)
    await engine.boot()
    engine.onStep(scheduler)
  }

  function sfx(name: SigilSfx): void {
    const scale = musicScale
    switch (name) {
      case 'cast':    v.zap?.note(ri(72, 86), { vel: 0.9, dur: { seconds: 0.22 } }); break
      case 'hit':     v.perc?.note(ri(60, 76), { vel: 0.8, dur: { seconds: 0.12 } }); break
      case 'block':   v.tone?.note(ri(48, 60), { vel: 0.7, dur: { seconds: 0.4 } }); break
      case 'collect': v.tone?.note(scale ? scale.degreeToMidi(ri(3, 8), 5) : ri(72, 84), { vel: 0.6, dur: { seconds: 0.5 } }); break
      case 'damage':  v.perc?.note(ri(36, 46), { vel: 0.9, dur: { seconds: 0.2 } }); break
      case 'heal':    v.chord?.chord(scale ? [0, 2, 4].map(d => scale.degreeToMidi(d, 4)) : [64, 67, 71], { vel: 0.5, dur: { seconds: 0.7 } }); break
      case 'victory': v.chord?.chord([48, 55, 60, 64, 67], { vel: 0.7, dur: { seconds: 1.4 } }); break
      case 'defeat':  v.chord?.chord([40, 43, 47], { vel: 0.6, dur: { seconds: 1.2 } }); break
      case 'click':   v.tone?.note(72, { vel: 0.4, dur: { seconds: 0.1 } }); break
    }
  }

  function startMusic(): void {
    regenerate()
    engine.start()
  }
  function stopMusic(): void { engine.stop() }
  function dispose(): void { engine.teardown() }

  return { boot, sfx, startMusic, stopMusic, dispose, ready: engine.ready }
}
