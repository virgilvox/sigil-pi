import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Player, Projectile, Beam, Orb, Particle, Ring, Arc, Rune,
  PointerState, Barrier, SpellId, Spell
} from '@/types'
import { SPELLS, ORB_COLORS, PLAYER_COLORS, RADII, SIZE, CENTER } from '@/data/spells'

export const useSigilStore = defineStore('sigil', () => {
  // Game state
  const running = ref(false)
  const time = ref(0)
  const mode = ref<'lite' | 'full'>('lite')

  // Players
  const players = ref<Player[]>([
    { id: 0, hp: 100, energy: 2, maxEnergy: 5, angle: Math.PI * 1.5, barriers: [], flash: 0 },
    { id: 1, hp: 100, energy: 2, maxEnergy: 5, angle: Math.PI * 0.5, barriers: [], flash: 0 }
  ])

  // Ring
  const ring = ref<Ring>({
    angle: 0,
    target: 0,
    walls: [
      { s: -0.3, e: 0.3 },
      { s: Math.PI - 0.3, e: Math.PI + 0.3 }
    ]
  })

  // Game objects
  const orbs = ref<Orb[]>([])
  const projectiles = ref<Projectile[]>([])
  const beams = ref<Beam[]>([])
  const particles = ref<Particle[]>([])
  const arcs = ref<Arc[]>([])
  const runes = ref<Rune[]>([])

  // Input state
  const pointer = ref<PointerState | null>(null)

  // Computed
  const player1 = computed(() => players.value[0])
  const player2 = computed(() => players.value[1])

  // Utility functions
  function dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }

  function ang(x: number, y: number): number {
    return Math.atan2(y - CENTER, x - CENTER)
  }

  function normAng(a: number): number {
    let angle = a
    while (angle < 0) angle += Math.PI * 2
    while (angle >= Math.PI * 2) angle -= Math.PI * 2
    return angle
  }

  function angDiff(a1: number, a2: number): number {
    let d = normAng(a2 - a1)
    if (d > Math.PI) d -= Math.PI * 2
    return d
  }

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  function inZone(x: number, y: number, pid: number): boolean {
    return Math.abs(angDiff(ang(x, y), players.value[pid].angle)) < Math.PI / 2
  }

  function getPlayer(x: number, y: number): number {
    const d = dist(x, y, CENTER, CENTER)
    if (d < RADII.inner || d > RADII.outer) return -1
    return inZone(x, y, 0) ? 0 : 1
  }

  function getSpellButtons(pid: number) {
    const p = players.value[pid]
    const btns = []
    for (let i = 0; i < SPELLS.length; i++) {
      const spell = SPELLS[i]
      const offset = (i - 1.5) * 0.35
      const a = p.angle + offset
      btns.push({
        x: CENTER + Math.cos(a) * RADII.spell,
        y: CENTER + Math.sin(a) * RADII.spell,
        a,
        spell,
        r: 26
      })
    }
    return btns
  }

  function getBtnAt(x: number, y: number, pid: number) {
    const btns = getSpellButtons(pid)
    for (const btn of btns) {
      if (dist(x, y, btn.x, btn.y) < btn.r + 10) return btn
    }
    return null
  }

  function inRing(x: number, y: number): boolean {
    const d = dist(x, y, CENTER, CENTER)
    return d > RADII.ring - RADII.ringW && d < RADII.ring + RADII.ringW
  }

  // Actions
  function generateBarriers(pid: number): void {
    const p = players.value[pid]
    p.barriers = []
    const numBarriers = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < numBarriers; i++) {
      const angOffset = (Math.random() - 0.5) * Math.PI * 0.7
      const radius = RADII.cast + 30 + Math.random() * (RADII.life - RADII.cast - 60)
      p.barriers.push({
        ang: p.angle + angOffset,
        radius,
        size: 0.12 + Math.random() * 0.08,
        hp: 2,
        maxHp: 2,
        flash: 0,
        seed: Math.random()
      })
    }
  }

  function generateRunes(): void {
    runes.value = []
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2
      const r = RADII.inner + 20 + Math.random() * (RADII.outer - RADII.inner - 40)
      runes.value.push({
        x: CENTER + Math.cos(a) * r,
        y: CENTER + Math.sin(a) * r,
        seed: Math.random(),
        size: 10 + Math.random() * 14,
        alpha: 0.03 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2
      })
    }
  }

  function spawnOrb(): void {
    const a = Math.random() * Math.PI * 2
    const color = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)]
    orbs.value.push({
      x: CENTER + Math.cos(a) * RADII.eye,
      y: CENTER + Math.sin(a) * RADII.eye,
      a,
      r: RADII.eye,
      va: (Math.random() - 0.5) * 0.3,
      vr: 15 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      life: 1,
      dead: false,
      color
    })
  }

  function addParticle(x: number, y: number, vx: number, vy: number, life: number, col: string, size: number): void {
    particles.value.push({ x, y, vx, vy, life, col, size })
  }

  function cast(pid: number, spellId: SpellId, aimAng: number, sx: number, sy: number, endX: number, endY: number): boolean {
    const p = players.value[pid]
    const spell = SPELLS.find(s => s.id === spellId)
    if (!spell || p.energy < spell.cost) return false

    p.energy -= spell.cost
    const col = PLAYER_COLORS[pid]

    // Cast particles
    for (let i = 0; i < 10; i++) {
      const a = aimAng + (Math.random() - 0.5) * 0.6
      const v = 2 + Math.random() * 4
      addParticle(sx, sy, Math.cos(a) * v, Math.sin(a) * v, 0.4, col.pri, 2 + Math.random())
    }

    switch (spell.type) {
      case 'projectile':
        projectiles.value.push({
          x: sx,
          y: sy,
          ang: aimAng,
          speed: spell.speed!,
          dmg: spell.damage!,
          pid,
          heavy: spellId === 'lance',
          trail: [],
          life: 1
        })
        break

      case 'ward': {
        let wardAng = aimAng
        const maxDeviation = Math.PI * 0.45
        const deviation = angDiff(p.angle, wardAng)
        if (Math.abs(deviation) > maxDeviation) {
          wardAng = p.angle + Math.sign(deviation) * maxDeviation
        }

        const minR = RADII.cast + 15
        const maxR = RADII.life - 20
        const endDist = dist(endX, endY, CENTER, CENTER)
        const wardRadius = Math.max(minR, Math.min(maxR, endDist))

        p.barriers.push({
          ang: wardAng,
          radius: wardRadius,
          size: 0.16 + Math.random() * 0.06,
          hp: 2,
          maxHp: 2,
          flash: 1,
          seed: Math.random()
        })

        // Ward creation particles
        const wx = CENTER + Math.cos(wardAng) * wardRadius
        const wy = CENTER + Math.sin(wardAng) * wardRadius
        for (let i = 0; i < 12; i++) {
          const pa = wardAng + (Math.random() - 0.5) * 0.4
          const pr = wardRadius + (Math.random() - 0.5) * 20
          const px = CENTER + Math.cos(pa) * pr
          const py = CENTER + Math.sin(pa) * pr
          addParticle(px, py, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.5, col.sec, 3)
        }
        break
      }

      case 'beam': {
        const length = RADII.outer
        let hitX = sx + Math.cos(aimAng) * length
        let hitY = sy + Math.sin(aimAng) * length
        let hitTarget = false
        let drainTarget: number | null = null

        // Check for hits
        for (let d = 0; d < length; d += 5) {
          const bx = sx + Math.cos(aimAng) * d
          const by = sy + Math.sin(aimAng) * d
          const bd = dist(bx, by, CENTER, CENTER)

          if (bd > RADII.cast && bd < RADII.life + 20 && inZone(bx, by, 1 - pid)) {
            const opp = players.value[1 - pid]

            // Check barriers
            for (const bar of opp.barriers) {
              if (bar.hp <= 0) continue
              const barDist = Math.abs(bd - bar.radius)
              const barAngDiff = Math.abs(angDiff(ang(bx, by), bar.ang))
              if (barDist < 15 && barAngDiff < bar.size + 0.05) {
                hitX = bx
                hitY = by
                bar.hp -= 1
                bar.flash = 1
                hitTarget = true
                // Hit particles
                for (let j = 0; j < 8; j++) {
                  const a = Math.random() * Math.PI * 2
                  addParticle(bx, by, Math.cos(a) * 4, Math.sin(a) * 4, 0.4, '#d4d0c4', 2)
                }
                break
              }
            }
            if (hitTarget) break

            // Check life ring
            if (bd > RADII.life - RADII.lifeW && bd < RADII.life + RADII.lifeW) {
              hitX = bx
              hitY = by
              opp.hp -= spell.steal!
              opp.flash = 1
              p.energy = Math.min(p.maxEnergy, p.energy + spell.steal!)
              drainTarget = 1 - pid
              hitTarget = true

              // Drain particles
              for (let j = 0; j < 12; j++) {
                const a = Math.random() * Math.PI * 2
                addParticle(bx, by, Math.cos(a) * 3, Math.sin(a) * 3, 0.4, '#d4d0c4', 3)
              }
              break
            }
          }
        }

        beams.value.push({
          sx,
          sy,
          ex: hitX,
          ey: hitY,
          pid,
          life: 0.5,
          col: col.pri,
          drain: drainTarget !== null,
          fromCol: drainTarget !== null ? 1 - pid : pid,
          toCol: pid
        })
        break
      }
    }

    return true
  }

  function collectOrbs(x: number, y: number, pid: number): void {
    const p = players.value[pid]
    const col = PLAYER_COLORS[pid]
    const toCollect: Orb[] = []
    const checked = new Set<Orb>()

    function chain(orb: Orb): void {
      if (checked.has(orb) || orb.dead) return
      if (!inZone(orb.x, orb.y, pid)) return
      checked.add(orb)

      const d = dist(x, y, orb.x, orb.y)
      if (d > 50) return

      toCollect.push(orb)
      for (const other of orbs.value) {
        if (!checked.has(other) && !other.dead && dist(orb.x, orb.y, other.x, other.y) < 80) {
          chain(other)
        }
      }
    }

    for (const o of orbs.value) {
      if (!o.dead && inZone(o.x, o.y, pid) && dist(x, y, o.x, o.y) < 40) {
        chain(o)
      }
    }

    toCollect.forEach((o, i) => {
      setTimeout(() => {
        if (o.dead) return
        o.dead = true
        p.energy = Math.min(p.maxEnergy, p.energy + 1)
        for (let j = 0; j < 6; j++) {
          const a = Math.random() * Math.PI * 2
          addParticle(o.x, o.y, Math.cos(a) * 3, Math.sin(a) * 3, 0.3, o.color.mid, 2)
        }
      }, i * 60)
    })
  }

  function update(dt: number): void {
    if (!running.value) return

    time.value += dt

    // Ring rotation
    ring.value.angle += angDiff(ring.value.angle, ring.value.target) * 0.1

    // Players
    for (const p of players.value) {
      if (p.flash > 0) p.flash -= dt * 3
      for (const b of p.barriers) {
        if (b.flash > 0) b.flash -= dt * 3
      }
      p.barriers = p.barriers.filter(b => b.hp > 0)
    }

    // Orbs
    for (const o of orbs.value) {
      if (o.dead) continue
      o.a += o.va * dt
      o.r += o.vr * dt
      o.x = CENTER + Math.cos(o.a) * o.r
      o.y = CENTER + Math.sin(o.a) * o.r
      if (o.r > RADII.cast) o.life -= dt * 1.5
    }
    orbs.value = orbs.value.filter(o => !o.dead && o.life > 0)

    // Orb connections
    arcs.value = []
    for (let i = 0; i < orbs.value.length; i++) {
      for (let j = i + 1; j < orbs.value.length; j++) {
        const a = orbs.value[i]
        const b = orbs.value[j]
        const d = dist(a.x, a.y, b.x, b.y)
        if (d < 80) arcs.value.push({ a, b, str: 1 - d / 80 })
      }
    }

    // Projectiles
    for (const p of projectiles.value) {
      if (p.life <= 0) continue

      // Add trail point
      p.trail.push({ x: p.x, y: p.y, life: 1 })
      if (p.trail.length > 8) p.trail.shift()
      for (const t of p.trail) t.life -= dt * 4

      p.x += Math.cos(p.ang) * p.speed
      p.y += Math.sin(p.ang) * p.speed

      const d = dist(p.x, p.y, CENTER, CENTER)
      const pa = ang(p.x, p.y)

      // Ring collision
      if (d > RADII.ring - RADII.ringW / 2 && d < RADII.ring + RADII.ringW / 2) {
        const ra = normAng(pa - ring.value.angle)
        for (const w of ring.value.walls) {
          const ws = normAng(w.s)
          const we = normAng(w.e)
          if ((ws < we && ra >= ws && ra <= we) || (ws >= we && (ra >= ws || ra <= we))) {
            p.life = 0
            // Ring hit particles
            for (let i = 0; i < 8; i++) {
              const a = Math.random() * Math.PI * 2
              addParticle(p.x, p.y, Math.cos(a) * 3, Math.sin(a) * 3, 0.3, '#d4d0c4', 2)
            }
            break
          }
        }
      }

      // Barrier collision
      if (p.life > 0) {
        for (let idx = 0; idx < players.value.length; idx++) {
          const pl = players.value[idx]
          for (const bar of pl.barriers) {
            if (bar.hp <= 0) continue
            const barDist = Math.abs(d - bar.radius)
            const barAngDiff = Math.abs(angDiff(pa, bar.ang))
            if (barDist < 18 && barAngDiff < bar.size + 0.05) {
              bar.hp -= p.heavy ? 2 : 1
              bar.flash = 1
              p.life = 0
              // Barrier hit particles
              const col = PLAYER_COLORS[idx]
              for (let i = 0; i < 10; i++) {
                const a = Math.random() * Math.PI * 2
                addParticle(p.x, p.y, Math.cos(a) * 4, Math.sin(a) * 4, 0.4, col.pri, 2)
              }
            }
          }
        }
      }

      // Life ring hit
      if (p.life > 0 && d > RADII.life - RADII.lifeW && d < RADII.life + RADII.lifeW) {
        const hitPid = inZone(p.x, p.y, 0) ? 0 : 1
        if (hitPid !== p.pid) {
          players.value[hitPid].hp -= p.dmg
          players.value[hitPid].flash = 1
          p.life = 0
          // Life ring hit particles
          const col = PLAYER_COLORS[hitPid]
          for (let i = 0; i < 15; i++) {
            const a = Math.random() * Math.PI * 2
            addParticle(p.x, p.y, Math.cos(a) * 5, Math.sin(a) * 5, 0.5, col.pri, 3)
          }
        }
      }

      // Out of bounds
      if (d > RADII.outer) p.life = 0
    }
    projectiles.value = projectiles.value.filter(p => p.life > 0)

    // Beams
    for (const b of beams.value) b.life -= dt * 2
    beams.value = beams.value.filter(b => b.life > 0)

    // Particles
    for (const p of particles.value) {
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.95
      p.vy *= 0.95
      p.life -= dt * 2
    }
    particles.value = particles.value.filter(p => p.life > 0)
    if (particles.value.length > 50) particles.value = particles.value.slice(-50)
  }

  function checkWin(): number | null {
    for (let i = 0; i < players.value.length; i++) {
      if (players.value[i].hp <= 0) {
        return 1 - i // Return winner
      }
    }
    return null
  }

  function reset(): void {
    running.value = true
    time.value = 0
    players.value = [
      { id: 0, hp: 100, energy: 2, maxEnergy: 5, angle: Math.PI * 1.5, barriers: [], flash: 0 },
      { id: 1, hp: 100, energy: 2, maxEnergy: 5, angle: Math.PI * 0.5, barriers: [], flash: 0 }
    ]
    ring.value = {
      angle: 0,
      target: 0,
      walls: [
        { s: -0.3, e: 0.3 },
        { s: Math.PI - 0.3, e: Math.PI + 0.3 }
      ]
    }
    orbs.value = []
    projectiles.value = []
    beams.value = []
    particles.value = []
    arcs.value = []
    pointer.value = null
    generateBarriers(0)
    generateBarriers(1)
    generateRunes()
  }

  function stop(): void {
    running.value = false
  }

  return {
    // State
    running,
    time,
    mode,
    players,
    ring,
    orbs,
    projectiles,
    beams,
    particles,
    arcs,
    runes,
    pointer,
    // Computed
    player1,
    player2,
    // Utilities
    dist,
    ang,
    normAng,
    angDiff,
    lerp,
    inZone,
    getPlayer,
    getSpellButtons,
    getBtnAt,
    inRing,
    // Actions
    generateBarriers,
    generateRunes,
    spawnOrb,
    addParticle,
    cast,
    collectOrbs,
    update,
    checkWin,
    reset,
    stop
  }
})
