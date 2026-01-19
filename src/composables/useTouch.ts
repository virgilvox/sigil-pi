import { ref } from 'vue'
import type { Point } from '@/types'

export interface UseTouchOptions {
  size?: number
  onStart?: (x: number, y: number) => void
  onMove?: (x: number, y: number) => void
  onEnd?: (x: number, y: number) => void
}

export function useTouch(options: UseTouchOptions = {}) {
  const { size = 720, onStart, onMove, onEnd } = options

  const touching = ref(false)
  const position = ref<Point>({ x: 0, y: 0 })

  function getCoords(e: MouseEvent | TouchEvent, element: HTMLElement): Point {
    const rect = element.getBoundingClientRect()
    const touch = 'touches' in e
      ? (e.touches[0] || e.changedTouches[0])
      : e

    return {
      x: (touch.clientX - rect.left) / rect.width * size,
      y: (touch.clientY - rect.top) / rect.height * size
    }
  }

  function handleStart(e: MouseEvent | TouchEvent, element: HTMLElement): void {
    e.preventDefault()
    touching.value = true
    const coords = getCoords(e, element)
    position.value = coords
    onStart?.(coords.x, coords.y)
  }

  function handleMove(e: MouseEvent | TouchEvent, element: HTMLElement): void {
    e.preventDefault()
    const coords = getCoords(e, element)
    position.value = coords
    onMove?.(coords.x, coords.y)
  }

  function handleEnd(e: MouseEvent | TouchEvent, element: HTMLElement): void {
    e.preventDefault()
    touching.value = false
    const coords = getCoords(e, element)
    position.value = coords
    onEnd?.(coords.x, coords.y)
  }

  function attach(element: HTMLElement): void {
    element.addEventListener('mousedown', (e) => handleStart(e, element))
    element.addEventListener('mousemove', (e) => handleMove(e, element))
    element.addEventListener('mouseup', (e) => handleEnd(e, element))
    element.addEventListener('touchstart', (e) => handleStart(e, element), { passive: false })
    element.addEventListener('touchmove', (e) => handleMove(e, element), { passive: false })
    element.addEventListener('touchend', (e) => handleEnd(e, element), { passive: false })
  }

  function detach(element: HTMLElement): void {
    element.removeEventListener('mousedown', (e) => handleStart(e, element))
    element.removeEventListener('mousemove', (e) => handleMove(e, element))
    element.removeEventListener('mouseup', (e) => handleEnd(e, element))
    element.removeEventListener('touchstart', (e) => handleStart(e, element))
    element.removeEventListener('touchmove', (e) => handleMove(e, element))
    element.removeEventListener('touchend', (e) => handleEnd(e, element))
  }

  return {
    touching,
    position,
    attach,
    detach,
    getCoords
  }
}
