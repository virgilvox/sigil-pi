<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { useSigilStore } from '@/stores/sigil'
import { useGameLoop } from '@/composables/useGameLoop'
import { useProceduralMusic } from '@/composables/useProceduralMusic'
import { useSFX } from '@/composables/useSFX'
import { SPELLS, PLAYER_COLORS, COLORS, RADII, SIZE, CENTER } from '@/data/spells'
import type { SpellId } from '@/types'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'
import EnergyPips from '@/components/shared/EnergyPips.vue'
import SigilOverlay from './SigilOverlay.vue'

interface Props {
  mode?: 'lite' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'lite'
})

const globalStore = useGlobalStore()
const sigilStore = useSigilStore()
const music = useProceduralMusic()
const sfx = useSFX()

const containerRef = ref<HTMLElement | null>(null)
const bgCanvasRef = ref<HTMLCanvasElement | null>(null)
const mainCanvasRef = ref<HTMLCanvasElement | null>(null)

let bgCtx: CanvasRenderingContext2D | null = null
let ctx: CanvasRenderingContext2D | null = null
let orbTimer = 0

// Game state
const showStartOverlay = ref(true)
const showEndOverlay = ref(false)
const winner = ref<number | null>(null)


// Drawing functions
function drawSigil(c: CanvasRenderingContext2D, type: string, x: number, y: number, size: number, color: string, alpha = 1): void {
  c.save()
  c.translate(x, y)
  c.globalAlpha = alpha
  c.strokeStyle = color
  c.fillStyle = color
  c.lineWidth = size * 0.06
  c.lineCap = 'round'
  c.lineJoin = 'round'
  const s = size * 0.4

  switch (type) {
    case 'bolt':
      c.beginPath()
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 - Math.PI / 2
        c.moveTo(Math.cos(a) * s, Math.sin(a) * s)
        c.lineTo(Math.cos(a + Math.PI) * s * 0.3, Math.sin(a + Math.PI) * s * 0.3)
      }
      c.stroke()
      c.beginPath()
      c.arc(0, 0, s * 0.15, 0, Math.PI * 2)
      c.fill()
      break

    case 'lance':
      c.beginPath()
      c.rect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4)
      c.stroke()
      c.beginPath()
      c.moveTo(-s * 0.7, -s * 0.7)
      c.lineTo(s * 0.7, s * 0.7)
      c.moveTo(s * 0.7, -s * 0.7)
      c.lineTo(-s * 0.7, s * 0.7)
      c.stroke()
      c.beginPath()
      c.arc(0, 0, s * 0.35, 0, Math.PI * 2)
      c.stroke()
      break

    case 'ward':
      c.beginPath()
      c.arc(0, 0, s * 0.9, Math.PI * 0.2, Math.PI * 0.8)
      c.stroke()
      c.beginPath()
      c.arc(0, 0, s * 0.9, Math.PI * 1.2, Math.PI * 1.8)
      c.stroke()
      c.beginPath()
      c.arc(0, 0, s * 0.5, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.moveTo(0, -s * 0.35)
      c.lineTo(0, s * 0.35)
      c.moveTo(-s * 0.35, 0)
      c.lineTo(s * 0.35, 0)
      c.stroke()
      break

    case 'siphon':
      c.beginPath()
      for (let i = 0; i < 40; i++) {
        const t = i / 40
        const a = t * Math.PI * 3
        const r = s * 0.2 + t * s * 0.6
        if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        else c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      c.stroke()
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3
        c.beginPath()
        c.arc(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85, s * 0.08, 0, Math.PI * 2)
        c.fill()
      }
      break
  }
  c.restore()
}

