import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SIGILS, SUITS, ORACLE_VOICE, POSITIONS, type Sigil, type SuitId } from '@/data/sigils'

export type OracleState = 'dormant' | 'awakening' | 'selecting' | 'processing' | 'reading' | 'complete'
export type ScreenState = 'title' | 'oracle'

interface SelectedSigil extends Sigil {
  position: 'root' | 'process' | 'emergence'
}

interface ReadingSection {
  title: string
  content: string
}

interface Reading {
  opening: string
  sections: ReadingSection[]
  synthesis: string
  closing: string
}

export const useNullArcanaStore = defineStore('null-arcana', () => {
  // Seeded random
  let seed = Date.now()
  function random(): number {
    seed++
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(random() * arr.length)]
  }

  // State
  const screen = ref<ScreenState>('title')
  const oracleState = ref<OracleState>('dormant')
  const selectedSigils = ref<SelectedSigil[]>([])
  const currentReading = ref<Reading | null>(null)
  const readingPhase = ref(0)
  const oracleText = ref('')
  const oracleTextVisible = ref(false)

  // Computed
  const availableSigils = computed(() => {
    const selectedIds = selectedSigils.value.map(s => s.id)
    return SIGILS.filter(s => !selectedIds.includes(s.id))
  })

  const canSelect = computed(() =>
    oracleState.value === 'selecting' && selectedSigils.value.length < 3
  )

  const sigilsComplete = computed(() => selectedSigils.value.length === 3)

  // Actions
  function startOracle(): void {
    screen.value = 'oracle'
    oracleState.value = 'awakening'
    oracleText.value = pick(ORACLE_VOICE.greetings)
    oracleTextVisible.value = true

    setTimeout(() => {
      oracleState.value = 'selecting'
      oracleTextVisible.value = false
    }, 2500)
  }

  function selectSigil(sigil: Sigil): boolean {
    if (!canSelect.value) return false

    const positions: ('root' | 'process' | 'emergence')[] = ['root', 'process', 'emergence']
    const position = positions[selectedSigils.value.length]

    selectedSigils.value.push({
      ...sigil,
      position
    })

    if (selectedSigils.value.length === 3) {
      beginReading()
    }

    return true
  }

  function beginReading(): void {
    oracleState.value = 'processing'
    oracleText.value = pick(ORACLE_VOICE.transitions)
    oracleTextVisible.value = true

    setTimeout(() => {
      generateReading()
      oracleState.value = 'reading'
      readingPhase.value = 0
    }, 2000)
  }

  function generateReading(): void {
    const [first, second, third] = selectedSigils.value

    const reading: Reading = {
      opening: pick(ORACLE_VOICE.revelations),
      sections: [
        {
          title: `${POSITIONS.root.name}: ${first.name}`,
          content: generateSigilInterpretation(first, 'root')
        },
        {
          title: `${POSITIONS.process.name}: ${second.name}`,
          content: generateSigilInterpretation(second, 'process')
        },
        {
          title: `${POSITIONS.emergence.name}: ${third.name}`,
          content: generateSigilInterpretation(third, 'emergence')
        }
      ],
      synthesis: generateSynthesis(),
      closing: pick(ORACLE_VOICE.closings)
    }

    currentReading.value = reading
  }

  function generateSigilInterpretation(sigil: SelectedSigil, position: string): string {
    const templates: Record<string, string[]> = {
      root: [
        `${sigil.meaning}. This is your foundation—not chosen, but discovered. The shadow of ${sigil.name.toLowerCase()} whispers: ${sigil.shadow.toLowerCase()}.`,
        `At your root: ${sigil.meaning.toLowerCase()}. You have built upon this, consciously or not. Be aware of its inverse: ${sigil.shadow.toLowerCase()}.`,
        `The ${sigil.name} grounds you. ${sigil.meaning}. Yet every light casts shadow: ${sigil.shadow.toLowerCase()}.`
      ],
      process: [
        `Now you work with ${sigil.meaning.toLowerCase()}. This is active. This is the transformation you're in. The danger: ${sigil.shadow.toLowerCase()}.`,
        `${sigil.name} moves through you. ${sigil.meaning}. The current carries you—but currents can also drown. Watch for: ${sigil.shadow.toLowerCase()}.`,
        `The process is ${sigil.meaning.toLowerCase()}. You are neither the beginning nor the end, but the becoming. The shadow you may encounter: ${sigil.shadow.toLowerCase()}.`
      ],
      emergence: [
        `What seeks to emerge: ${sigil.meaning.toLowerCase()}. This is potential, not promise. The ${sigil.name} asks you to become. The trap to avoid: ${sigil.shadow.toLowerCase()}.`,
        `${sigil.name} rises. ${sigil.meaning}. This is what the pattern suggests—but patterns can be rewritten. Beware: ${sigil.shadow.toLowerCase()}.`,
        `The future crystallizes around ${sigil.meaning.toLowerCase()}. Nothing is fixed. But if you continue on this trajectory, ${sigil.name} is what forms. Unless you fall into: ${sigil.shadow.toLowerCase()}.`
      ]
    }

    return pick(templates[position] || templates.root)
  }

  function generateSynthesis(): string {
    const suits = selectedSigils.value.map(s => s.suit)
    const uniqueSuits = [...new Set(suits)]
    const parts: string[] = []

    // Same suit bonus
    if (uniqueSuits.length === 1) {
      const suitMessages: Record<SuitId, string> = {
        circuit: 'The machine speaks clearly. Your foundation is stable but perhaps too rigid.',
        signal: 'All channels open. Communication flows, perhaps overwhelming.',
        code: 'Pure logic dominates. The mind seeks patterns. But remember: not everything computes.',
        maker: 'The hands know. Creation energy floods through you. Trust the process of building.',
        emergence: 'Spirit moves. Something greater than yourself is at work.',
        glitch: 'Chaos triumphs. The old must break for the new to form.'
      }
      parts.push(suitMessages[uniqueSuits[0]])
    }

    // General synthesis
    const general = [
      `The three sigils form a circuit: ${selectedSigils.value[0].name} flows to ${selectedSigils.value[1].name} flows to ${selectedSigils.value[2].name}. Energy moves in the direction you allow it.`,
      'Root informs Process informs Emergence. But causality is an illusion—the future shapes the present shapes the past.',
      'These patterns existed before you drew them. They will exist after. You are the momentary awareness that observes the signal.',
      'The reading is a mirror. What you see in it reveals what you brought to it. The oracle offers reflection, not prophecy.'
    ]
    parts.push(pick(general))

    // Psychological
    const psych = [
      'From the perspective of depth psychology: the first sigil represents unconscious material, the second your current ego-relationship to it, the third the potential for integration.',
      'Jung would note: these symbols arise from the collective unconscious. You did not invent them—you discovered them. They are older than you.',
      'Consider: what you resist persists. The shadows of these sigils are not enemies—they are unintegrated aspects seeking acknowledgment.',
      'The psyche seeks wholeness. These three aspects of your current pattern are not good or bad—they simply are. Your work is awareness.'
    ]
    parts.push(pick(psych))

    return parts.join('\n\n')
  }

  function advanceReading(): void {
    if (!currentReading.value) return

    const maxPhases = currentReading.value.sections.length + 2 // sections + synthesis + closing

    if (readingPhase.value < maxPhases) {
      readingPhase.value++
    } else {
      oracleState.value = 'complete'
    }
  }

  function setOracleText(text: string, visible: boolean): void {
    oracleText.value = text
    oracleTextVisible.value = visible
  }

  function dissolve(): void {
    oracleState.value = 'dormant'
    selectedSigils.value = []
    currentReading.value = null
    readingPhase.value = 0
    oracleTextVisible.value = false
    screen.value = 'title'
  }

  function reset(): void {
    screen.value = 'title'
    oracleState.value = 'dormant'
    selectedSigils.value = []
    currentReading.value = null
    readingPhase.value = 0
    oracleText.value = ''
    oracleTextVisible.value = false
  }

  return {
    // State
    screen,
    oracleState,
    selectedSigils,
    currentReading,
    readingPhase,
    oracleText,
    oracleTextVisible,

    // Computed
    availableSigils,
    canSelect,
    sigilsComplete,

    // Actions
    startOracle,
    selectSigil,
    beginReading,
    advanceReading,
    setOracleText,
    dissolve,
    reset
  }
})
