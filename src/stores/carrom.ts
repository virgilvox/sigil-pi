import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type GameState = 'menu' | 'rules' | 'teams' | 'play'
export type GamePhase = 0 | 1 | 2 // 0=position, 1=aim, 2=physics

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  type: 0 | 1 | 2 // 0=queen, 1=white, 2=black
  sunk: boolean
}

interface Striker {
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
}

interface Rules {
  colorAssign: number
  queenRule: number
  queenPoints: number
  foulPenalty: number
  opponentPocket: number
  continuation: number
  winCondition: number
  backwards: number
}

const W = 720
const H = 720
const CX = 360
const CY = 360
// Board fills the round viewport: the playing surface / physics wall push out to
// ~322 (of the ~360 inscribed circle), pockets sit at the diagonal corners
// against the wall, and the striker baselines move out to each player's edge.
const BOARD_R = 322
const WALL_INNER = 322
const POCKET_R = 26
const PIECE_R = 15
const STRIKER_R = 20
const PI2 = Math.PI * 2
const FRICTION = 0.988
const WALL_FRICTION = 0.78
const RESTITUTION = 0.92
const MIN_VEL_SQ = 0.01
const MAX_POWER = 22
const SUBSTEPS = 4
const DT = 1 / SUBSTEPS
const ZONE_WIDTH = 200

// Corner pockets, out at the diagonal wall (center distance ≈ 300).
const POCKETS = [
  { x: CX - 212, y: CY - 212 },
  { x: CX + 212, y: CY - 212 },
  { x: CX - 212, y: CY + 212 },
  { x: CX + 212, y: CY + 212 }
]
const POCKET_R_SQ = (POCKET_R + 4) * (POCKET_R + 4)

// Striker baselines: one per edge (0=bottom, 1=right, 2=top, 3=left), out near
// the wall. Players are mapped to zones so 2-player sit ACROSS (0 & 2).
const ZONE_DIST = 210
const ZONES = [
  { x: CX, y: CY + ZONE_DIST, horizontal: true },
  { x: CX + ZONE_DIST, y: CY, horizontal: false },
  { x: CX, y: CY - ZONE_DIST, horizontal: true },
  { x: CX - ZONE_DIST, y: CY, horizontal: false }
]

const RULE_OPTIONS = {
  colorAssign: ['First Pocket', 'Team 1 = White', 'Team 1 = Black'],
  queenRule: ['Cover Required', 'Anytime', 'After 1st Piece', 'Before Last'],
  queenPoints: ['3 Points', '5 Points'],
  foulPenalty: ['Lose 1 Point', 'Return a Piece'],
  opponentPocket: ['No Penalty', 'Foul + Penalty'],
  continuation: ['Continue on Pocket', 'Single Shot'],
  winCondition: ['Clear All Pieces', 'First to 25', 'First to 50'],
  backwards: ['Allowed', 'Not Allowed']
}

const RULE_LABELS = {
  colorAssign: 'Color Assignment',
  queenRule: 'Queen Rules',
  queenPoints: 'Queen Value',
  foulPenalty: 'Foul Penalty',
  opponentPocket: 'Opponent Piece',
  continuation: 'Turn Continue',
  winCondition: 'Win Condition',
  backwards: 'Backward Shots'
}

const TEAM_COLORS = ['#ff6b6b', '#4ecdc4']
const TEAM_NAMES = ['RED', 'CYAN']

// Audio
let audioCtx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null
let audioEnabled = false

function initAudio(): void {
  if (audioCtx) return
  try {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const sz = audioCtx.sampleRate * 0.5
    noiseBuffer = audioCtx.createBuffer(1, sz, audioCtx.sampleRate)
    const d = noiseBuffer.getChannelData(0)
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1
    audioEnabled = true
  } catch (e) {
    audioEnabled = false
  }
}