function drawRune(c: CanvasRenderingContext2D, seed: number, x: number, y: number, size: number, alpha: number): void {
  c.save()
  c.translate(x, y)
  c.rotate(seed * Math.PI * 2)
  c.globalAlpha = alpha
  c.strokeStyle = COLORS.rune
  c.lineWidth = 1

  const type = Math.floor(seed * 5)
  const s = size * 0.4

  c.beginPath()
  if (type === 0) {
    c.arc(0, 0, s, 0, Math.PI * 2)
    c.moveTo(-s * 0.5, -s * 0.5)
    c.lineTo(s * 0.5, s * 0.5)
    c.moveTo(s * 0.5, -s * 0.5)
    c.lineTo(-s * 0.5, s * 0.5)
  } else if (type === 1) {
    c.moveTo(0, -s)
    c.lineTo(s * 0.866, s * 0.5)
    c.lineTo(-s * 0.866, s * 0.5)
    c.closePath()
  } else if (type === 2) {
    c.rect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4)
    c.moveTo(0, -s * 0.7)
    c.lineTo(0, s * 0.7)
  } else if (type === 3) {
    c.arc(0, 0, s, 0, Math.PI)
    c.arc(s * 0.3, 0, s * 0.7, Math.PI, 0, true)
  } else {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      if (i === 0) c.moveTo(Math.cos(a) * s, Math.sin(a) * s)
      else c.lineTo(Math.cos(a) * s, Math.sin(a) * s)
    }
    c.closePath()
  }
  c.stroke()
  c.restore()
}

function drawBackground(): void {
  if (!bgCtx) return
  const c = bgCtx

  // Background gradient
  const bg = c.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, RADII.outer)
  bg.addColorStop(0, '#0a0a10')
  bg.addColorStop(0.6, '#06060a')
  bg.addColorStop(1, '#030306')
  c.fillStyle = bg
  c.beginPath()
  c.arc(CENTER, CENTER, RADII.outer, 0, Math.PI * 2)
  c.fill()

  // Concentric rings
  c.strokeStyle = 'rgba(100, 80, 140, 0.06)'
  c.lineWidth = 1
  for (let r = 50; r < RADII.outer; r += 40) {
    c.beginPath()
    c.arc(CENTER, CENTER, r, 0, Math.PI * 2)
    c.stroke()
  }

  // Structure rings
  const structureRadii = [RADII.eye, RADII.inner, RADII.ring, RADII.cast, RADII.life]
  for (const r of structureRadii) {
    c.beginPath()
    c.arc(CENTER, CENTER, r, 0, Math.PI * 2)
    c.stroke()
  }

  // Radial lines
  c.strokeStyle = 'rgba(100, 80, 140, 0.04)'
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    c.beginPath()
    c.moveTo(CENTER + Math.cos(a) * RADII.eye, CENTER + Math.sin(a) * RADII.eye)
    c.lineTo(CENTER + Math.cos(a) * RADII.outer, CENTER + Math.sin(a) * RADII.outer)
    c.stroke()
  }

  // Zone colors
  const g1 = c.createLinearGradient(CENTER, 0, CENTER, SIZE)
  g1.addColorStop(0, PLAYER_COLORS[0].dim)
  g1.addColorStop(0.5, 'transparent')
  c.fillStyle = g1
  c.beginPath()
  c.arc(CENTER, CENTER, RADII.outer, Math.PI, Math.PI * 2)
  c.fill()

  const g2 = c.createLinearGradient(CENTER, 0, CENTER, SIZE)
  g2.addColorStop(0.5, 'transparent')
  g2.addColorStop(1, PLAYER_COLORS[1].dim)
  c.fillStyle = g2
  c.beginPath()
  c.arc(CENTER, CENTER, RADII.outer, 0, Math.PI)
  c.fill()

  // Clip to circle
  c.globalCompositeOperation = 'destination-in'
  c.beginPath()
  c.arc(CENTER, CENTER, RADII.outer, 0, Math.PI * 2)
  c.fill()
  c.globalCompositeOperation = 'source-over'
}

