import { useOrreryStore } from '@/stores/orrery'
import { hitTest, RINGS } from './geometry'

// ═══════════════════════════════════════════════════════════════════
// ORRERY input recognizer. One pointer at a time, on the sequencer surface:
//   • tap a cell            → toggle it (and select its track)
//   • drag across a ring    → paint cells to the first cell's new state (band-locked)
//   • long-press an on-cell → adjust: vertical drag = velocity,
//                             melodic tracks also horizontal drag = pitch (degree)
//   • tap the hub           → play/stop
//   • vertical drag on hub  → BPM
//   • long-press the hub    → panic + stop
// Client coords are mapped to the 720 logical space via the canvas rect, so it
// stays correct under CircularViewport's --stage-scale.
// ═══════════════════════════════════════════════════════════════════

const DEADZONE = 8
const LONGPRESS_MS = 340

type Mode = 'idle' | 'cell-pending' | 'paint' | 'adjust' | 'hub' | 'hub-bpm'

export function useOrreryInput() {
  const store = useOrreryStore()

  let el: HTMLElement | null = null
  let mode: Mode = 'idle'
  let pointerId = -1
  let downX = 0, downY = 0
  let startX = 0, startY = 0
  let downCell: { t: number; step: number } | null = null
  let paintState = false
  let startVel = 0.8, startDegree = 0, startBpm = 120
  let longTimer: ReturnType<typeof setTimeout> | null = null
  let moved = false

  function toLocal(e: PointerEvent): { x: number; y: number } {
    const rect = el!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width * 720,
      y: (e.clientY - rect.top) / rect.height * 720
    }
  }

  function lens(): number[] { return store.tracks.map(t => t.len) }

  function clearLong(): void {
    if (longTimer) { clearTimeout(longTimer); longTimer = null }
  }

  function onDown(e: PointerEvent): void {
    if (pointerId !== -1) return
    pointerId = e.pointerId
    try { el!.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    e.preventDefault()

    const { x, y } = toLocal(e)
    downX = startX = x
    downY = startY = y
    moved = false
    const hit = hitTest(x, y, lens())

    if (hit.kind === 'hub') {
      mode = 'hub'
      startBpm = store.bpm
      longTimer = setTimeout(() => { store.panic(); store.stop(); mode = 'idle'; navigator.vibrate?.(20) }, LONGPRESS_MS + 260)
      return
    }

    if (hit.kind === 'cell' && hit.track !== undefined && hit.step !== undefined) {
      mode = 'cell-pending'
      downCell = { t: hit.track, step: hit.step }
      store.selectTrack(hit.track)
      const s = store.tracks[hit.track].steps[hit.step]
      startVel = s.vel
      startDegree = s.degree
      longTimer = setTimeout(() => enterAdjust(), LONGPRESS_MS)
      return
    }

    if (hit.kind === 'gauge') {
      mode = 'hub-bpm'
      startBpm = store.bpm
      return
    }
    mode = 'idle'
  }

  function enterAdjust(): void {
    if (!downCell || moved) return
    mode = 'adjust'
    const s = store.tracks[downCell.t].steps[downCell.step]
    if (!s.on) { store.toggleStep(downCell.t, downCell.step) } // place then adjust
    startVel = store.tracks[downCell.t].steps[downCell.step].vel
    startDegree = store.tracks[downCell.t].steps[downCell.step].degree
    navigator.vibrate?.(12)
  }

  function onMove(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return
    const { x, y } = toLocal(e)
    const dx = x - downX
    const dy = y - downY
    if (!moved && Math.hypot(x - startX, y - startY) > DEADZONE) moved = true

    if (mode === 'hub' || mode === 'hub-bpm') {
      if (moved) { clearLong(); store.setBpm(startBpm + (downY - y) * 0.25) }
      return
    }

    if (mode === 'cell-pending' && moved) {
      // begin painting: target = opposite of the down cell's state
      clearLong()
      const wasOn = downCell ? store.tracks[downCell.t].steps[downCell.step].on : false
      paintState = !wasOn
      mode = 'paint'
      if (downCell) store.setStep(downCell.t, downCell.step, paintState)
    }

    if (mode === 'paint' && downCell) {
      // band-locked: map the angle onto the down-cell's track ring
      const t = downCell.t
      const len = store.tracks[t].len
      let a = Math.atan2(y - 360, x - 360) + Math.PI / 2
      a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      const step = Math.floor((a / (Math.PI * 2)) * len) % len
      store.setStep(t, step, paintState)
      return
    }

    if (mode === 'adjust' && downCell) {
      const tr = store.tracks[downCell.t]
      if (tr.melodic && Math.abs(dx) > Math.abs(dy)) {
        store.setDegree(downCell.t, downCell.step, startDegree + Math.round(dx / 26))
      } else {
        store.setVelocity(downCell.t, downCell.step, startVel + (-dy) / 130)
      }
    }
  }

  function onUp(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return
    clearLong()
    try { el!.releasePointerCapture(e.pointerId) } catch { /* ignore */ }

    if (mode === 'hub' && !moved) { store.togglePlay(); navigator.vibrate?.(14) }
    else if (mode === 'cell-pending' && !moved && downCell) {
      store.toggleStep(downCell.t, downCell.step); navigator.vibrate?.(10)
    }

    reset()
  }

  /** Abort the gesture without committing a tap/toggle (e.g. pointercancel). */
  function onCancel(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return
    clearLong()
    try { el!.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    reset()
  }

  function reset(): void {
    mode = 'idle'
    pointerId = -1
    downCell = null
    moved = false
  }

  function attach(element: HTMLElement): void {
    el = element
    element.addEventListener('pointerdown', onDown, { passive: false })
    element.addEventListener('pointermove', onMove, { passive: false })
    element.addEventListener('pointerup', onUp)
    element.addEventListener('pointercancel', onCancel)
  }
  function detach(): void {
    if (!el) return
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onCancel)
    clearLong()
    el = null
  }

  return { attach, detach, RINGS }
}
