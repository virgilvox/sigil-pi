import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MONSTERS, DIFFICULTIES, type Monster, type DifficultyId } from '@/data/monsters'
import { COMPONENTS, ELEMENTS, SPELL_WORDS, type Component, type ElementId, type StatusId } from '@/data/components'

// Music System
let audioCtx: AudioContext | null = null
let musicPlaying = false
let musicNodes: (AudioNode | OscillatorNode)[] = []
let musicIntervals: ReturnType<typeof setInterval>[] = []
const musicState = { beat: 0, section: 0, chordIdx: 0 }

const NOTE = {
  A2: 110, B2: 123.5, C3: 130.8, D3: 146.8, E3: 164.8, F3: 174.6, G3: 196,
  A3: 220, B3: 246.9, C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392,
  A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784,
  A5: 880, B5: 987.8, C6: 1047, D6: 1175, E6: 1319
}

const CHORDS: Record<string, number[]> = {
  Am: [NOTE.A3, NOTE.C4, NOTE.E4, NOTE.A4],
  F:  [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4],
  C:  [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5],
  G:  [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4]
}

const PROGRESSION = ['Am', 'F', 'C', 'G']

function initAudioContext(): void {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
}

function startMusic(): void {
  if (musicPlaying || !audioCtx) return
  musicPlaying = true
  musicState.beat = 0
  musicState.section = 0
  musicState.chordIdx = 0

  const masterGain = audioCtx.createGain()
  masterGain.gain.value = 0.18
  masterGain.connect(audioCtx.destination)
  musicNodes.push(masterGain)

  // Bass
  const bassOsc = audioCtx.createOscillator()
  const bassGain = audioCtx.createGain()
  const bassFilter = audioCtx.createBiquadFilter()
  bassOsc.type = 'sine'
  bassFilter.type = 'lowpass'
  bassFilter.frequency.value = 150
  bassGain.gain.value = 0
  bassOsc.connect(bassFilter)
  bassFilter.connect(bassGain)
  bassGain.connect(masterGain)
  bassOsc.start()
  musicNodes.push(bassOsc, bassGain, bassFilter)

  const bassRoots: Record<string, number> = { Am: NOTE.A2, F: NOTE.F3 * 0.5, C: NOTE.C3, G: NOTE.G3 * 0.5 }
  const bassPattern = [1, 0, 0.6, 0, 1, 0, 0.4, 0.7]
  let bassStep = 0
  const bassInt = setInterval(() => {
    if (!musicPlaying || !audioCtx) return
    const t = audioCtx.currentTime
    const chord = PROGRESSION[musicState.chordIdx]
    const root = bassRoots[chord]
    const vel = bassPattern[bassStep % 8]
    if (vel > 0) {
      bassOsc.frequency.setValueAtTime(root, t)
      bassGain.gain.setValueAtTime(0.35 * vel, t)
      bassGain.gain.exponentialRampToValueAtTime(0.1, t + 0.15)
    }
    bassStep++
  }, 187.5)
  musicIntervals.push(bassInt)

  // Pad
  const padFilter = audioCtx.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 700
  padFilter.connect(masterGain)
  musicNodes.push(padFilter)

  const initialChord = CHORDS[PROGRESSION[0]]
  const padOscs: OscillatorNode[] = []
  for (let i = 0; i < 4; i++) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = i < 2 ? 'triangle' : 'sine'
    osc.frequency.value = initialChord[i]
    gain.gain.value = 0.04
    osc.connect(gain)
    gain.connect(padFilter)
    osc.start()
    padOscs.push(osc)
    musicNodes.push(osc, gain)
  }

  // Chord changes
  const chordInt = setInterval(() => {
    if (!musicPlaying || !audioCtx) return
    musicState.chordIdx = (musicState.chordIdx + 1) % PROGRESSION.length
    const chord = CHORDS[PROGRESSION[musicState.chordIdx]]
    const t = audioCtx.currentTime
    padOscs.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(chord[i], t, 0.15)
    })
    musicState.section++
  }, 3000)
  musicIntervals.push(chordInt)

  // Hi-hat
  let hatStep = 0
  const hatInt = setInterval(() => {
    if (!musicPlaying || !audioCtx) return
    const t = audioCtx.currentTime
    const isOffbeat = hatStep % 2 === 1
    const vel = isOffbeat ? 0.04 : 0.08
    const bufferSize = audioCtx.sampleRate * 0.03
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const hat = audioCtx.createBufferSource()
    const hatGain = audioCtx.createGain()
    const hatFilter = audioCtx.createBiquadFilter()
    hat.buffer = buffer
    hatFilter.type = 'highpass'
    hatFilter.frequency.value = 8000
    hatGain.gain.setValueAtTime(vel, t)
    hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    hat.connect(hatFilter)
    hatFilter.connect(hatGain)
    hatGain.connect(masterGain)
    hat.start(t)
    hatStep++
  }, 187.5)
  musicIntervals.push(hatInt)
}