function draw(): void {
  if (!ctx) return
  const c = ctx

  c.clearRect(0, 0, SIZE, SIZE)

  c.save()
  c.beginPath()
  c.arc(CENTER, CENTER, RADII.outer, 0, Math.PI * 2)
  c.clip()

  // Static runes
  for (const r of sigilStore.runes) {
    drawRune(c, r.seed, r.x, r.y, r.size, r.alpha)
  }

  // Central eye
  const eye = c.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, RADII.eye)
  eye.addColorStop(0, 'rgba(140, 120, 180, 0.3)')
  eye.addColorStop(1, 'transparent')
  c.fillStyle = eye
  c.beginPath()
  c.arc(CENTER, CENTER, RADII.eye, 0, Math.PI * 2)
  c.fill()

  // Ring
  c.save()
  c.translate(CENTER, CENTER)
  c.rotate(sigilStore.ring.angle)
  c.strokeStyle = COLORS.ring
  c.lineWidth = RADII.ringW
  c.lineCap = 'round'
  c.beginPath()
  c.arc(0, 0, RADII.ring, 0, Math.PI * 2)
  c.stroke()
  c.strokeStyle = COLORS.energy
  c.lineWidth = 3
  for (const w of sigilStore.ring.walls) {
    c.beginPath()
    c.arc(0, 0, RADII.ring, w.s, w.e)
    c.stroke()
  }
  c.restore()

  // Player barriers
  for (let pid = 0; pid < sigilStore.players.length; pid++) {
    const p = sigilStore.players[pid]
    const col = PLAYER_COLORS[pid]
    for (const bar of p.barriers) {
      if (bar.hp <= 0) continue
      const flash = bar.flash > 0 ? bar.flash : 0
      c.save()
      c.translate(CENTER, CENTER)
      c.globalAlpha = 0.3 + flash * 0.4
      c.strokeStyle = col.glow
      c.lineWidth = 14
      c.lineCap = 'round'
      c.beginPath()
      c.arc(0, 0, bar.radius, bar.ang - bar.size, bar.ang + bar.size)
      c.stroke()
      c.globalAlpha = 0.8 + flash * 0.2
      c.strokeStyle = col.pri
      c.lineWidth = 4
      c.beginPath()
      c.arc(0, 0, bar.radius, bar.ang - bar.size, bar.ang + bar.size)
      c.stroke()
      c.restore()
    }
  }

  // Life rings
  for (let pid = 0; pid < sigilStore.players.length; pid++) {
    const p = sigilStore.players[pid]
    const col = PLAYER_COLORS[pid]
    const fullStartAng = p.angle - Math.PI / 2
    const fullEndAng = p.angle + Math.PI / 2
    const hpRatio = Math.max(0, p.hp / 100)
    const flash = p.flash > 0 ? p.flash : 0

    // Background
    c.strokeStyle = col.dim
    c.lineWidth = RADII.lifeW
    c.lineCap = 'butt'
    c.beginPath()
    c.arc(CENTER, CENTER, RADII.life, fullStartAng, fullEndAng)
    c.stroke()

    // Health
    const halfSpan = (Math.PI / 2) * hpRatio
    const hpStartAng = p.angle - halfSpan
    const hpEndAng = p.angle + halfSpan

    c.globalAlpha = 0.8 + flash * 0.2
    c.strokeStyle = col.pri
    c.lineWidth = RADII.lifeW - 2
    c.beginPath()
    c.arc(CENTER, CENTER, RADII.life, hpStartAng, hpEndAng)
    c.stroke()
    c.globalAlpha = 1
  }

  // Arc lightning between orbs
  for (const arc of sigilStore.arcs) {
    const grad = c.createLinearGradient(arc.a.x, arc.a.y, arc.b.x, arc.b.y)
    grad.addColorStop(0, arc.a.color.mid)
    grad.addColorStop(0.5, '#fff')
    grad.addColorStop(1, arc.b.color.mid)
    c.strokeStyle = grad
    c.lineWidth = 2 * arc.str
    c.globalAlpha = 0.6 * arc.str
    c.beginPath()
    const segs = 5
    for (let i = 0; i <= segs; i++) {
      const t = i / segs
      const x = sigilStore.lerp(arc.a.x, arc.b.x, t)
      const y = sigilStore.lerp(arc.a.y, arc.b.y, t)
      const wave = Math.sin(t * Math.PI * 2 + sigilStore.time * 15) * 6 * arc.str
      const px = -(arc.b.y - arc.a.y)
      const py = arc.b.x - arc.a.x
      const pl = Math.sqrt(px * px + py * py) || 1
      if (i === 0) c.moveTo(x + (px / pl) * wave, y + (py / pl) * wave)
      else c.lineTo(x + (px / pl) * wave, y + (py / pl) * wave)
    }
    c.stroke()
    c.globalAlpha = 1
  }

  // Orbs
  for (const o of sigilStore.orbs) {
    if (o.dead) continue
    const sz = 10
    const col = o.color
    c.globalAlpha = o.life

    // Glow
    const glow = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, sz * 1.5)
    glow.addColorStop(0, col.mid)
    glow.addColorStop(0.5, col.outer)
    glow.addColorStop(1, 'transparent')
    c.fillStyle = glow
    c.beginPath()
    c.arc(o.x, o.y, sz * 1.5, 0, Math.PI * 2)
    c.fill()

    // Core
    const core = c.createRadialGradient(o.x - sz * 0.2, o.y - sz * 0.2, 0, o.x, o.y, sz)
    core.addColorStop(0, '#fff')
    core.addColorStop(0.3, col.core)
    core.addColorStop(0.7, col.mid)
    core.addColorStop(1, col.outer)
    c.fillStyle = core
    c.beginPath()
    c.arc(o.x, o.y, sz, 0, Math.PI * 2)
    c.fill()

    // Highlight
    c.fillStyle = 'rgba(255, 255, 255, 0.9)'
    c.beginPath()
    c.arc(o.x - sz * 0.3, o.y - sz * 0.3, sz * 0.25, 0, Math.PI * 2)
    c.fill()
    c.globalAlpha = 1
  }

  // Spell buttons
  for (let pid = 0; pid < sigilStore.players.length; pid++) {
    const p = sigilStore.players[pid]
    const col = PLAYER_COLORS[pid]
    const btns = sigilStore.getSpellButtons(pid)

    for (const btn of btns) {
      const canCast = p.energy >= btn.spell.cost
      c.globalAlpha = canCast ? 0.9 : 0.3

      // Button background
      c.fillStyle = 'rgba(10, 10, 20, 0.7)'
      c.beginPath()
      c.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2)
      c.fill()

      // Border
      c.strokeStyle = canCast ? col.pri : '#333'
      c.lineWidth = 2
      c.stroke()

      // Sigil
      drawSigil(c, btn.spell.id, btn.x, btn.y, btn.r * 1.6, canCast ? COLORS.energy : '#444')

      // Cost
      c.fillStyle = canCast ? col.sec : '#444'
      c.font = '10px Courier New'
      c.textAlign = 'center'
      c.fillText(String(btn.spell.cost), btn.x, btn.y + btn.r + 12)
      c.globalAlpha = 1
    }
  }

  // Aim line / Ward preview
  if (sigilStore.pointer && sigilStore.pointer.type === 'spell' && sigilStore.pointer.spell) {
    const ptr = sigilStore.pointer
    const col = PLAYER_COLORS[ptr.pid!]
    const dx = ptr.x! - ptr.sx!
    const dy = ptr.y! - ptr.sy!
    const len = Math.sqrt(dx * dx + dy * dy)

    if (len > 15) {
      const aimAng = Math.atan2(dy, dx)

      if (ptr.spell!.id === 'ward') {
        const p = sigilStore.players[ptr.pid!]
        let previewAng = aimAng
        const maxDev = Math.PI * 0.45
        const dev = sigilStore.angDiff(p.angle, previewAng)
        if (Math.abs(dev) > maxDev) {
          previewAng = p.angle + Math.sign(dev) * maxDev
        }

        const endDist = sigilStore.dist(ptr.x!, ptr.y!, CENTER, CENTER)
        const minR = RADII.cast + 15
        const maxR = RADII.life - 20
        const previewR = Math.max(minR, Math.min(maxR, endDist))

        c.save()
        c.translate(CENTER, CENTER)
        c.strokeStyle = col.sec
        c.lineWidth = 8
        c.lineCap = 'round'
        c.globalAlpha = 0.4 + Math.sin(sigilStore.time * 6) * 0.1
        c.setLineDash([6, 6])
        c.beginPath()
        c.arc(0, 0, previewR, previewAng - 0.15, previewAng + 0.15)
        c.stroke()
        c.setLineDash([])
        c.restore()

        c.strokeStyle = col.pri
        c.lineWidth = 1.5
        c.globalAlpha = 0.5
        c.setLineDash([4, 4])
        c.beginPath()
        c.moveTo(ptr.sx!, ptr.sy!)
        const previewX = CENTER + Math.cos(previewAng) * previewR
        const previewY = CENTER + Math.sin(previewAng) * previewR
        c.lineTo(previewX, previewY)
        c.stroke()
        c.setLineDash([])
        c.globalAlpha = 1
      } else {
        c.strokeStyle = col.pri
        c.lineWidth = 2
        c.globalAlpha = 0.6
        c.setLineDash([8, 4])
        c.beginPath()
        c.moveTo(ptr.sx!, ptr.sy!)
        c.lineTo(ptr.x!, ptr.y!)
        c.stroke()
        c.setLineDash([])

        c.fillStyle = col.pri
        c.beginPath()
        c.moveTo(ptr.x!, ptr.y!)
        c.lineTo(ptr.x! - Math.cos(aimAng - 0.35) * 10, ptr.y! - Math.sin(aimAng - 0.35) * 10)
        c.lineTo(ptr.x! - Math.cos(aimAng + 0.35) * 10, ptr.y! - Math.sin(aimAng + 0.35) * 10)
        c.closePath()
        c.fill()
        c.globalAlpha = 1
      }
    }
  }

  // Projectiles
  for (const p of sigilStore.projectiles) {
    const col = PLAYER_COLORS[p.pid]

    // Trail
    if (p.trail.length > 1) {
      c.strokeStyle = col.pri
      c.lineWidth = p.heavy ? 4 : 2
      c.lineCap = 'round'
      c.beginPath()
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i]
        c.globalAlpha = t.life * 0.4
        if (i === 0) c.moveTo(t.x, t.y)
        else c.lineTo(t.x, t.y)
      }
      c.stroke()
    }
    c.globalAlpha = 1

    // Head
    c.save()
    c.translate(p.x, p.y)
    c.rotate(p.ang)
    c.fillStyle = col.pri

    if (p.heavy) {
      c.beginPath()
      c.moveTo(14, 0)
      c.lineTo(0, 6)
      c.lineTo(-6, 0)
      c.lineTo(0, -6)
      c.closePath()
      c.fill()
      c.fillStyle = '#fff'
      c.beginPath()
      c.arc(0, 0, 3, 0, Math.PI * 2)
      c.fill()
    } else {
      c.beginPath()
      c.arc(0, 0, 5, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#fff'
      c.beginPath()
      c.arc(0, 0, 2, 0, Math.PI * 2)
      c.fill()
    }
    c.restore()
  }

  // Beams
  for (const b of sigilStore.beams) {
    const col = PLAYER_COLORS[b.pid]
    c.globalAlpha = b.life * 2
    c.lineCap = 'round'

    if (b.drain) {
      const victimCol = PLAYER_COLORS[b.fromCol]
      const thiefCol = PLAYER_COLORS[b.toCol]
      const mx = (b.sx + b.ex) / 2
      const my = (b.sy + b.ey) / 2

      c.strokeStyle = victimCol.pri
      c.lineWidth = 5
      c.beginPath()
      c.moveTo(b.ex, b.ey)
      c.lineTo(mx, my)
      c.stroke()

      c.strokeStyle = thiefCol.pri
      c.beginPath()
      c.moveTo(mx, my)
      c.lineTo(b.sx, b.sy)
      c.stroke()
    } else {
      c.strokeStyle = col.pri
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(b.sx, b.sy)
      c.lineTo(b.ex, b.ey)
      c.stroke()
    }
    c.globalAlpha = 1
  }

  // Particles
  for (const p of sigilStore.particles) {
    c.globalAlpha = p.life
    c.fillStyle = p.col
    c.beginPath()
    c.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    c.fill()
  }
  c.globalAlpha = 1

  c.restore()
}

