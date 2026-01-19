import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGlobalStore = defineStore('global', () => {
  // Display settings
  const displaySize = ref(720)
  const crtEnabled = ref(true)
  const performanceMode = ref(false)

  // Audio settings
  const muted = ref(false)
  const masterVolume = ref(0.5)
  const musicVolume = ref(0.35)
  const sfxVolume = ref(0.6)

  // Navigation state
  const overlayMenuOpen = ref(false)
  const currentGame = ref<string | null>(null)

  // Audio context
  let audioContext: AudioContext | null = null
  const audioInitialized = ref(false)

  // Computed
  const effectiveVolume = computed(() => muted.value ? 0 : masterVolume.value)

  // Actions
  function initAudio(): AudioContext | null {
    if (audioContext) return audioContext
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioInitialized.value = true
      return audioContext
    } catch (e) {
      console.warn('Audio init failed:', e)
      return null
    }
  }

  function resumeAudio(): void {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume()
    }
  }

  function getAudioContext(): AudioContext | null {
    return audioContext
  }

  function toggleMute(): void {
    muted.value = !muted.value
  }

  function toggleCRT(): void {
    crtEnabled.value = !crtEnabled.value
  }

  function togglePerformanceMode(): void {
    performanceMode.value = !performanceMode.value
  }

  function openOverlayMenu(): void {
    overlayMenuOpen.value = true
  }

  function closeOverlayMenu(): void {
    overlayMenuOpen.value = false
  }

  function setCurrentGame(game: string | null): void {
    currentGame.value = game
  }

  function detectDisplaySize(): void {
    const size = Math.min(window.innerWidth, window.innerHeight)
    displaySize.value = size >= 700 ? 720 : size >= 480 ? 480 : size
    document.documentElement.style.setProperty('--display-size', `${displaySize.value}px`)
  }

  return {
    // State
    displaySize,
    crtEnabled,
    performanceMode,
    muted,
    masterVolume,
    musicVolume,
    sfxVolume,
    overlayMenuOpen,
    currentGame,
    audioInitialized,
    // Computed
    effectiveVolume,
    // Actions
    initAudio,
    resumeAudio,
    getAudioContext,
    toggleMute,
    toggleCRT,
    togglePerformanceMode,
    openOverlayMenu,
    closeOverlayMenu,
    setCurrentGame,
    detectDisplaySize
  }
})
