import type { CarromStore } from '@/stores/carrom'

export function useCarromRendering(store: CarromStore) {
  // Pre-rendered board
  let boardCanvas: HTMLCanvasElement | null = null

  function renderBoard(): void {
    boardCanvas = document.createElement('canvas')
    boardCanvas.width = store.W
    boardCanvas.height = store.H
    const ctx = boardCanvas.getContext('2d')
    if (!ctx) return

    const CX = store.CX
    const CY = store.CY
    const WALL_INNER = 290
    const WALL_OUTER = 345
    const BOARD_R = 290

    // Background
    ctx.fillStyle = '#060606'
    ctx.fillRect(0, 0, store.W, store.H)
    ctx.beginPath()
    ctx.arc(CX, CY, 358, 0, Math.PI * 2)
    ctx.fillStyle = '#1c1008'
    ctx.fill()

    // Wall
    ctx.save()
    ctx.beginPath()
    ctx.arc(CX, CY, WALL_OUTER, 0, Math.PI * 2)
    ctx.arc(CX, CY, WALL_INNER, 0, Math.PI * 2, true)
    ctx.clip()
    ctx.fillStyle = '#3d2816'
    ctx.fillRect(0, 0, store.W, store.H)
    ctx.restore()

    // Playing surface
    ctx.beginPath()
    ctx.arc(CX, CY, BOARD_R, 0, Math.PI * 2)
    const sg = ctx.createRadialGradient(CX - 50, CY - 50, 0, CX, CY, BOARD_R)
    sg.addColorStop(0, '#e8d4b8')
    sg.addColorStop(1, '#c9a87a')
    ctx.fillStyle = sg
    ctx.fill()

    // Center circles
    ctx.strokeStyle = '#3d2a15'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(CX, CY, 72, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#4a3520'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(CX, CY, 55, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(CX, CY, 22, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(CX, CY, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#3d2a15'
    ctx.fill()

    // Strike zones
    ctx.strokeStyle = '#4a3520'
    ctx.lineWidth = 2
    const zl = CX - store.ZONE_WIDTH / 2
    const zr = CX + store.ZONE_WIDTH / 2
    const zt = CY - store.ZONE_WIDTH / 2
    const zb = CY + store.ZONE_WIDTH / 2

    // Horizontal zones (top and bottom)
    ;[CY + 150, CY - 150].forEach(y => {
      ctx.beginPath()
      ctx.moveTo(zl, y)
      ctx.lineTo(zr, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(zl, y, 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(zr, y, 8, 0, Math.PI * 2)
      ctx.stroke()
    })

    // Vertical zones (left and right)
    ;[CX + 150, CX - 150].forEach(x => {
      ctx.beginPath()
      ctx.moveTo(x, zt)
      ctx.lineTo(x, zb)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, zt, 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, zb, 8, 0, Math.PI * 2)
      ctx.stroke()
    })

    // Strike arcs
    ctx.beginPath()
    ctx.arc(CX, CY + 150, 25, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(CX, CY - 150, 25, Math.PI * 0.15, Math.PI * 0.85)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(CX + 150, CY, 25, Math.PI * 0.65, Math.PI * 1.35)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(CX - 150, CY, 25, -Math.PI * 0.35, Math.PI * 0.35)
    ctx.stroke()

    // Pockets
    store.POCKETS.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, store.POCKET_R + 10, 0, Math.PI * 2)
      ctx.fillStyle = '#1a0a04'
      ctx.fill()

      const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, store.POCKET_R + 8)
      pg.addColorStop(0, '#000')
      pg.addColorStop(0.6, '#0a0402')
      pg.addColorStop(1, '#201008')
      ctx.beginPath()
      ctx.arc(p.x, p.y, store.POCKET_R + 8, 0, Math.PI * 2)
      ctx.fillStyle = pg
      ctx.fill()
    })

    // Clip to circle
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(CX, CY, 358, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawPiece(ctx: CanvasRenderingContext2D, x: number, y: number, type: number, r: number): void {
    const colors = type === 0
      ? ['#ff5555', '#991111']
      : type === 1
        ? ['#fffef8', '#c8c4b8']
        : ['#2a2a2a', '#080808']

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2)
    ctx.fill()

    // Piece
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
    g.addColorStop(0, colors[0])
    g.addColorStop(1, colors[1])
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    // Inner ring
    ctx.strokeStyle = type === 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
    ctx.stroke()
  }

  function drawStriker(ctx: CanvasRenderingContext2D, x: number, y: number, player: number): void {
    const colors = [
      ['#ffcccc', '#ff6666'],
      ['#ccffff', '#44bbbb'],
      ['#ffffcc', '#bbbb44'],
      ['#ffccff', '#bb44bb']
    ]
    const c = colors[player]

    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.arc(x + 2, y + 2, store.STRIKER_R, 0, Math.PI * 2)
    ctx.fill()

    const g = ctx.createRadialGradient(x - store.STRIKER_R * 0.3, y - store.STRIKER_R * 0.3, 0, x, y, store.STRIKER_R)
    g.addColorStop(0, c[0])
    g.addColorStop(1, c[1])
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, store.STRIKER_R, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawMenu(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, store.W, store.H)

    ctx.beginPath()
    ctx.arc(store.CX, store.CY, 340, 0, Math.PI * 2)
    const bg = ctx.createRadialGradient(store.CX, store.CY, 0, store.CX, store.CY, 340)
    bg.addColorStop(0, '#1a1510')
    bg.addColorStop(1, '#0a0805')
    ctx.fillStyle = bg
    ctx.fill()

    ctx.font = 'bold 48px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#d4a574'
    ctx.fillText('CARROM', store.CX, 130)

    // Player buttons
    ctx.font = '14px monospace'
    ctx.fillStyle = '#888'
    ctx.fillText('PLAYERS', store.CX, 200)

    // 2 Player
    ctx.beginPath()
    ctx.roundRect(store.CX - 130, 215, 120, 50, 8)
    ctx.fillStyle = store.playerCount === 2 ? '#3d2816' : '#1a1008'
    ctx.fill()
    ctx.strokeStyle = store.playerCount === 2 ? '#6a4a30' : '#2a1a10'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.font = 'bold 18px monospace'
    ctx.fillStyle = store.playerCount === 2 ? '#c9a87a' : '#555'
    ctx.fillText('2', store.CX - 70, 248)

    // 4 Player
    ctx.beginPath()
    ctx.roundRect(store.CX + 10, 215, 120, 50, 8)
    ctx.fillStyle = store.playerCount === 4 ? '#3d2816' : '#1a1008'
    ctx.fill()
    ctx.strokeStyle = store.playerCount === 4 ? '#6a4a30' : '#2a1a10'
    ctx.stroke()
    ctx.fillStyle = store.playerCount === 4 ? '#c9a87a' : '#555'
    ctx.fillText('4', store.CX + 70, 248)

    // Quick Play
    ctx.beginPath()
    ctx.roundRect(store.CX - 140, 310, 280, 70, 12)
    ctx.fillStyle = '#2a1a10'
    ctx.fill()
    ctx.strokeStyle = '#4a3520'
    ctx.stroke()
    ctx.font = 'bold 22px monospace'
    ctx.fillStyle = '#c9a87a'
    ctx.fillText('QUICK PLAY', store.CX, 353)

    // Custom Rules
    ctx.beginPath()
    ctx.roundRect(store.CX - 140, 400, 280, 70, 12)
    ctx.fillStyle = '#2a1a10'
    ctx.fill()
    ctx.stroke()
    ctx.fillText('CUSTOM RULES', store.CX, 443)

    // Clip to circle
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(store.CX, store.CY, 358, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawRules(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, store.W, store.H)

    ctx.beginPath()
    ctx.arc(store.CX, store.CY, 340, 0, Math.PI * 2)
    const bg = ctx.createRadialGradient(store.CX, store.CY, 0, store.CX, store.CY, 340)
    bg.addColorStop(0, '#1a1510')
    bg.addColorStop(1, '#0a0805')
    ctx.fillStyle = bg
    ctx.fill()

    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#d4a574'
    ctx.fillText('GAME RULES', store.CX, 60)

    const startY = 90
    const rowH = 52

    store.ruleKeys.forEach((key, i) => {
      const y = startY + i * rowH
      const isSelected = store.selectedRule === i

      ctx.beginPath()
      ctx.roundRect(70, y, 580, 46, 6)
      ctx.fillStyle = isSelected ? '#2a1a10' : '#1a1008'
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = '#6a4a30'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#888'
      ctx.fillText(store.RULE_LABELS[key as keyof typeof store.RULE_LABELS], 85, y + 18)

      const opts = store.RULE_OPTIONS[key as keyof typeof store.RULE_OPTIONS]
      const valText = opts[store.rules[key as keyof typeof store.rules]]
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = isSelected ? '#c9a87a' : '#777'
      ctx.fillText(`◄  ${valText}  ►`, store.CX + 120, y + 34)
    })

    const btnText = store.is4Player ? 'SET UP TEAMS' : 'START GAME'
    ctx.beginPath()
    ctx.roundRect(store.CX - 100, 570, 200, 50, 10)
    ctx.fillStyle = '#3d2816'
    ctx.fill()
    ctx.strokeStyle = '#5a4025'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#c9a87a'
    ctx.fillText(btnText, store.CX, 602)

    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(store.CX, store.CY, 358, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawTeams(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, store.W, store.H)

    ctx.beginPath()
    ctx.arc(store.CX, store.CY, 340, 0, Math.PI * 2)
    const bg = ctx.createRadialGradient(store.CX, store.CY, 0, store.CX, store.CY, 340)
    bg.addColorStop(0, '#1a1510')
    bg.addColorStop(1, '#0a0805')
    ctx.fillStyle = bg
    ctx.fill()

    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#d4a574'
    ctx.fillText('TEAM SETUP', store.CX, 70)

    ctx.font = '12px monospace'
    ctx.fillStyle = '#888'
    ctx.fillText('Tap a player to change their team', store.CX, 112)

    // Board representation
    ctx.beginPath()
    ctx.arc(store.CX, store.CY, 130, 0, Math.PI * 2)
    ctx.fillStyle = '#2a1a10'
    ctx.fill()

    const positions = [
      { x: store.CX, y: store.CY + 200, label: 'P1' },
      { x: store.CX + 200, y: store.CY, label: 'P2' },
      { x: store.CX, y: store.CY - 200, label: 'P3' },
      { x: store.CX - 200, y: store.CY, label: 'P4' }
    ]

    positions.forEach((pos, i) => {
      const team = store.teamAssign[i]

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 44, 0, Math.PI * 2)
      ctx.fillStyle = store.TEAM_COLORS[team]
      ctx.globalAlpha = 0.3
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 36, 0, Math.PI * 2)
      ctx.fillStyle = store.TEAM_COLORS[team]
      ctx.fill()

      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.font = 'bold 20px monospace'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(pos.label, pos.x, pos.y + 7)
    })

    const team0Count = store.teamAssign.filter(t => t === 0).length
    const valid = team0Count === 2

    ctx.beginPath()
    ctx.roundRect(store.CX - 100, 580, 200, 50, 10)
    ctx.fillStyle = valid ? '#3d2816' : '#1a1008'
    ctx.fill()
    ctx.strokeStyle = valid ? '#5a4025' : '#2a1a10'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.font = 'bold 18px monospace'
    ctx.fillStyle = valid ? '#c9a87a' : '#555'
    ctx.fillText('START GAME', store.CX, 612)

    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(store.CX, store.CY, 358, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawSlider(ctx: CanvasRenderingContext2D): void {
    const zone = store.ZONES[store.currentPlayer]
    const horizontal = zone.horizontal

    let trackX: number, trackY: number, trackW: number, trackH: number, handleX: number, handleY: number

    if (horizontal) {
      trackX = store.CX - 110
      trackY = zone.y + (store.currentPlayer === 0 ? 45 : -53)
      trackW = 220
      trackH = 36
      handleX = trackX + store.sliderPos * trackW
      handleY = trackY + 18
    } else {
      trackX = zone.x + (store.currentPlayer === 1 ? 45 : -53) - 18
      trackY = store.CY - 110
      trackW = 36
      trackH = 220
      handleX = trackX + 18
      handleY = trackY + store.sliderPos * trackH
    }

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.beginPath()
    ctx.roundRect(trackX - 6, trackY - 6, trackW + 12, trackH + 12, 18)
    ctx.fill()

    if (horizontal) {
      ctx.fillStyle = '#222'
      ctx.fillRect(trackX, trackY + 15, trackW, 6)
    } else {
      ctx.fillStyle = '#222'
      ctx.fillRect(trackX + 15, trackY, 6, trackH)
    }

    ctx.beginPath()
    ctx.arc(handleX, handleY, 16, 0, Math.PI * 2)
    ctx.fillStyle = store.TEAM_COLORS[store.getPlayerTeam(store.currentPlayer)]
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.font = '10px monospace'
    ctx.fillStyle = '#777'
    ctx.textAlign = 'center'
    ctx.fillText('SLIDE • TAP STRIKER TO AIM', store.CX, store.CY)
  }

  function drawAim(ctx: CanvasRenderingContext2D): void {
    const dx = store.aimStartX - store.aimCurX
    const dy = store.aimStartY - store.aimCurY
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 140)
    const ang = Math.atan2(dy, dx)

    let validShot = true
    if (store.rules.backwards === 1) {
      const dir = store.getShootDirection()
      const shotX = Math.cos(ang)
      const shotY = Math.sin(ang)
      if (dir.x * shotX + dir.y * shotY < 0) validShot = false
    }

    ctx.strokeStyle = validShot ? store.TEAM_COLORS[store.getPlayerTeam(store.currentPlayer)] : 'rgba(255,50,50,0.5)'
    ctx.globalAlpha = 0.75
    ctx.lineWidth = 2
    ctx.setLineDash([6, 5])
    ctx.beginPath()
    ctx.moveTo(store.striker.x, store.striker.y)
    ctx.lineTo(store.striker.x + Math.cos(ang) * 130, store.striker.y + Math.sin(ang) * 130)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    if (!validShot) {
      ctx.font = '12px monospace'
      ctx.fillStyle = '#ff5555'
      ctx.textAlign = 'center'
      ctx.fillText('NO BACKWARD SHOTS', store.CX, store.CY)
    }

    // Power bar
    const zone = store.ZONES[store.currentPlayer]
    let barX: number, barY: number

    if (zone.horizontal) {
      barX = store.CX - 70
      barY = zone.y + (store.currentPlayer === 0 ? 90 : -98)
    } else {
      barX = zone.x + (store.currentPlayer === 1 ? 50 : -190)
      barY = store.CY - 5
    }

    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(barX - 3, barY - 3, 146, 16)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(barX, barY, 140, 10)

    const pct = power / 140
    ctx.fillStyle = pct < 0.5 ? '#4ecdc4' : pct < 0.8 ? '#ddc060' : '#ff6b6b'
    ctx.fillRect(barX, barY, 140 * pct, 10)
  }

  function drawScores(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center'

    if (store.is4Player) {
      const myTeam = store.getPlayerTeam(store.currentPlayer)

      ctx.font = 'bold 16px monospace'
      ctx.fillStyle = myTeam === 0 && store.phase !== 2 ? store.TEAM_COLORS[0] : '#664444'
      ctx.fillText(`${store.TEAM_NAMES[0]}: ${store.teamScores[0]}`, store.CX - 50, store.CY + 325)

      ctx.fillStyle = myTeam === 1 && store.phase !== 2 ? store.TEAM_COLORS[1] : '#446666'
      ctx.fillText(`${store.TEAM_NAMES[1]}: ${store.teamScores[1]}`, store.CX - 50, store.CY - 310)
    } else {
      ctx.font = 'bold 20px monospace'
      const p1Active = store.currentPlayer === 0 && store.phase !== 2
      ctx.fillStyle = p1Active ? '#ff8080' : '#664444'
      ctx.fillText(`P1: ${store.teamScores[0]}`, store.CX, store.CY + 328)

      const p2Active = store.currentPlayer === 1 && store.phase !== 2
      ctx.fillStyle = p2Active ? '#80d0cc' : '#446666'
      ctx.fillText(`P2: ${store.teamScores[1]}`, store.CX, store.CY - 318)
    }
  }

  function getBoardCanvas(): HTMLCanvasElement | null {
    return boardCanvas
  }

  return {
    renderBoard,
    getBoardCanvas,
    drawPiece,
    drawStriker,
    drawMenu,
    drawRules,
    drawTeams,
    drawSlider,
    drawAim,
    drawScores
  }
}