// Game loop
const { start, stop } = useGameLoop({
  update: (dt) => {
    if (!sigilStore.running) return

    orbTimer += dt
    if (orbTimer > 1 && sigilStore.orbs.length < 5) {
      orbTimer = 0
      sigilStore.spawnOrb()
    }

    sigilStore.update(dt)

    const winResult = sigilStore.checkWin()
    if (winResult !== null) {
      winner.value = winResult
      showEndOverlay.value = true
      sigilStore.stop()

      // Stop music and play victory/defeat SFX
      if (props.mode === 'full') {
        music.stop()
      }
      sfx.play('victory')
    }
  },
  render: draw
})

// Input handling
function getCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if (!mainCanvasRef.value) return { x: 0, y: 0 }
  const rect = mainCanvasRef.value.getBoundingClientRect()
  const touch = 'touches' in e ? (e.touches[0] || e.changedTouches[0]) : e
  return {
    x: (touch.clientX - rect.left) / rect.width * SIZE,
    y: (touch.clientY - rect.top) / rect.height * SIZE
  }
}

function onStart(x: number, y: number): void {
  if (!sigilStore.running) return
  const pid = sigilStore.getPlayer(x, y)
  if (pid < 0) return

  const orbsBefore = sigilStore.orbs.filter(o => !o.dead).length
  sigilStore.collectOrbs(x, y, pid)
  const orbsAfter = sigilStore.orbs.filter(o => !o.dead).length
  if (orbsAfter < orbsBefore) {
    sfx.play('collect')
  }

  if (sigilStore.inRing(x, y)) {
    sigilStore.pointer = {
      type: 'ring',
      startAng: sigilStore.ring.angle,
      touchAng: sigilStore.ang(x, y)
    }
    return
  }

  const btn = sigilStore.getBtnAt(x, y, pid)
  if (btn && sigilStore.players[pid].energy >= btn.spell.cost) {
    sigilStore.pointer = {
      type: 'spell',
      pid,
      spell: btn.spell,
      sx: btn.x,
      sy: btn.y,
      x,
      y
    }
  }
}

