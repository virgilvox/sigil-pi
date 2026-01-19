import type { Point, Polar } from '@/types'

export function useCircularLayout(size: number = 720) {
  const center = size / 2

  /**
   * Convert polar coordinates to cartesian
   */
  function polarToCartesian(angle: number, radius: number): Point {
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    }
  }

  /**
   * Convert cartesian coordinates to polar
   */
  function cartesianToPolar(x: number, y: number): Polar {
    const dx = x - center
    const dy = y - center
    return {
      angle: Math.atan2(dy, dx),
      radius: Math.sqrt(dx * dx + dy * dy)
    }
  }

  /**
   * Get angle from center to point
   */
  function angleToPoint(x: number, y: number): number {
    return Math.atan2(y - center, x - center)
  }

  /**
   * Get distance from center to point
   */
  function distanceFromCenter(x: number, y: number): number {
    return Math.sqrt((x - center) ** 2 + (y - center) ** 2)
  }

  /**
   * Get distance between two points
   */
  function distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  /**
   * Normalize angle to 0-2PI range
   */
  function normalizeAngle(angle: number): number {
    let a = angle
    while (a < 0) a += Math.PI * 2
    while (a >= Math.PI * 2) a -= Math.PI * 2
    return a
  }

  /**
   * Get smallest angle difference between two angles
   */
  function angleDifference(a1: number, a2: number): number {
    let d = normalizeAngle(a2 - a1)
    if (d > Math.PI) d -= Math.PI * 2
    return d
  }

  /**
   * Linear interpolation
   */
  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * Clamp value between min and max
   */
  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * Check if point is within a circular zone (e.g., player zone)
   */
  function isInZone(x: number, y: number, zoneAngle: number, halfSpan: number = Math.PI / 2): boolean {
    const pointAngle = angleToPoint(x, y)
    return Math.abs(angleDifference(pointAngle, zoneAngle)) < halfSpan
  }

  /**
   * Check if point is within a ring (annulus)
   */
  function isInRing(x: number, y: number, innerRadius: number, outerRadius: number): boolean {
    const d = distanceFromCenter(x, y)
    return d >= innerRadius && d <= outerRadius
  }

  /**
   * Get positions around a circle
   */
  function getCirclePositions(count: number, radius: number, startAngle: number = -Math.PI / 2): Point[] {
    const positions: Point[] = []
    const angleStep = (Math.PI * 2) / count

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep
      positions.push(polarToCartesian(angle, radius))
    }

    return positions
  }

  /**
   * Get arc positions (evenly spaced along an arc)
   */
  function getArcPositions(count: number, radius: number, startAngle: number, endAngle: number): Point[] {
    const positions: Point[] = []
    const angleSpan = endAngle - startAngle
    const angleStep = angleSpan / (count - 1)

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep
      positions.push(polarToCartesian(angle, radius))
    }

    return positions
  }

  return {
    center,
    polarToCartesian,
    cartesianToPolar,
    angleToPoint,
    distanceFromCenter,
    distance,
    normalizeAngle,
    angleDifference,
    lerp,
    clamp,
    isInZone,
    isInRing,
    getCirclePositions,
    getArcPositions
  }
}
