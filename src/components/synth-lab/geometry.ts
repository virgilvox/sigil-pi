// Shared 720-space radial helpers for Synth Lab (center 360). Same conventions
// as orrery/geometry.ts: 12 o'clock = top, clockwise = increasing index.

export const CENTER = 360

export function polar(r: number, angle: number): { x: number; y: number } {
  return { x: CENTER + Math.cos(angle) * r, y: CENTER + Math.sin(angle) * r }
}

/** Angle of index i of n items, top-anchored, clockwise. */
export function indexAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i / n) * Math.PI * 2
}

/** Mid-angle of wedge i of n (for cell centers / labels). */
export function wedgeMidAngle(i: number, n: number): number {
  return -Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2
}

/** Normalized 0..2π angle from the top (clockwise) for a point. */
export function angleFromTop(px: number, py: number): number {
  let a = Math.atan2(py - CENTER, px - CENTER) + Math.PI / 2
  return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
}

export function distFromCenter(px: number, py: number): number {
  return Math.hypot(px - CENTER, py - CENTER)
}

/** Which wedge index (0..n-1) a point falls in. */
export function wedgeAt(px: number, py: number, n: number): number {
  return Math.floor((angleFromTop(px, py) / (Math.PI * 2)) * n) % n
}

export function ringSector(
  ctx: CanvasRenderingContext2D, rc: number, width: number, a0: number, a1: number
): void {
  const ri = rc - width / 2
  const ro = rc + width / 2
  ctx.beginPath()
  ctx.arc(CENTER, CENTER, ro, a0, a1)
  ctx.arc(CENTER, CENTER, ri, a1, a0, true)
  ctx.closePath()
}
