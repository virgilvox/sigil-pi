// ═══════════════════════════════════════════════════════════════════
// ORRERY geometry — the single source of truth for the radial layout.
// 720 logical space, center (360,360). Bar-time maps to angle: 12 o'clock is
// the downbeat, clockwise is time. Concentric bands are tracks (outer = KICK).
// ═══════════════════════════════════════════════════════════════════

export const CENTER = 360
export const BAND = 34            // radial thickness of a track ring
export const HUB_R = 90           // transport hub radius (inside all rings)
export const TICK_R = 334         // outer tick ring (non-interactive)
export const DECO_R = 350

export interface RingDef {
  id: 'kick' | 'snare' | 'hat' | 'bass' | 'pluck' | 'lead'
  label: string
  rc: number          // ring center radius
  color: string
  melodic: boolean
}

// Ring centers spaced 37px apart (34 band + 3 gap). Outer → inner.
export const RINGS: RingDef[] = [
  { id: 'kick',  label: 'KICK',  rc: 298, color: '#e85a3c', melodic: false },
  { id: 'snare', label: 'SNARE', rc: 261, color: '#e8a13c', melodic: false },
  { id: 'hat',   label: 'HAT',   rc: 224, color: '#d9d089', melodic: false },
  { id: 'bass',  label: 'BASS',  rc: 187, color: '#3c8ee8', melodic: true },
  { id: 'pluck', label: 'PLUCK', rc: 150, color: '#8a7cc8', melodic: true },
  { id: 'lead',  label: 'LEAD',  rc: 113, color: '#4cc9a0', melodic: true }
]

export function ringInner(rc: number): number { return rc - BAND / 2 }
export function ringOuter(rc: number): number { return rc + BAND / 2 }

/** Angle (radians) of step i of a len-step ring. Top = step 0, clockwise. */
export function stepAngle(i: number, len: number): number {
  return -Math.PI / 2 + (i / len) * Math.PI * 2
}

/** Center angle of a step's cell (half-step offset), for drawing labels/hits. */
export function stepMidAngle(i: number, len: number): number {
  return -Math.PI / 2 + ((i + 0.5) / len) * Math.PI * 2
}

export function polar(r: number, angle: number): { x: number; y: number } {
  return { x: CENTER + Math.cos(angle) * r, y: CENTER + Math.sin(angle) * r }
}

export interface HitResult {
  kind: 'hub' | 'cell' | 'gauge' | 'outside'
  track?: number
  step?: number
  dist: number
  angle: number       // normalized 0..2π from the top, clockwise
}

/**
 * Hit-test a point in 720 space. `lens[t]` is the step count of track t.
 * The hub is the inner disc; the ring bands are cells; beyond the rings is
 * the BPM gauge (up to TICK_R) or outside.
 */
export function hitTest(px: number, py: number, lens: number[]): HitResult {
  const dx = px - CENTER
  const dy = py - CENTER
  const dist = Math.hypot(dx, dy)
  // normalize so the top (12 o'clock) is 0 and it grows clockwise
  let a = Math.atan2(dy, dx) + Math.PI / 2
  a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)

  if (dist <= HUB_R) return { kind: 'hub', dist, angle: a }

  for (let t = 0; t < RINGS.length; t++) {
    const rc = RINGS[t].rc
    if (dist >= ringInner(rc) && dist <= ringOuter(rc)) {
      const len = lens[t] || 16
      const step = Math.floor((a / (Math.PI * 2)) * len) % len
      return { kind: 'cell', track: t, step, dist, angle: a }
    }
  }

  if (dist <= TICK_R + 12) return { kind: 'gauge', dist, angle: a }
  return { kind: 'outside', dist, angle: a }
}