function onMove(x: number, y: number): void {
  if (!sigilStore.pointer) return

  if (sigilStore.pointer.type === 'ring') {
    sigilStore.ring.target = sigilStore.pointer.startAng! + (sigilStore.ang(x, y) - sigilStore.pointer.touchAng!)
  } else if (sigilStore.pointer.type === 'spell') {
    sigilStore.pointer.x = x
    sigilStore.pointer.y = y
  }
}

function onEnd(x: number, y: number): void {
  if (!sigilStore.pointer) return

  if (sigilStore.pointer.type === 'spell') {
    const dx = x - sigilStore.pointer.sx!
    const dy = y - sigilStore.pointer.sy!
    const dragDist = Math.sqrt(dx * dx + dy * dy)
    if (dragDist > 20) {
      sigilStore.cast(
        sigilStore.pointer.pid!,
        sigilStore.pointer.spell!.id as SpellId,
        Math.atan2(dy, dx),
        sigilStore.pointer.sx!,
        sigilStore.pointer.sy!,
        x,
        y
      )
      // Play cast SFX
      sfx.play('cast')
    }
  }
  sigilStore.pointer = null
}

function handleMouseDown(e: MouseEvent): void {
  const coords = getCoords(e)
  onStart(coords.x, coords.y)
}

function handleMouseMove(e: MouseEvent): void {
  const coords = getCoords(e)
  onMove(coords.x, coords.y)
}

