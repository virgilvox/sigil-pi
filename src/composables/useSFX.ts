import { useAudio } from './useAudio'
import { useGlobalStore } from '@/stores/global'

export type SFXType = 'cast' | 'hit' | 'block' | 'collect' | 'damage' | 'heal' | 'victory' | 'defeat' | 'click'

export function useSFX() {
  const audio = useAudio()
  const globalStore = useGlobalStore()

  function beep(ctx: AudioContext, gain: GainNode, freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15): void {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()

    osc.type = type
    osc.frequency.value = freq

    oscGain.gain.setValueAtTime(volume, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    osc.connect(oscGain)
    oscGain.connect(gain)

    osc.start(now)
    osc.stop(now + duration)
  }

  function noise(ctx: AudioContext, gain: GainNode, duration: number, volume = 0.15): void {
    const now = ctx.currentTime
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = ctx.createBufferSource()
    const sourceGain = ctx.createGain()

    source.buffer = buffer
    sourceGain.gain.setValueAtTime(volume, now)
    sourceGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    source.connect(sourceGain)
    sourceGain.connect(gain)

    source.start(now)
  }

  function play(type: SFXType): void {
    if (globalStore.muted) return
    if (!audio.init()) return

    const ctx = audio.getContext()
    const sfxGain = audio.getSfxGain()
    if (!ctx || !sfxGain) return

    switch (type) {
      case 'cast':
        beep(ctx, sfxGain, 220, 0.07, 'sawtooth', 0.18)
        setTimeout(() => beep(ctx, sfxGain, 330, 0.07, 'sawtooth', 0.15), 35)
        setTimeout(() => beep(ctx, sfxGain, 440, 0.09, 'sawtooth', 0.12), 70)
        setTimeout(() => beep(ctx, sfxGain, 660, 0.15, 'sine', 0.1), 120)
        setTimeout(() => noise(ctx, sfxGain, 0.08, 0.12), 180)
        break

      case 'hit':
        noise(ctx, sfxGain, 0.1, 0.3)
        beep(ctx, sfxGain, 150, 0.12, 'square', 0.22)
        beep(ctx, sfxGain, 100, 0.15, 'sawtooth', 0.15)
        break

      case 'block':
        beep(ctx, sfxGain, 300, 0.08, 'square', 0.15)
        noise(ctx, sfxGain, 0.06, 0.1)
        break

      case 'collect':
        beep(ctx, sfxGain, 600, 0.06, 'sine', 0.12)
        setTimeout(() => beep(ctx, sfxGain, 800, 0.08, 'sine', 0.1), 50)
        break

      case 'damage':
        noise(ctx, sfxGain, 0.12, 0.25)
        beep(ctx, sfxGain, 80, 0.15, 'sawtooth', 0.2)
        break

      case 'heal':
        beep(ctx, sfxGain, 400, 0.08, 'sine', 0.12)
        setTimeout(() => beep(ctx, sfxGain, 600, 0.12, 'sine', 0.1), 60)
        break

      case 'victory':
        [0, 50, 100, 150, 200].forEach((delay, i) => {
          setTimeout(() => {
            beep(ctx, sfxGain, [261, 329, 392, 523, 659][i], 0.1, 'square', 0.15)
          }, delay)
        })
        break

      case 'defeat':
        [0, 100, 200].forEach((delay, i) => {
          setTimeout(() => {
            beep(ctx, sfxGain, [200, 150, 100][i], 0.18, 'sawtooth', 0.18)
          }, delay)
        })
        break

      case 'click':
        beep(ctx, sfxGain, 600, 0.02, 'square', 0.06)
        break
    }
  }

  return {
    play
  }
}
