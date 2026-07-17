import { computed, type Ref } from 'vue'
import { useCircularLayout } from '@/composables/useCircularLayout'

// ═══════════════════════════════════════════════════════════════════
// Shared adaptive radial layout for the home menu and the app-switcher.
// Circumference-weighted ring planner: fills the outer ring first, adds rings
// as the count grows, and pages once a screen is full. One layout, two surfaces.
// ═══════════════════════════════════════════════════════════════════

export interface RingDef { r: number; cap: number }
const RINGS: RingDef[] = [
  { r: 292, cap: 12 }, // outer
  { r: 210, cap: 9 },  // mid
  { r: 138, cap: 6 }   // inner
]
export const PER_PAGE = RINGS.reduce((s, r) => s + r.cap, 0) // 27

export interface PlacedNode<T> {
  item: T
  x: number
  y: number
  angle: number
  ring: number
  ringCount: number
  index: number
}

/** How many nodes go on each active ring for a given count (fills outer first). */
function planRings(count: number): number[] {
  if (count <= 0) return []
  let rings = 1
  while (rings < RINGS.length &&
         RINGS.slice(0, rings).reduce((s, r) => s + r.cap, 0) < count) rings++
  const used = RINGS.slice(0, rings)
  const wTotal = used.reduce((s, r) => s + r.r, 0)
  const sizes = used.map(r => Math.round((count * r.r) / wTotal))
  // Correct rounding drift so Σ sizes === count exactly.
  let drift = count - sizes.reduce((a, b) => a + b, 0)
  for (let i = 0; drift !== 0; i = (i + 1) % sizes.length) {
    sizes[i] += drift > 0 ? 1 : -1
    drift += drift > 0 ? -1 : 1
  }
  return sizes
}

export function useSwitcherLayout<T>(items: Ref<T[]>, page: Ref<number>, size = 720) {
  const { polarToCartesian } = useCircularLayout(size)
  const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / PER_PAGE)))

  const placed = computed<PlacedNode<T>[]>(() => {
    const start = page.value * PER_PAGE
    const slice = items.value.slice(start, start + PER_PAGE)
    const sizes = planRings(slice.length)
    const out: PlacedNode<T>[] = []
    let cursor = 0
    let stagger = 0
    sizes.forEach((ringCount, ring) => {
      const { r } = RINGS[ring]
      // Nest adjacent rings so nodes interleave rather than line up radially.
      const phase = ring % 2 ? Math.PI / Math.max(ringCount, 1) : 0
      for (let k = 0; k < ringCount; k++) {
        const item = slice[cursor++]
        const angle = -Math.PI / 2 + phase + (k / ringCount) * Math.PI * 2
        const p = polarToCartesian(angle, r)
        out.push({ item, x: p.x, y: p.y, angle, ring, ringCount, index: stagger++ })
      }
    })
    return out
  })

  return { placed, pageCount, PER_PAGE }
}
