import { computed } from 'vue'
import { useGlobalStore } from '@/stores/global'

export function useCRT() {
  const globalStore = useGlobalStore()

  const enabled = computed(() => globalStore.crtEnabled)
  const performanceMode = computed(() => globalStore.performanceMode)

  function toggle(): void {
    globalStore.toggleCRT()
  }

  function enable(): void {
    if (!globalStore.crtEnabled) {
      globalStore.toggleCRT()
    }
  }

  function disable(): void {
    if (globalStore.crtEnabled) {
      globalStore.toggleCRT()
    }
  }

  function setPerformanceMode(value: boolean): void {
    if (globalStore.performanceMode !== value) {
      globalStore.togglePerformanceMode()
    }
  }

  // CSS class object for CRT effects
  const crtClasses = computed(() => ({
    'crt-enabled': globalStore.crtEnabled,
    'perf-mode': globalStore.performanceMode
  }))

  return {
    enabled,
    performanceMode,
    toggle,
    enable,
    disable,
    setPerformanceMode,
    crtClasses
  }
}