function stopMusic(): void {
  musicPlaying = false
  musicIntervals.forEach(i => clearInterval(i))
  musicIntervals = []
  musicNodes.forEach(node => {
    try { if ('stop' in node && typeof node.stop === 'function') node.stop() } catch {}
    try { node.disconnect() } catch {}
  })
  musicNodes = []
}

interface RuntimeComponent extends Component {
  used: boolean
}

interface SpellResult {
  name: string
  damage: number
  weakness: boolean
  combo: boolean
  effects: string[]
  elements: ElementId[]
}

interface RuntimeMonster extends Monster {
  currentHp: number
  maxHp: number
  scaledAtk: number
}

type StatusMap = Partial<Record<StatusId, number>>

export const useJunkMageStore = defineStore('junk-mage', () => {
  // Seeded random
  let seed = Date.now()
  function random(): number {
    seed++
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // Game state
  const difficulty = ref<DifficultyId>('normal')
  const fightNum = ref(1)
  const maxFights = ref(3)

  const mageMaxHp = ref(40)
  const mageHp = ref(40)
  const mageStatus = ref<StatusMap>({})

  const monster = ref<RuntimeMonster | null>(null)
  const monsterIntent = ref(0)
  const monsterStatus = ref<StatusMap>({})

  const components = ref<RuntimeComponent[]>([])
  const selected = ref<number[]>([])
  const turn = ref(1)
  const totalDamage = ref(0)
  const powerBonus = ref(1)
  const scouting = ref(false)
  const fightHistory = ref<string[]>([])

  const gameOver = ref(false)
  const processing = ref(false)
  const screen = ref<'boot' | 'intro' | 'game' | 'between' | 'victory' | 'defeat'>('boot')

  // Computed
  const selectedComponents = computed(() =>
    selected.value.map(i => components.value[i])
  )

  const canCast = computed(() =>
    selected.value.length >= 2 && !processing.value && !gameOver.value
  )

  const availableComponents = computed(() =>
    components.value.filter((c, i) => !c.used && !selected.value.includes(i))
  )

  const canHeal = computed(() =>
    availableComponents.value.length >= 1 && mageHp.value < mageMaxHp.value
  )

  const canReroll = computed(() => {
    const diff = DIFFICULTIES[difficulty.value]
    return mageHp.value > diff.reroll
  })

  const rerollCost = computed(() => DIFFICULTIES[difficulty.value].reroll)

  // Actions
  function startGame(diff: DifficultyId): void {
    difficulty.value = diff
    const settings = DIFFICULTIES[diff]
    maxFights.value = settings.fights
    mageMaxHp.value = settings.hp
    mageHp.value = settings.hp
    fightNum.value = 1
    totalDamage.value = 0
    powerBonus.value = 1
    scouting.value = false
    fightHistory.value = []
    gameOver.value = false
    screen.value = 'game'
    initFight()
    initAudioContext()
    startMusic()
  }

  function initFight(): void {
    const diff = DIFFICULTIES[difficulty.value]

    // Pick random monster
    const shuffledMonsters = [...MONSTERS].sort(() => random() - 0.5)
    const base = shuffledMonsters[0]

    const scaledHp = Math.floor(base.hp * diff.hpM)
    const scaledAtk = Math.floor(base.atk * diff.atkM)

    monster.value = {
      ...base,
      currentHp: scaledHp,
      maxHp: scaledHp,
      scaledAtk
    }

    monsterStatus.value = {}
    monsterIntent.value = scaledAtk + Math.floor(random() * 5)
    mageStatus.value = {}
    turn.value = 1
    selected.value = []
    processing.value = false

    // Pick 6 random components
    const shuffledComps = [...COMPONENTS].sort(() => random() - 0.5)
    components.value = shuffledComps.slice(0, 6).map(c => ({ ...c, used: false }))
  }

  function toggleComponent(index: number): boolean {
    if (gameOver.value || processing.value || components.value[index]?.used) {
      return false
    }

    const idx = selected.value.indexOf(index)
    if (idx === -1) {
      if (selected.value.length < 3) {
        selected.value.push(index)
        return true
      }
      return false
    } else {
      selected.value.splice(idx, 1)
      return true
    }
  }

  function calculateSpell(): SpellResult {
    const comps = selectedComponents.value
    const elements = comps.map(c => c.element)
    const effects = comps.map(c => c.effect).filter(Boolean) as string[]

    // Get primary element (most common)
    const elementCounts = elements.reduce((acc, el) => {
      acc[el] = (acc[el] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const sortedElements = [...elements].sort((a, b) =>
      (elementCounts[b] || 0) - (elementCounts[a] || 0)
    )

    const primary = sortedElements[0]
    const secondary = sortedElements[1] || primary

    // Generate name
    const prefixes = SPELL_WORDS[primary]?.prefix || ['JUNK']
    const suffixes = SPELL_WORDS[secondary]?.suffix || ['BLAST']
    const name = `${prefixes[Math.floor(random() * prefixes.length)]} ${suffixes[Math.floor(random() * suffixes.length)]}`

    // Calculate damage
    let dmg = comps.reduce((sum, c) => sum + c.power, 0)

    // Combo bonus for 3 components
    if (comps.length === 3) {
      dmg = Math.floor(dmg * 1.15)
    }

    // Weakness bonus
    const weakness = monster.value ? elements.includes(monster.value.weakness as ElementId) : false
    if (weakness) {
      dmg = Math.floor(dmg * 1.6)
    }

    // Power bonus from between-fight choice
    dmg = Math.floor(dmg * powerBonus.value)

    // Effect modifiers
    if (effects.includes('luck') && random() > 0.5) {
      dmg = Math.floor(dmg * 1.25)
    }
    if (effects.includes('chaos')) {
      dmg = Math.floor(dmg * (0.8 + random() * 0.5))
    }

    return {
      name,
      damage: dmg,
      weakness,
      combo: comps.length === 3,
      effects,
      elements: elements as ElementId[]
    }
  }

  function castSpell(): SpellResult | null {
    if (!canCast.value || !monster.value) return null

    processing.value = true
    const spell = calculateSpell()

    // Apply status modifiers to damage
    let finalDmg = spell.damage

    if ((mageStatus.value.curse || 0) > 0) {
      finalDmg = Math.floor(finalDmg * 0.7)
      mageStatus.value.curse = (mageStatus.value.curse || 0) - 1
    }

    if ((monsterStatus.value.armor || 0) > 0) {
      finalDmg -= Math.floor(finalDmg * 0.35)
      monsterStatus.value.armor = (monsterStatus.value.armor || 0) - 1
    }

    if ((monsterStatus.value.phase || 0) > 0) {
      finalDmg = Math.floor(finalDmg * 1.4)
      monsterStatus.value.phase = (monsterStatus.value.phase || 0) - 1
    }

    // Deal damage
    monster.value.currentHp -= finalDmg
    totalDamage.value += finalDmg

    // Apply effects
    for (const eff of spell.effects) {
      if (eff === 'burn') {
        monsterStatus.value.burn = (monsterStatus.value.burn || 0) + 2
      }
      if (eff === 'stun') {
        monsterStatus.value.stun = (monsterStatus.value.stun || 0) + 1
      }
      if (eff === 'weaken') {
        monsterStatus.value.weaken = (monsterStatus.value.weaken || 0) + 2
      }
      if (eff === 'shield') {
        mageStatus.value.shield = (mageStatus.value.shield || 0) + 2
      }
    }

    // Record history
    fightHistory.value.push(spell.weakness ? '🟩' : spell.combo ? '🟨' : '⬜')

    // Mark components as used
    selected.value.forEach(i => {
      components.value[i].used = true
    })
    selected.value = []
    turn.value++

    return { ...spell, damage: finalDmg }
  }

  function monsterTurn(): { damage: number; special: string | null; stunned: boolean; burnDamage: number } {
    if (!monster.value) return { damage: 0, special: null, stunned: false, burnDamage: 0 }

    let burnDamage = 0

    // Burn tick
    if ((monsterStatus.value.burn || 0) > 0) {
      burnDamage = 4
      monster.value.currentHp -= burnDamage
      monsterStatus.value.burn = (monsterStatus.value.burn || 0) - 1
    }

    // Check stun
    if ((monsterStatus.value.stun || 0) > 0) {
      monsterStatus.value.stun = (monsterStatus.value.stun || 0) - 1
      if (random() < 0.6) {
        rollIntent()
        return { damage: 0, special: null, stunned: true, burnDamage }
      }
    }

    // Check for special attack
    if (random() < 0.3 && monster.value.special) {
      const specialResult = executeSpecial()
      rollIntent()
      return { damage: specialResult.damage, special: monster.value.special, stunned: false, burnDamage }
    }

    // Normal attack
    let dmg = monsterIntent.value

    if ((monsterStatus.value.weaken || 0) > 0) {
      dmg = Math.floor(dmg * 0.7)
      monsterStatus.value.weaken = (monsterStatus.value.weaken || 0) - 1
    }

    if ((mageStatus.value.shield || 0) > 0) {
      const block = Math.min(dmg, (mageStatus.value.shield || 0) * 3)
      dmg = Math.max(0, dmg - block)
      mageStatus.value.shield = (mageStatus.value.shield || 0) - 1
    }

    if (dmg > 0) {
      mageHp.value -= dmg
    }

    rollIntent()
    return { damage: dmg, special: null, stunned: false, burnDamage }
  }

  function executeSpecial(): { damage: number } {
    if (!monster.value) return { damage: 0 }

    const sp = monster.value.special
    let totalDmg = 0

    switch (sp) {
      case 'double': {
        // Two weaker attacks
        for (let i = 0; i < 2; i++) {
          const d = Math.floor(monster.value.scaledAtk * 0.6) + Math.floor(random() * 3)
          mageHp.value -= d
          totalDmg += d
        }
        break
      }

      case 'phase': {
        monsterStatus.value.phase = 1
        break
      }

      case 'armor': {
        monsterStatus.value.armor = 2
        break
      }

      case 'glitch': {
        // Corrupt a random component
        const available = components.value
          .map((c, i) => !c.used ? i : -1)
          .filter(x => x >= 0)

        if (available.length > 0) {
          const idx = available[Math.floor(random() * available.length)]
          components.value[idx].used = true
        }
        break
      }

      case 'drain': {
        const d = Math.floor(monster.value.scaledAtk * 0.7)
        mageHp.value -= d
        totalDmg = d
        const heal = Math.floor(d * 0.6)
        monster.value.currentHp = Math.min(monster.value.maxHp, monster.value.currentHp + heal)
        break
      }

      case 'curse': {
        mageStatus.value.curse = 2
        break
      }

      case 'regen': {
        const rh = 10 + Math.floor(random() * 6)
        monster.value.currentHp = Math.min(monster.value.maxHp, monster.value.currentHp + rh)
        break
      }

      case 'nullify': {
        mageStatus.value = {}
        const nd = monster.value.scaledAtk + Math.floor(random() * 5)
        mageHp.value -= nd
        totalDmg = nd
        break
      }
    }

    return { damage: totalDmg }
  }

  function rollIntent(): void {
    if (!monster.value) return
    monsterIntent.value = monster.value.scaledAtk + Math.floor(random() * 6)
  }

  function sacrificeHeal(): boolean {
    if (!canHeal.value || processing.value || gameOver.value) return false

    const available = components.value
      .map((c, i) => !c.used && !selected.value.includes(i) ? i : -1)
      .filter(x => x >= 0)

    if (available.length < 1) return false

    const idx = available[Math.floor(random() * available.length)]
    components.value[idx].used = true
    mageHp.value = Math.min(mageMaxHp.value, mageHp.value + 8)

    return true
  }

  function rerollParts(): boolean {
    if (!canReroll.value || processing.value || gameOver.value) return false

    const cost = DIFFICULTIES[difficulty.value].reroll
    mageHp.value -= cost

    selected.value = []
    const shuffled = [...COMPONENTS].sort(() => random() - 0.5)
    components.value = shuffled.slice(0, 6).map(c => ({ ...c, used: false }))

    return true
  }

  function checkWin(): boolean {
    return monster.value !== null && monster.value.currentHp <= 0
  }

  function checkDefeat(): boolean {
    if (mageHp.value <= 0) return true
    if (components.value.filter(c => !c.used).length < 2) return true
    return false
  }

  function fightWon(): void {
    if (fightNum.value >= maxFights.value) {
      screen.value = 'victory'
      gameOver.value = true
    } else {
      screen.value = 'between'
    }
  }

  function betweenChoice(choice: 'heal' | 'power' | 'scout'): void {
    const diff = DIFFICULTIES[difficulty.value]

    if (choice === 'heal') {
      mageHp.value = Math.min(mageMaxHp.value, mageHp.value + diff.heal)
      powerBonus.value = 1
      scouting.value = false
    } else if (choice === 'power') {
      powerBonus.value = 1.25
      scouting.value = false
    } else {
      mageHp.value = Math.min(mageMaxHp.value, mageHp.value + 5)
      powerBonus.value = 1
      scouting.value = true
    }

    fightNum.value++
    screen.value = 'game'
    initFight()
  }

  function defeat(): void {
    screen.value = 'defeat'
    gameOver.value = true
  }

  function setScreen(s: 'boot' | 'intro' | 'game' | 'between' | 'victory' | 'defeat'): void {
    screen.value = s
  }

  function setProcessing(p: boolean): void {
    processing.value = p
  }

  function getRating(): number {
    if (mageHp.value >= mageMaxHp.value * 0.75) return 3
    if (mageHp.value >= mageMaxHp.value * 0.4) return 2
    return 1
  }

  function getShareText(): string {
    const stars = getRating()
    return `JUNK MAGE [${difficulty.value.toUpperCase()}]\n${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} ${maxFights.value} fights\n${fightHistory.value.slice(0, 12).join('')}`
  }

  function reset(): void {
    stopMusic()
    difficulty.value = 'normal'
    fightNum.value = 1
    maxFights.value = 3
    mageMaxHp.value = 40
    mageHp.value = 40
    mageStatus.value = {}
    monster.value = null
    monsterIntent.value = 0
    monsterStatus.value = {}
    components.value = []
    selected.value = []
    turn.value = 1
    totalDamage.value = 0
    powerBonus.value = 1
    scouting.value = false
    fightHistory.value = []
    gameOver.value = false
    processing.value = false
    screen.value = 'boot'
  }

  return {
    // State
    difficulty,
    fightNum,
    maxFights,
    mageMaxHp,
    mageHp,
    mageStatus,
    monster,
    monsterIntent,
    monsterStatus,
    components,
    selected,
    turn,
    totalDamage,
    powerBonus,
    scouting,
    fightHistory,
    gameOver,
    processing,
    screen,

    // Computed
    selectedComponents,
    canCast,
    availableComponents,
    canHeal,
    canReroll,
    rerollCost,

    // Actions
    startGame,
    initFight,
    toggleComponent,
    calculateSpell,
    castSpell,
    monsterTurn,
    rollIntent,
    sacrificeHeal,
    rerollParts,
    checkWin,
    checkDefeat,
    fightWon,
    betweenChoice,
    defeat,
    setScreen,
    setProcessing,
    getRating,
    getShareText,
    reset
  }
})
