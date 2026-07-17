import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Persisted display tuning. The app renders in a fixed 720 logical space that is
// CSS-scaled to whatever round panel is attached (4" ~720px, 5" ~1080px, etc.), so
// these two knobs let the owner dial the fit to their exact glass without a rebuild.
const STORAGE_KEY = 'sigil-pi:display'

interface DisplaySettings {
  /** 0 = auto-detect from the framebuffer; >0 forces a diameter for odd panels. */
  diameterOverride: number
  /** Bezel inset. 1 = fill edge-to-edge; <1 shrinks the circle inside the glass. */
  gameScale: number
}

function loadDisplaySettings(): DisplaySettings {
  const defaults: DisplaySettings = { diameterOverride: 0, gameScale: 0.92 }
  if (typeof localStorage === 'undefined') return defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<DisplaySettings>
    return {
      diameterOverride: Number(parsed.diameterOverride) || 0,
      gameScale: Number(parsed.gameScale) || defaults.gameScale
    }
  } catch {
    return defaults
  }
}

export const useGlobalStore = defineStore('global', () => {
  const persisted = loadDisplaySettings()

  // Display settings
  const displaySize = ref(720)
  const diameterOverride = ref(persisted.diameterOverride)
  const gameScale = ref(persisted.gameScale)
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

  function applyDisplayVars(): void {
    const root = document.documentElement.style
    root.setProperty('--display-size', `${displaySize.value}px`)
    root.setProperty('--game-scale', `${gameScale.value}`)
    // Uniform scale from the 720 logical stage to the physical panel, with the
    // bezel-inset factor folded in. Consumed by CircularViewport's .viewport-stage.
    root.setProperty('--stage-scale', `${(displaySize.value / 720) * gameScale.value}`)
  }

  function persistDisplaySettings(): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        diameterOverride: diameterOverride.value,
        gameScale: gameScale.value
      }))
    } catch {
      // Ignore storage failures (private mode / quota) — settings just won't persist.
    }
  }

  function detectDisplaySize(): void {
    // The visible circle on both the 4" and 5" round panels fills the framebuffer's
    // shorter side, so the true diameter is min(width, height). No snapping to 720 —
    // that capped the 5" panel to a small centered circle. An explicit override wins
    // for unusual panels where the round glass is smaller than the framebuffer.
    const auto = Math.min(window.innerWidth, window.innerHeight)
    displaySize.value = diameterOverride.value > 0 ? diameterOverride.value : auto
    applyDisplayVars()
  }

  function setGameScale(scale: number): void {
    gameScale.value = Math.max(0.5, Math.min(1, scale))
    applyDisplayVars()
    persistDisplaySettings()
  }

  function setDiameterOverride(diameter: number): void {
    diameterOverride.value = Math.max(0, Math.round(diameter))
    detectDisplaySize()
    persistDisplaySettings()
  }

  return {
    // State
    displaySize,
    diameterOverride,
    gameScale,
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
    detectDisplaySize,
    setGameScale,
    setDiameterOverride
  }
})