function handleMouseUp(e: MouseEvent): void {
  const coords = getCoords(e)
  onEnd(coords.x, coords.y)
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault()
  const coords = getCoords(e)
  onStart(coords.x, coords.y)
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault()
  const coords = getCoords(e)
  onMove(coords.x, coords.y)
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault()
  const coords = getCoords(e.changedTouches[0] as unknown as TouchEvent)
  onEnd(coords.x, coords.y)
}

// Game control
function startGame(): void {
  showStartOverlay.value = false
  sigilStore.reset()
  drawBackground()
  start()

  // Start procedural music in full mode
  if (props.mode === 'full') {
    music.start()
  }
}

function restartGame(): void {
  showEndOverlay.value = false
  winner.value = null
  sigilStore.reset()
  drawBackground()
  start()

  // Start procedural music in full mode
  if (props.mode === 'full') {
    music.start()
  }
}

onMounted(() => {
  globalStore.setCurrentGame(props.mode === 'full' ? 'sigil-full' : 'sigil-lite')
  sigilStore.mode = props.mode

  if (bgCanvasRef.value) {
    bgCtx = bgCanvasRef.value.getContext('2d')
  }
  if (mainCanvasRef.value) {
    ctx = mainCanvasRef.value.getContext('2d')
  }

  sigilStore.generateRunes()
  drawBackground()
})

