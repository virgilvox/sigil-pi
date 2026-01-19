import { ref, computed } from 'vue'
import { useGlobalStore } from '@/stores/global'

export function useAudio() {
  const globalStore = useGlobalStore()

  const initialized = ref(false)
  let audioCtx: AudioContext | null = null
  let masterGain: GainNode | null = null
  let musicGain: GainNode | null = null
  let sfxGain: GainNode | null = null

  function init(): boolean {
    if (initialized.value) return true

    audioCtx = globalStore.initAudio()
    if (!audioCtx) return false

    masterGain = audioCtx.createGain()
    masterGain.gain.value = globalStore.masterVolume
    masterGain.connect(audioCtx.destination)

    musicGain = audioCtx.createGain()
    musicGain.gain.value = globalStore.musicVolume
    musicGain.connect(masterGain)

    sfxGain = audioCtx.createGain()
    sfxGain.gain.value = globalStore.sfxVolume
    sfxGain.connect(masterGain)

    initialized.value = true
    return true
  }

  function resume(): void {
    globalStore.resumeAudio()
  }

  function getContext(): AudioContext | null {
    return audioCtx
  }

  function getMasterGain(): GainNode | null {
    return masterGain
  }

  function getMusicGain(): GainNode | null {
    return musicGain
  }

  function getSfxGain(): GainNode | null {
    return sfxGain
  }

  function setMasterVolume(volume: number): void {
    if (masterGain) {
      masterGain.gain.value = volume
    }
  }

  function setMusicVolume(volume: number): void {
    if (musicGain) {
      musicGain.gain.value = volume
    }
  }

  function setSfxVolume(volume: number): void {
    if (sfxGain) {
      sfxGain.gain.value = volume
    }
  }

  const isMuted = computed(() => globalStore.muted)

  return {
    initialized,
    init,
    resume,
    getContext,
    getMasterGain,
    getMusicGain,
    getSfxGain,
    setMasterVolume,
    setMusicVolume,
    setSfxVolume,
    isMuted
  }
}