function playClick(): void {
  if (!audioEnabled || !audioCtx) return
  const t = audioCtx.currentTime
  const o = audioCtx.createOscillator()
  o.type = 'sine'
  o.frequency.value = 800
  const g = audioCtx.createGain()
  g.gain.setValueAtTime(0.1, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  o.connect(g)
  g.connect(audioCtx.destination)
  o.start(t)
  o.stop(t + 0.06)
}

function playHit(intensity: number): void {
  if (!audioEnabled || !audioCtx || !noiseBuffer) return
  const t = audioCtx.currentTime
  const vol = Math.min(0.55, 0.12 + intensity * 0.1)

  const n = audioCtx.createBufferSource()
  n.buffer = noiseBuffer
  const nf = audioCtx.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.value = 2800 + Math.random() * 1200
  nf.Q.value = 1.5
  const ng = audioCtx.createGain()
  ng.gain.setValueAtTime(vol * 0.6, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
  n.connect(nf)
  nf.connect(ng)
  ng.connect(audioCtx.destination)
  n.start(t)
  n.stop(t + 0.025)

  const b = audioCtx.createOscillator()
  b.type = 'sine'
  b.frequency.setValueAtTime(1100 + Math.random() * 200, t)
  b.frequency.exponentialRampToValueAtTime(350, t + 0.05)
  const bf = audioCtx.createBiquadFilter()
  bf.type = 'bandpass'
  bf.frequency.value = 700
  bf.Q.value = 2.5
  const bg = audioCtx.createGain()
  bg.gain.setValueAtTime(vol * 0.35, t)
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
  b.connect(bf)
  bf.connect(bg)
  bg.connect(audioCtx.destination)
  b.start(t)
  b.stop(t + 0.08)
}

function playWall(intensity: number): void {
  if (!audioEnabled || !audioCtx) return
  const t = audioCtx.currentTime
  const vol = Math.min(0.45, 0.08 + intensity * 0.07)
  const o = audioCtx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(160 + Math.random() * 30, t)
  o.frequency.exponentialRampToValueAtTime(55, t + 0.1)
  const og = audioCtx.createGain()
  og.gain.setValueAtTime(vol * 0.7, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  o.connect(og)
  og.connect(audioCtx.destination)
  o.start(t)
  o.stop(t + 0.13)
}

function playPocket(): void {
  if (!audioEnabled || !audioCtx) return
  const t = audioCtx.currentTime
  const d = audioCtx.createOscillator()
  d.type = 'sine'
  d.frequency.setValueAtTime(180, t)
  d.frequency.exponentialRampToValueAtTime(45, t + 0.12)
  const dg = audioCtx.createGain()
  dg.gain.setValueAtTime(0.4, t)
  dg.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
  d.connect(dg)
  dg.connect(audioCtx.destination)
  d.start(t)
  d.stop(t + 0.16)
}

function playShoot(power: number): void {
  if (!audioEnabled || !audioCtx || !noiseBuffer) return
  const t = audioCtx.currentTime
  const vol = 0.15 + power * 0.25
  const s = audioCtx.createBufferSource()
  s.buffer = noiseBuffer
  const sf = audioCtx.createBiquadFilter()
  sf.type = 'bandpass'
  sf.frequency.setValueAtTime(1800, t)
  sf.frequency.exponentialRampToValueAtTime(3500, t + 0.025)
  sf.Q.value = 0.8
  const sg = audioCtx.createGain()
  sg.gain.setValueAtTime(vol * 0.25, t)
  sg.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
  s.connect(sf)
  sf.connect(sg)
  sg.connect(audioCtx.destination)
  s.start(t)
  s.stop(t + 0.05)
}

function playFoul(): void {
  if (!audioEnabled || !audioCtx) return
  const t = audioCtx.currentTime
  const o1 = audioCtx.createOscillator()
  const o2 = audioCtx.createOscillator()
  o1.type = o2.type = 'sine'
  o1.frequency.value = 175
  o2.frequency.value = 180
  const g = audioCtx.createGain()
  g.gain.setValueAtTime(0.18, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
  o1.connect(g)
  o2.connect(g)
  g.connect(audioCtx.destination)
  o1.start(t)
  o2.start(t)
  o1.stop(t + 0.37)
  o2.stop(t + 0.37)
}

function playWin(): void {
  if (!audioEnabled || !audioCtx) return
  const t = audioCtx.currentTime
  const notes = [261.6, 329.6, 392, 523.2]
  notes.forEach((f, i) => {
    const o = audioCtx!.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = audioCtx!.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.12, t + i * 0.09 + 0.015)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.5)
    o.connect(g)
    g.connect(audioCtx!.destination)
    o.start(t + i * 0.09)
    o.stop(t + i * 0.09 + 0.55)
  })
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  return dx * dx + dy * dy
}

export const useCarromStore = defineStore('carrom', () => {
  // State
  const gameState = ref<GameState>('menu')
  const playerCount = ref(2)
  const selectedRule = ref(0)
  const rules = ref<Rules>({
    colorAssign: 0,
    queenRule: 0,
    queenPoints: 0,
    foulPenalty: 0,
    opponentPocket: 0,
    continuation: 0,
    winCondition: 0,
    backwards: 0
  })
  const teamAssign = ref([0, 1, 0, 1])

  const pieces = ref<Piece[]>([])
  const striker = ref<Striker>({
    x: CX,
    y: CY + 150,
    vx: 0,
    vy: 0,
    active: true
  })
  const currentPlayer = ref(0)
  const teamScores = ref([0, 0])
  const teamColors = ref([0, 0])
  const phase = ref<GamePhase>(0)
  const sliderPos = ref(0.5)
  const dragMode = ref(0) // 0=none, 1=slider, 2=aim

  // Aim state
  const aimStartX = ref(0)
  const aimStartY = ref(0)
  const aimCurX = ref(0)
  const aimCurY = ref(0)

  // Game state
  const message = ref('')
  const msgTimer = ref(0)
  const queenClaimed = ref(false)
  const needCover = ref(false)
  const gameOver = ref(false)
  const hasPocketedOwn = ref([false, false])

  // Turn tracking
  const turnPocketedWhite = ref(0)
  const turnPocketedBlack = ref(0)
  const turnPocketedQueen = ref(false)
  const turnPocketedStriker = ref(false)

  // Computed
  const is4Player = computed(() => playerCount.value === 4)
  const queenValue = computed(() => rules.value.queenPoints === 0 ? 3 : 5)
  const winTarget = computed(() => {
    if (rules.value.winCondition === 0) return 0
    return rules.value.winCondition === 1 ? 25 : 50
  })
  const ruleKeys = computed(() => Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[])

  // Player → edge/zone. 4-player uses all four edges (0..3); 2-player uses only
  // BOTTOM (0) and TOP (2) so the two players face each other ACROSS the board.
  function playerZone(p: number): number {
    return is4Player.value ? p : (p === 0 ? 0 : 2)
  }
  const strikerZone = computed(() => playerZone(currentPlayer.value))

  // Actions
  function getPlayerTeam(p: number): number {
    return is4Player.value ? teamAssign.value[p] : p
  }

  function countPieces(color: number): number {
    return pieces.value.filter(p => p.type === color && !p.sunk).length
  }

  function getStrikerPosition(): { x: number; y: number } {
    const zone = ZONES[strikerZone.value]
    if (zone.horizontal) {
      return { x: CX - ZONE_WIDTH / 2 + sliderPos.value * ZONE_WIDTH, y: zone.y }
    }
    return { x: zone.x, y: CY - ZONE_WIDTH / 2 + sliderPos.value * ZONE_WIDTH }
  }

  function getShootDirection(): { x: number; y: number } {
    const dirs = [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }]
    return dirs[strikerZone.value]
  }

  function resetStriker(): void {
    sliderPos.value = 0.5
    const pos = getStrikerPosition()
    striker.value.x = pos.x
    striker.value.y = pos.y
    striker.value.vx = 0
    striker.value.vy = 0
    striker.value.active = true
    phase.value = 0
  }

  function resetTurnTracking(): void {
    turnPocketedWhite.value = 0
    turnPocketedBlack.value = 0
    turnPocketedQueen.value = false
    turnPocketedStriker.value = false
  }

  function initGame(): void {
    pieces.value = []
    teamScores.value = [0, 0]
    currentPlayer.value = 0
    phase.value = 0
    sliderPos.value = 0.5
    queenClaimed.value = false
    needCover.value = false
    gameOver.value = false
    hasPocketedOwn.value = [false, false]

    if (rules.value.colorAssign === 1) {
      teamColors.value = [1, 2]
    } else if (rules.value.colorAssign === 2) {
      teamColors.value = [2, 1]
    } else {
      teamColors.value = [0, 0]
    }

    // Queen in center
    pieces.value.push({ x: CX, y: CY, vx: 0, vy: 0, type: 0, sunk: false })

    // Inner ring (6 pieces)
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6
      pieces.value.push({
        x: CX + Math.cos(a) * 32,
        y: CY + Math.sin(a) * 32,
        vx: 0,
        vy: 0,
        type: i % 2 === 0 ? 1 : 2,
        sunk: false
      })
    }

    // Outer ring (12 pieces)
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6
      pieces.value.push({
        x: CX + Math.cos(a) * 64,
        y: CY + Math.sin(a) * 64,
        vx: 0,
        vy: 0,
        type: i % 2 === 0 ? 1 : 2,
        sunk: false
      })
    }

    resetStriker()
    message.value = `P${currentPlayer.value + 1} START`
    msgTimer.value = 100
    gameState.value = 'play'
  }

  function collide(a: { x: number; y: number; vx: number; vy: number }, ra: number, b: { x: number; y: number; vx: number; vy: number }, rb: number): void {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dSq = dx * dx + dy * dy
    const minD = ra + rb
    const minDSq = minD * minD

    if (dSq < minDSq && dSq > 0.0001) {
      const d = Math.sqrt(dSq)
      const nx = dx / d
      const ny = dy / d
      const overlap = minD - d
      const mA = ra * ra
      const mB = rb * rb
      const tot = mA + mB
      const rA = mB / tot
      const rB = mA / tot

      a.x -= nx * overlap * rA
      a.y -= ny * overlap * rA
      b.x += nx * overlap * rB
      b.y += ny * overlap * rB

      const dvx = a.vx - b.vx
      const dvy = a.vy - b.vy
      const dvn = dvx * nx + dvy * ny

      if (dvn > 0) {
        playHit(dvn)
        const imp = dvn * RESTITUTION
        a.vx -= imp * nx * rA * 2
        a.vy -= imp * ny * rA * 2
        b.vx += imp * nx * rB * 2
        b.vy += imp * ny * rB * 2
      }
    }
  }

  function wallBounce(obj: { x: number; y: number; vx: number; vy: number }, r: number): void {
    const dx = obj.x - CX
    const dy = obj.y - CY
    const dSq = dx * dx + dy * dy
    const limit = WALL_INNER - r
    const limitSq = limit * limit

    if (dSq > limitSq) {
      const d = Math.sqrt(dSq)
      const nx = dx / d
      const ny = dy / d
      obj.x = CX + nx * limit
      obj.y = CY + ny * limit

      const vn = obj.vx * nx + obj.vy * ny
      if (vn > 0) {
        playWall(vn)
        obj.vx -= 2 * vn * nx
        obj.vy -= 2 * vn * ny
        obj.vx *= WALL_FRICTION
        obj.vy *= WALL_FRICTION
      }
    }
  }

  function physics(): void {
    if (phase.value !== 2) return

    for (let step = 0; step < SUBSTEPS; step++) {
      // Move striker
      if (striker.value.active) {
        striker.value.x += striker.value.vx * DT
        striker.value.y += striker.value.vy * DT
      }

      // Move pieces
      pieces.value.forEach(p => {
        if (!p.sunk) {
          p.x += p.vx * DT
          p.y += p.vy * DT
        }
      })

      // Striker-piece collisions
      if (striker.value.active) {
        pieces.value.forEach(p => {
          if (!p.sunk) {
            collide(striker.value, STRIKER_R, p, PIECE_R)
          }
        })
      }

      // Piece-piece collisions
      for (let i = 0; i < pieces.value.length; i++) {
        if (pieces.value[i].sunk) continue
        for (let j = i + 1; j < pieces.value.length; j++) {
          if (!pieces.value[j].sunk) {
            collide(pieces.value[i], PIECE_R, pieces.value[j], PIECE_R)
          }
        }
      }

      // Wall bounces
      if (striker.value.active) wallBounce(striker.value, STRIKER_R)
      pieces.value.forEach(p => {
        if (!p.sunk) wallBounce(p, PIECE_R)
      })

      // Pocket checks
      if (striker.value.active) {
        for (let i = 0; i < 4; i++) {
          if (distSq(striker.value.x, striker.value.y, POCKETS[i].x, POCKETS[i].y) < POCKET_R_SQ) {
            striker.value.active = false
            turnPocketedStriker.value = true
            playPocket()
            break
          }
        }
      }

      pieces.value.forEach(p => {
        if (p.sunk) return
        for (let j = 0; j < 4; j++) {
          if (distSq(p.x, p.y, POCKETS[j].x, POCKETS[j].y) < POCKET_R_SQ) {
            p.sunk = true
            p.vx = 0
            p.vy = 0
            if (p.type === 0) turnPocketedQueen.value = true
            else if (p.type === 1) turnPocketedWhite.value++
            else if (p.type === 2) turnPocketedBlack.value++
            playPocket()
            break
          }
        }
      })
    }

    // Apply friction
    if (striker.value.active) {
      striker.value.vx *= FRICTION
      striker.value.vy *= FRICTION
    }
    pieces.value.forEach(p => {
      if (!p.sunk) {
        p.vx *= FRICTION
        p.vy *= FRICTION
      }
    })

    // Check if motion stopped
    let moving = false
    if (striker.value.active) {
      if (striker.value.vx * striker.value.vx + striker.value.vy * striker.value.vy > MIN_VEL_SQ) {
        moving = true
      } else {
        striker.value.vx = 0
        striker.value.vy = 0
      }
    }

    pieces.value.forEach(p => {
      if (!p.sunk) {
        if (p.vx * p.vx + p.vy * p.vy > MIN_VEL_SQ) {
          moving = true
        } else {
          p.vx = 0
          p.vy = 0
        }
      }
    })

    if (!moving) {
      endTurn()
    }
  }

  function returnPieceToBoard(color: number): boolean {
    const piece = pieces.value.find(p => p.type === color && p.sunk)
    if (piece) {
      piece.sunk = false
      const angle = Math.random() * PI2
      piece.x = CX + Math.cos(angle) * 35
      piece.y = CY + Math.sin(angle) * 35
      piece.vx = 0
      piece.vy = 0
      return true
    }
    return false
  }

  function returnQueen(): void {
    const queen = pieces.value.find(p => p.type === 0)
    if (queen) {
      queen.sunk = false
      queen.x = CX
      queen.y = CY
      queen.vx = 0
      queen.vy = 0
    }
  }

  function applyFoulPenalty(team: number): string {
    if (rules.value.foulPenalty === 0) {
      teamScores.value[team] = Math.max(0, teamScores.value[team] - 1)
      return 'FOUL -1'
    } else {
      const myColor = teamColors.value[team]
      if (myColor !== 0 && returnPieceToBoard(myColor)) {
        return 'FOUL - PIECE BACK'
      }
      return 'FOUL'
    }
  }

  function endTurn(): void {
    const myTeam = getPlayerTeam(currentPlayer.value)
    const oppTeam = 1 - myTeam
    let foul = false
    let continuePlay = false
    message.value = ''

    // Color assignment on first pocket
    if (rules.value.colorAssign === 0 && teamColors.value[myTeam] === 0) {
      if (turnPocketedWhite.value > 0 || turnPocketedBlack.value > 0) {
        const assignColor = turnPocketedWhite.value >= turnPocketedBlack.value ? 1 : 2
        teamColors.value[myTeam] = assignColor
        teamColors.value[oppTeam] = assignColor === 1 ? 2 : 1
      }
    }

    const myColor = teamColors.value[myTeam]
    const oppColor = teamColors.value[oppTeam]
    const pocketedOwn = myColor === 1 ? turnPocketedWhite.value : (myColor === 2 ? turnPocketedBlack.value : 0)
    const pocketedOpp = oppColor === 1 ? turnPocketedWhite.value : (oppColor === 2 ? turnPocketedBlack.value : 0)

    if (pocketedOwn > 0) hasPocketedOwn.value[myTeam] = true

    // Foul for striker in pocket
    if (turnPocketedStriker.value) {
      foul = true
      message.value = applyFoulPenalty(myTeam)
      playFoul()
    }

    // Foul for opponent pocket (if rule enabled)
    if (!foul && rules.value.opponentPocket === 1 && pocketedOpp > 0) {
      foul = true
      message.value = applyFoulPenalty(myTeam)
      playFoul()
    }

    // Queen handling
    if (turnPocketedQueen.value && !queenClaimed.value) {
      let queenValid = true

      if (rules.value.queenRule === 2) {
        if (!hasPocketedOwn.value[myTeam] && pocketedOwn === 0) queenValid = false
      } else if (rules.value.queenRule === 3) {
        if (myColor !== 0 && countPieces(myColor) === 0) queenValid = false
      }

      if (foul || !queenValid) {
        returnQueen()
        if (!queenValid && !foul) message.value = 'QUEEN RETURNED'
      } else if (rules.value.queenRule === 1) {
        teamScores.value[myTeam] += queenValue.value
        queenClaimed.value = true
        message.value = `QUEEN +${queenValue.value}`
        continuePlay = true
      } else {
        if (pocketedOwn > 0) {
          teamScores.value[myTeam] += queenValue.value
          queenClaimed.value = true
          message.value = `QUEEN +${queenValue.value}`
          continuePlay = true
        } else {
          needCover.value = true
          message.value = 'COVER QUEEN!'
          continuePlay = true
        }
      }
    } else if (needCover.value && !foul) {
      if (pocketedOwn > 0) {
        teamScores.value[myTeam] += queenValue.value
        queenClaimed.value = true
        needCover.value = false
        message.value = `COVERED +${queenValue.value}`
        continuePlay = true
      } else {
        returnQueen()
        needCover.value = false
        message.value = 'QUEEN BACK'
      }
    }

    // Add points for own pieces
    if (!foul && pocketedOwn > 0) {
      teamScores.value[myTeam] += pocketedOwn
      continuePlay = true
    }

    if (foul) {
      if (turnPocketedQueen.value && !queenClaimed.value) returnQueen()
      needCover.value = false
      continuePlay = false
    }

    // Win check
    let won = false
    if (rules.value.winCondition === 0) {
      if (myColor !== 0 && countPieces(myColor) === 0 && (queenClaimed.value || !needCover.value)) {
        won = true
      }
    } else {
      if (teamScores.value[myTeam] >= winTarget.value) {
        won = true
      }
    }

    if (won) {
      gameOver.value = true
      if (is4Player.value) {
        const winners: string[] = []
        for (let i = 0; i < 4; i++) {
          if (teamAssign.value[i] === myTeam) winners.push(`P${i + 1}`)
        }
        message.value = `${winners.join('+')} WIN!`
      } else {
        message.value = `P${currentPlayer.value + 1} WINS!`
      }
      msgTimer.value = 200
      playWin()
      resetTurnTracking()
      return
    }

    if (rules.value.continuation === 1) continuePlay = false

    msgTimer.value = 100
    resetTurnTracking()

    if (continuePlay && !foul) {
      resetStriker()
      if (message.value === '') message.value = 'GO AGAIN'
    } else {
      nextPlayer()
    }
  }

  function nextPlayer(): void {
    const numPlayers = is4Player.value ? 4 : 2
    currentPlayer.value = (currentPlayer.value + 1) % numPlayers
    resetStriker()
    message.value = `P${currentPlayer.value + 1} GO`
    msgTimer.value = 100
  }

  function shoot(power: number, angle: number): void {
    // Check backward rule
    if (rules.value.backwards === 1) {
      const dir = getShootDirection()
      const shotX = Math.cos(angle)
      const shotY = Math.sin(angle)
      if (dir.x * shotX + dir.y * shotY < 0) {
        phase.value = 0
        return
      }
    }

    const force = (power / 140) * MAX_POWER
    striker.value.vx = Math.cos(angle) * force
    striker.value.vy = Math.sin(angle) * force
    phase.value = 2
    playShoot(power / 140)
  }

  function updateSliderPosition(): void {
    const pos = getStrikerPosition()
    striker.value.x = pos.x
    striker.value.y = pos.y
  }

  function setRule(key: keyof Rules, delta: number): void {
    const opts = RULE_OPTIONS[key]
    const maxVal = opts.length - 1
    rules.value[key] = ((rules.value[key] + delta) + maxVal + 1) % (maxVal + 1)
    playClick()
  }

  function togglePlayerTeam(playerIndex: number): void {
    teamAssign.value[playerIndex] = 1 - teamAssign.value[playerIndex]
    playClick()
  }

  function reset(): void {
    gameState.value = 'menu'
    playerCount.value = 2
    selectedRule.value = 0
    rules.value = {
      colorAssign: 0,
      queenRule: 0,
      queenPoints: 0,
      foulPenalty: 0,
      opponentPocket: 0,
      continuation: 0,
      winCondition: 0,
      backwards: 0
    }
    teamAssign.value = [0, 1, 0, 1]
    pieces.value = []
    currentPlayer.value = 0
    teamScores.value = [0, 0]
    teamColors.value = [0, 0]
    phase.value = 0
    sliderPos.value = 0.5
    dragMode.value = 0
    message.value = ''
    msgTimer.value = 0
    queenClaimed.value = false
    needCover.value = false
    gameOver.value = false
    hasPocketedOwn.value = [false, false]
    resetTurnTracking()
  }

  return {
    // Constants
    W,
    H,
    CX,
    CY,
    POCKETS,
    ZONES,
    ZONE_WIDTH,
    PIECE_R,
    STRIKER_R,
    POCKET_R,
    RULE_OPTIONS,
    RULE_LABELS,
    TEAM_COLORS,
    TEAM_NAMES,

    // State
    gameState,
    playerCount,
    selectedRule,
    rules,
    teamAssign,
    pieces,
    striker,
    currentPlayer,
    strikerZone,
    teamScores,
    teamColors,
    phase,
    sliderPos,
    dragMode,
    aimStartX,
    aimStartY,
    aimCurX,
    aimCurY,
    message,
    msgTimer,
    queenClaimed,
    needCover,
    gameOver,

    // Computed
    is4Player,
    queenValue,
    winTarget,
    ruleKeys,

    // Actions
    initAudio,
    getPlayerTeam,
    countPieces,
    getStrikerPosition,
    getShootDirection,
    resetStriker,
    resetTurnTracking,
    initGame,
    physics,
    shoot,
    updateSliderPosition,
    setRule,
    togglePlayerTeam,
    endTurn,
    nextPlayer,
    reset
  }
})

export type CarromStore = ReturnType<typeof useCarromStore>