onUnmounted(() => {
  stop()
  sigilStore.stop()
  music.stop()
  globalStore.setCurrentGame(null)
})
</script>

<template>
  <CircularViewport>
    <div ref="containerRef" class="sigil-game">
      <canvas ref="bgCanvasRef" :width="SIZE" :height="SIZE" class="bg-canvas" />
      <canvas
        ref="mainCanvasRef"
        :width="SIZE"
        :height="SIZE"
        class="main-canvas"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      />

      <!-- Energy HUDs -->
      <EnergyPips
        v-if="sigilStore.running"
        :current="sigilStore.player1.energy"
        :max="sigilStore.player1.maxEnergy"
        :color="PLAYER_COLORS[0].pri"
        :label="PLAYER_COLORS[0].name"
        position="top"
      />
      <EnergyPips
        v-if="sigilStore.running"
        :current="sigilStore.player2.energy"
        :max="sigilStore.player2.maxEnergy"
        :color="PLAYER_COLORS[1].pri"
        :label="PLAYER_COLORS[1].name"
        position="bottom"
      />

      <!-- HP displays -->
      <div v-if="sigilStore.running" class="hp-display top">{{ Math.max(0, sigilStore.player1.hp) }}</div>
      <div v-if="sigilStore.running" class="hp-display bottom">{{ Math.max(0, sigilStore.player2.hp) }}</div>

      <!-- Overlays -->
      <SigilOverlay v-if="showStartOverlay" type="start" @start="startGame" />
      <SigilOverlay v-if="showEndOverlay" type="end" :winner="winner" @restart="restartGame" />
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.sigil-game {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.bg-canvas,
.main-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hp-display {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: min(2vw, 14px);
  letter-spacing: 0.1em;
  z-index: 50;
}

.hp-display.top {
  top: 17%;
  color: #e85a3c;
}

.hp-display.bottom {
  bottom: 17%;
  color: #3c8ee8;
}
</style>
