import { ref, onMounted, onUnmounted } from 'vue'
import type { TouchPoint, GestureState } from '@/types'

export interface UseGesturesOptions {
  edgeZone?: number
  swipeThreshold?: number
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function useGestures(options: UseGesturesOptions = {}) {
  const {
    edgeZone = 80,
    swipeThreshold = 50,
    onSwipeUp,
    onSwipeDown
  } = options

  const touches = ref<Map<number, TouchPoint>>(new Map())
  const gestureState = ref<GestureState>({
    active: false,
    type: 'none',
    touchCount: 0,
    startY: 0
  })

  // Mouse gesture state (for testing on desktop - hold Shift and drag from bottom)
  let mouseGestureActive = false
  let mouseStartY = 0

  function handleTouchStart(e: TouchEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const displayHeight = rect.height

    for (const touch of Array.from(e.changedTouches)) {
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      touches.value.set(touch.identifier, {
        id: touch.identifier,
        x,
        y,
        startX: x,
        startY: y,
        startTime: Date.now()
      })
    }

    gestureState.value.touchCount = touches.value.size

    // Check for two-finger swipe from bottom edge
    if (touches.value.size === 2) {
      const touchArray = Array.from(touches.value.values())
      const avgY = touchArray.reduce((sum, t) => sum + t.startY, 0) / 2

      // Check if both touches started in the bottom edge zone
      const allInEdge = touchArray.every(t => t.startY > displayHeight - edgeZone)

      if (allInEdge) {
        gestureState.value.active = true
        gestureState.value.startY = avgY
      }
    }
  }

  function handleTouchMove(e: TouchEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()

    for (const touch of Array.from(e.changedTouches)) {
      const existing = touches.value.get(touch.identifier)
      if (existing) {
        existing.x = touch.clientX - rect.left
        existing.y = touch.clientY - rect.top
      }
    }

    // Check for two-finger swipe gesture
    if (gestureState.value.active && touches.value.size === 2) {
      const touchArray = Array.from(touches.value.values())
      const avgY = touchArray.reduce((sum, t) => sum + t.y, 0) / 2
      const deltaY = gestureState.value.startY - avgY

      if (Math.abs(deltaY) > swipeThreshold) {
        if (deltaY > 0) {
          gestureState.value.type = 'swipe-up'
        } else {
          gestureState.value.type = 'swipe-down'
        }
      }
    }
  }

  function handleTouchEnd(e: TouchEvent): void {
    for (const touch of Array.from(e.changedTouches)) {
      touches.value.delete(touch.identifier)
    }

    // Execute gesture callbacks
    if (gestureState.value.active) {
      if (gestureState.value.type === 'swipe-up' && onSwipeUp) {
        e.preventDefault()
        e.stopPropagation()
        onSwipeUp()
      } else if (gestureState.value.type === 'swipe-down' && onSwipeDown) {
        e.preventDefault()
        e.stopPropagation()
        onSwipeDown()
      }
    }

    // Reset state when all touches end
    if (touches.value.size === 0) {
      gestureState.value = {
        active: false,
        type: 'none',
        touchCount: 0,
        startY: 0
      }
    }
  }

  function handleTouchCancel(e: TouchEvent): void {
    for (const touch of Array.from(e.changedTouches)) {
      touches.value.delete(touch.identifier)
    }

    if (touches.value.size === 0) {
      gestureState.value = {
        active: false,
        type: 'none',
        touchCount: 0,
        startY: 0
      }
    }
  }

  // Mouse gesture handlers (for desktop testing - Shift+drag from bottom edge)
  function handleMouseDown(e: MouseEvent): void {
    if (!e.shiftKey) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const displayHeight = rect.height

    // Check if click is in bottom edge zone
    if (y > displayHeight - edgeZone) {
      mouseGestureActive = true
      mouseStartY = y
      e.preventDefault()
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!mouseGestureActive) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const deltaY = mouseStartY - y

    if (Math.abs(deltaY) > swipeThreshold) {
      if (deltaY > 0) {
        gestureState.value.type = 'swipe-up'
      } else {
        gestureState.value.type = 'swipe-down'
      }
    }
  }

  function handleMouseUp(e: MouseEvent): void {
    if (!mouseGestureActive) return

    if (gestureState.value.type === 'swipe-up' && onSwipeUp) {
      onSwipeUp()
    } else if (gestureState.value.type === 'swipe-down' && onSwipeDown) {
      onSwipeDown()
    }

    mouseGestureActive = false
    mouseStartY = 0
    gestureState.value.type = 'none'
  }

  // Keyboard shortcut (Escape or M key to toggle menu)
  // Track menu state for keyboard toggle
  let menuOpen = false

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
      e.preventDefault()
      if (!menuOpen) {
        if (onSwipeUp) {
          onSwipeUp()
          menuOpen = true
        }
      } else {
        if (onSwipeDown) {
          onSwipeDown()
          menuOpen = false
        }
      }
    }
  }

  // Allow external sync of menu state
  function setMenuOpen(open: boolean): void {
    menuOpen = open
  }

  function attach(element: HTMLElement): void {
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: false })

    // Mouse gesture support for desktop testing
    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseup', handleMouseUp)

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown)
  }

  function detach(element: HTMLElement): void {
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
    element.removeEventListener('touchcancel', handleTouchCancel)

    element.removeEventListener('mousedown', handleMouseDown)
    element.removeEventListener('mousemove', handleMouseMove)
    element.removeEventListener('mouseup', handleMouseUp)

    document.removeEventListener('keydown', handleKeyDown)
  }

  return {
    touches,
    gestureState,
    attach,
    detach,
    setMenuOpen
  }
}
