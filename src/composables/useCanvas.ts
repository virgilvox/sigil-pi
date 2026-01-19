import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { CanvasLayer } from '@/types'

export interface UseCanvasOptions {
  size?: number
  layers?: string[]
}

export function useCanvas(containerRef: Ref<HTMLElement | null>, options: UseCanvasOptions = {}) {
  const { size = 720, layers = ['bg', 'main'] } = options

  const canvasLayers = ref<Map<string, CanvasLayer>>(new Map())
  const ready = ref(false)

  function createLayers(): void {
    if (!containerRef.value) return

    canvasLayers.value.clear()

    layers.forEach((name, index) => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: ${index};
      `

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      containerRef.value!.appendChild(canvas)
      canvasLayers.value.set(name, { canvas, ctx, name })
    })

    ready.value = true
  }

  function getLayer(name: string): CanvasLayer | undefined {
    return canvasLayers.value.get(name)
  }

  function getContext(name: string): CanvasRenderingContext2D | null {
    const layer = canvasLayers.value.get(name)
    return layer ? layer.ctx : null
  }

  function clear(name?: string): void {
    if (name) {
      const layer = canvasLayers.value.get(name)
      if (layer) {
        layer.ctx.clearRect(0, 0, size, size)
      }
    } else {
      canvasLayers.value.forEach(layer => {
        layer.ctx.clearRect(0, 0, size, size)
      })
    }
  }

  function clearCircle(name?: string): void {
    const center = size / 2
    if (name) {
      const layer = canvasLayers.value.get(name)
      if (layer) {
        layer.ctx.clearRect(0, 0, size, size)
      }
    } else {
      canvasLayers.value.forEach(layer => {
        layer.ctx.save()
        layer.ctx.beginPath()
        layer.ctx.arc(center, center, center, 0, Math.PI * 2)
        layer.ctx.clip()
        layer.ctx.clearRect(0, 0, size, size)
        layer.ctx.restore()
      })
    }
  }

  function destroy(): void {
    canvasLayers.value.forEach(layer => {
      layer.canvas.remove()
    })
    canvasLayers.value.clear()
    ready.value = false
  }

  onMounted(() => {
    createLayers()
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    canvasLayers,
    ready,
    getLayer,
    getContext,
    clear,
    clearCircle,
    createLayers,
    destroy
  }
}
