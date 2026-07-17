<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { useJunkMageStore } from '@/stores/junk-mage'
import { useSFX } from '@/composables/useSFX'
import { useAudio } from '@/composables/useAudio'
import { ELEMENTS, COMPONENT_ICONS, RUNE_SETS, type ElementId } from '@/data/components'
import { drawMage, drawMonster, type Monster } from '@/data/monsters'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'
import JunkMageBootScreen from './JunkMageBootScreen.vue'
import JunkMageIntroScreen from './JunkMageIntroScreen.vue'
import JunkMageResultScreen from './JunkMageResultScreen.vue'

const globalStore = useGlobalStore()
const store = useJunkMageStore()
const sfx = useSFX()
const audio = useAudio()

// Canvas refs for pixel art sprites
const monsterCanvasRef = ref<HTMLCanvasElement | null>(null)
const mageCanvasRef = ref<HTMLCanvasElement | null>(null)
const particleCanvasRef = ref<HTMLCanvasElement | null>(null)

// Animation state
const combatLog = ref('')
const showLog = ref(false)
const damagePopup = ref({ show: false, value: '', type: 'damage', target: 'monster' })
const animatingCast = ref(false)
const showTurnIndicator = ref(false)
const screenShaking = ref(false)
const castFlashActive = ref(false)
const castFlashColor = ref('#4a9fff')

// ===== Particle system (ported from reference) =====
interface Particle {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; size: number; color: string; type: string
}
const particles: Particle[] = []
let particleCtx: CanvasRenderingContext2D | null = null
let particleRaf = 0

function spawnParticles(element: string, count = 5): void {
  const cx = 140, cy = 140
  const color = ELEMENTS[element as ElementId]?.color || '#fff'
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.5 + Math.random() * 1.5
    const dist = 20 + Math.random() * 40
    particles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 50 + Math.random() * 30,
      maxLife: 80,
      size: 2 + Math.random() * 3,
      color,
      type: element
    })
  }
}

function updateParticles(): void {
  if (!particleCtx && particleCanvasRef.value) {
    particleCtx = particleCanvasRef.value.getContext('2d')
  }
  if (!particleCtx) return
  particleCtx.clearRect(0, 0, 280, 280)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life--
    if (p.life <= 0) { particles.splice(i, 1); continue }
    p.x += p.vx
    p.y += p.vy
    particleCtx.globalAlpha = p.life / p.maxLife
    particleCtx.fillStyle = p.color
    particleCtx.beginPath()
    particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    particleCtx.fill()
  }
  particleCtx.globalAlpha = 1
}

function particleLoop(): void {
  updateParticles()
  particleRaf = requestAnimationFrame(particleLoop)
}

// Reset particle context when leaving the game screen (canvas unmounts)
watch(() => store.screen, (s) => {
  if (s !== 'game') {
    particleCtx = null
    particles.length = 0
  } else {
    nextTick(() => {
      particleCtx = particleCanvasRef.value?.getContext('2d') || null
    })
  }
})

function triggerShake(): void {
  screenShaking.value = false
  requestAnimationFrame(() => {
    screenShaking.value = true
    setTimeout(() => { screenShaking.value = false }, 300)
  })
}

function triggerCastFlash(color: string): void {
  castFlashColor.value = color
  castFlashActive.value = false
  requestAnimationFrame(() => {
    castFlashActive.value = true
    setTimeout(() => { castFlashActive.value = false }, 500)
  })
}

// Computed values
const monsterHpPercent = computed(() => {
  if (!store.monster) return 0
  return Math.max(0, (store.monster.currentHp / store.monster.maxHp) * 100)
})

const mageHpPercent = computed(() => {
  return Math.max(0, (store.mageHp / store.mageMaxHp) * 100)
})

// HP arc calculations - matches original implementation (ARC_LEN 200, CIRC 1696)
const monsterHpArc = computed(() => {
  const filled = 200 * (monsterHpPercent.value / 100)
  return `${filled} ${1696 - filled}`
})

const mageHpArc = computed(() => {
  const filled = 200 * (mageHpPercent.value / 100)
  return `${filled} ${1696 - filled}`
})

const spellPreview = computed(() => {
  if (store.selected.length < 2) return null
  return store.calculateSpell()
})

const primaryElement = computed((): ElementId | null => {
  if (store.selected.length === 0) return null
  const elements = store.selectedComponents.map(c => c.element)
  const counts = elements.reduce((acc, el) => {
    acc[el] = (acc[el] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as ElementId || null
})

const primaryColor = computed(() => {
  if (!primaryElement.value) return '#4a9fff'
  return ELEMENTS[primaryElement.value]?.color || '#4a9fff'
})

// Get runes for current spell
const spellRunes = computed(() => {
  if (!primaryElement.value) return []
  return RUNE_SETS[primaryElement.value] || []
})

// Component positions in curved "smile" arc
const componentPositions = computed(() => {
  // Strong smile curve positions matching original
  return [
    { left: 5, top: 0 },
    { left: 77, top: 30 },
    { left: 149, top: 48 },
    { left: 224, top: 48 },
    { left: 296, top: 30 },
    { left: 370, top: 0 }
  ]
})

// Sprite rendering
function renderSprites(): void {
  // Draw monster
  if (monsterCanvasRef.value && store.monster) {
    const ctx = monsterCanvasRef.value.getContext('2d')
    if (ctx) {
      drawMonster(ctx, store.monster as Monster, 64)
    }
  }
  // Draw mage
  if (mageCanvasRef.value) {
    const ctx = mageCanvasRef.value.getContext('2d')
    if (ctx) {
      drawMage(ctx, 44, animatingCast.value)
    }
  }
}

// Watch for monster changes to re-render
watch(() => store.monster, () => {
  nextTick(renderSprites)
}, { deep: true })

watch(animatingCast, () => {
  nextTick(renderSprites)
})

// Get SVG icon for component
function getComponentIcon(id: string): string {
  return COMPONENT_ICONS[id] || '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="currentColor"/></svg>'
}

// UI helpers
function getElementColor(element: string): string {
  return ELEMENTS[element as ElementId]?.color || '#fff'
}

function showDamagePopup(value: string, type: string, target: string): void {
  damagePopup.value = { show: true, value, type, target }
  setTimeout(() => {
    damagePopup.value.show = false
  }, 700)
}

function setLog(msg: string): void {
  combatLog.value = msg
  showLog.value = true
  setTimeout(() => {
    showLog.value = false
  }, 2500)
}

// Boot screen dismissal
function handleBootDismiss(): void {
  audio.init()
  store.setScreen('intro')
  sfx.play('click')
}

function selectDifficulty(diff: 'easy' | 'normal' | 'hard' | 'brutal'): void {
  sfx.play('click')
  store.startGame(diff)
  setLog(`⚔ <span class="log-monster">${store.monster?.name || 'Monster'}</span> appears!`)
}

function toggleComponent(index: number): void {
  const wasSelected = store.selected.includes(index)
  const element = store.components[index]?.element
  if (store.toggleComponent(index)) {
    sfx.play(wasSelected ? 'click' : 'collect')
    if (!wasSelected && element) spawnParticles(element, 3)
  }
}

async function castSpell(): Promise<void> {
  if (!store.canCast || animatingCast.value) return

  animatingCast.value = true
  sfx.play('cast')

  // Capture primary element before selection is cleared, spawn cast particles + flash
  const primary = primaryElement.value || 'spark'
  const primaryCol = primaryColor.value
  for (let i = 0; i < 20; i++) spawnParticles(primary, 1)
  triggerCastFlash(primaryCol)

  const spell = store.castSpell()
  if (!spell) {
    animatingCast.value = false
    return
  }

  // Show damage
  await delay(300)
  sfx.play(spell.weakness ? 'hit' : 'damage')
  showDamagePopup(`-${spell.damage}`, spell.weakness ? 'crit' : 'damage', 'monster')
  setLog(`<span class="log-player">${spell.name}</span> → <span class="log-damage">${spell.damage}</span>${spell.weakness ? ' <span class="log-crit">CRIT!</span>' : ''}`)

  await delay(400)

  // Check win before monster turn
  if (store.checkWin()) {
    sfx.play('victory')
    store.fightWon()
    animatingCast.value = false
    store.setProcessing(false)
    return
  }

  // Monster turn — enemy turn indicator + screen shake
  await delay(300)
  showTurnIndicator.value = true
  await delay(350)
  showTurnIndicator.value = false
  await delay(100)

  const result = store.monsterTurn()

  if (result.burnDamage > 0) {
    showDamagePopup(`-${result.burnDamage}`, 'damage', 'monster')
    await delay(200)
  }

  if (result.stunned) {
    setLog(`<span class="log-monster">${store.monster?.name}</span> stunned!`)
  } else if (result.special) {
    setLog(`<span class="log-monster">${store.monster?.name}</span> uses <span class="log-effect">${result.special.toUpperCase()}</span>!`)
    if (result.damage > 0) {
      triggerShake()
      await delay(200)
      sfx.play('damage')
      showDamagePopup(`-${result.damage}`, 'damage', 'mage')
    }
  } else if (result.damage > 0) {
    triggerShake()
    sfx.play('damage')
    showDamagePopup(`-${result.damage}`, 'damage', 'mage')
    setLog(`<span class="log-monster">${store.monster?.name}</span> → <span class="log-damage">${result.damage}</span>`)
  }

  await delay(200)

  // Check for win (from burn damage)
  if (store.checkWin()) {
    sfx.play('victory')
    store.fightWon()
  } else if (store.checkDefeat()) {
    sfx.play('defeat')
    store.defeat()
  }

  animatingCast.value = false
  store.setProcessing(false)
}

function healAction(): void {
  if (store.sacrificeHeal()) {
    sfx.play('heal')
    showDamagePopup('+8', 'heal', 'mage')
    setLog('<span class="log-heal">Sacrificed component for +8 HP</span>')
  }
}

function rerollAction(): void {
  if (store.rerollParts()) {
    sfx.play('cast')
    showDamagePopup(`-${store.rerollCost}`, 'damage', 'mage')
    setLog('<span class="log-effect">Transmuted for new parts</span>')
    const pool = ['chaos', 'void', 'spark']
    for (let i = 0; i < 12; i++) spawnParticles(pool[Math.floor(Math.random() * 3)], 1)
  }
}

function betweenChoice(choice: 'heal' | 'power' | 'scout'): void {
  sfx.play('click')
  store.betweenChoice(choice)
  setLog(`⚔ <span class="log-monster">${store.monster?.name || 'Monster'}</span> appears!`)
}

function exitToTitle(): void {
  sfx.play('click')
  store.reset()
}

function replay(): void {
  sfx.play('click')
  store.reset()
  store.setScreen('intro')
  nextTick(renderSprites)
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

onMounted(() => {
  globalStore.setCurrentGame('junk-mage')
  nextTick(renderSprites)
  particleLoop()
})

onUnmounted(() => {
  cancelAnimationFrame(particleRaf)
  particles.length = 0
  store.reset()
  globalStore.setCurrentGame(null)
})
</script>

<template>
  <CircularViewport>
    <div class="junk-mage-game">
      <!-- Boot Screen -->
      <JunkMageBootScreen
        v-if="store.screen === 'boot'"
        @dismiss="handleBootDismiss"
      />

      <!-- Intro/Difficulty Screen -->
      <JunkMageIntroScreen
        v-else-if="store.screen === 'intro'"
        @select="selectDifficulty"
      />

      <!-- Game Screen -->
      <div v-else-if="store.screen === 'game'" class="game-ui" :class="{ shake: screenShaking }">
        <!-- HP Ring SVG -->
        <div class="hp-ring">
          <svg viewBox="0 0 580 580">
            <!-- Monster HP (right side) -->
            <circle class="hp-track" cx="290" cy="290" r="270" stroke-dasharray="200 1496" stroke-dashoffset="100"/>
            <circle
              class="hp-fill monster"
              cx="290" cy="290" r="270"
              :stroke-dasharray="monsterHpArc"
              stroke-dashoffset="100"
            />
            <!-- Mage HP (left side) -->
            <circle class="hp-track" cx="290" cy="290" r="270" stroke-dasharray="200 1496" stroke-dashoffset="-748"/>
            <circle
              class="hp-fill mage"
              cx="290" cy="290" r="270"
              :stroke-dasharray="mageHpArc"
              stroke-dashoffset="-748"
            />
          </svg>
          <!-- HP Text — nested inside .hp-ring so it anchors to the 580 ring
               (matching the reference), landing just below each arc. -->
          <div class="hp-text monster-hp">
            {{ store.monster?.currentHp || 0 }}/{{ store.monster?.maxHp || 0 }}
          </div>
          <div class="hp-text mage-hp">
            {{ store.mageHp }}/{{ store.mageMaxHp }}
          </div>
        </div>

        <!-- Monster Zone -->
        <div class="monster-zone">
          <div class="monster-sprite-wrap">
            <canvas
              ref="monsterCanvasRef"
              width="64"
              height="64"
              class="monster-sprite"
            />
          </div>
          <div class="monster-name">{{ store.monster?.name }}</div>
          <div class="weakness-badge">
            <span>WEAK:</span>
            <div
              class="weakness-dot"
              :style="{ background: getElementColor(store.monster?.weakness || 'spark') }"
            />
          </div>
        </div>

        <!-- Combat Log -->
        <div class="combat-log" :class="{ show: showLog }" v-html="combatLog" />

        <!-- Damage Popups -->
        <div
          v-if="damagePopup.show"
          class="damage-popup"
          :class="[damagePopup.type, damagePopup.target]"
        >
          {{ damagePopup.value }}
        </div>

        <!-- Battle Stage (center) - larger size -->
        <div class="battle-stage">
          <div class="stage-grid" />
          <canvas
            ref="particleCanvasRef"
            class="stage-particles"
            width="280"
            height="280"
          />

          <!-- Spell circles with runes -->
          <div class="spell-circles" v-if="store.selected.length > 0">
            <div class="spell-circle outer" :class="{ active: store.selected.length >= 1 }" :style="{ borderColor: primaryColor }" />
            <div class="spell-circle middle" :class="{ active: store.selected.length >= 1 }" :style="{ borderColor: primaryColor }" />
            <div class="spell-circle inner" :class="{ active: store.selected.length >= 1 }" :style="{ borderColor: primaryColor }" />

            <!-- Spell slots showing selected components -->
            <div class="spell-slots">
              <div
                v-for="(idx, i) in store.selected.slice(0, 3)"
                :key="i"
                class="spell-slot"
                :class="{ active: true }"
                :style="{ borderColor: getElementColor(store.components[idx]?.element || 'spark') }"
              >
                <div class="slot-icon" v-html="getComponentIcon(store.components[idx]?.id || '')" />
              </div>
            </div>

            <!-- Floating runes -->
            <div class="spell-runes">
              <span
                v-for="(rune, i) in spellRunes.slice(0, 6)"
                :key="i"
                class="spell-rune"
                :class="{ active: i < store.selected.length * 2 }"
                :style="{ color: primaryColor }"
              >{{ rune }}</span>
            </div>

            <!-- Spell core glow -->
            <div
              class="spell-core"
              :class="{ active: store.selected.length >= 1 }"
              :style="{ background: primaryColor }"
            >
              <div class="core-icon" :style="{ color: '#fff' }" v-html="ELEMENTS[primaryElement || 'spark']?.svgIcon || ''" />
            </div>
          </div>

          <div v-if="!spellPreview" class="stage-hint">Select 2-3 components</div>
        </div>

        <!-- Spell preview info (sibling of battle-stage so it isn't clipped) -->
        <div v-if="spellPreview" class="spell-info active">
          <div class="spell-name" :style="{ color: primaryColor }">{{ spellPreview.name }}</div>
          <div class="spell-damage">
            {{ spellPreview.damage }} DMG
            <span v-if="spellPreview.weakness" class="spell-bonus">⚡CRIT</span>
          </div>
        </div>

        <!-- Mage Zone -->
        <div class="mage-zone">
          <canvas
            ref="mageCanvasRef"
            width="44"
            height="44"
            class="mage-sprite"
          />
          <div class="mage-label">JUNK MAGE</div>
        </div>

        <!-- Fight info -->
        <div class="info-left">
          <div class="fight-counter">FIGHT {{ store.fightNum }}/{{ store.maxFights }}</div>
          <div class="turn-counter">TURN {{ store.turn }}</div>
          <div class="combo-dots">
            <div class="combo-dot" :class="{ active: store.selected.length >= 1 }" />
            <div class="combo-dot" :class="{ active: store.selected.length >= 2 }" />
            <div class="combo-dot" :class="{ active: store.selected.length >= 3 }" />
          </div>
        </div>

        <div class="info-right">
          <div v-if="store.scouting && store.monsterIntent > 0" class="intent-display">
            ATK: {{ store.monsterIntent }}
          </div>
        </div>

        <!-- Status effects -->
        <div class="status-effects monster-status">
          <span
            v-for="(val, key) in store.monsterStatus"
            :key="key"
            v-show="(val || 0) > 0"
            class="status-effect"
            :class="key"
          >
            {{ String(key).toUpperCase() }} {{ val || 0 }}
          </span>
        </div>
        <div class="status-effects mage-status">
          <span
            v-for="(val, key) in store.mageStatus"
            :key="key"
            v-show="(val || 0) > 0"
            class="status-effect"
            :class="key"
          >
            {{ String(key).toUpperCase() }} {{ val || 0 }}
          </span>
        </div>

        <!-- Action Buttons -->
        <button class="action-btn btn-heal" :disabled="!store.canHeal" @click="healAction">
          <span class="icon">🩹</span>
          <span>+8 HP</span>
        </button>
        <button class="action-btn btn-reroll" :disabled="!store.canReroll" @click="rerollAction">
          <span class="icon">↻</span>
          <span>-{{ store.rerollCost }} HP</span>
        </button>

        <!-- Cast Button -->
        <button
          class="btn-cast"
          :disabled="!store.canCast || animatingCast"
          @click="castSpell"
        >
          <span class="icon">✦</span>
          <span>CAST</span>
        </button>

        <!-- Component Tray (curved) -->
        <div class="component-tray">
          <div class="component-ring">
            <button
              v-for="(comp, i) in store.components"
              :key="i"
              class="component"
              :class="{
                used: comp.used,
                selected: store.selected.includes(i)
              }"
              :style="{
                left: `${componentPositions[i]?.left || 0}px`,
                top: `${componentPositions[i]?.top || 0}px`
              }"
              @click="toggleComponent(i)"
            >
              <div class="comp-element" :style="{ background: getElementColor(comp.element) }" />
              <div class="comp-icon" v-html="getComponentIcon(comp.id)" />
              <span class="comp-name">{{ comp.name }}</span>
            </button>
          </div>
        </div>

        <!-- Turn indicator -->
        <div class="turn-indicator" :class="{ show: showTurnIndicator }">ENEMY TURN</div>

        <!-- Cast flash overlay -->
        <div
          class="cast-flash"
          :class="{ active: castFlashActive }"
          :style="{ '--flash-color': castFlashColor }"
        />
      </div>

      <!-- Result Screens (Between/Victory/Defeat) -->
      <JunkMageResultScreen
        v-else-if="store.screen === 'between' || store.screen === 'victory' || store.screen === 'defeat'"
        @replay="replay"
        @exit="exitToTitle"
        @between-choice="betweenChoice"
      />
      <!-- Inside .junk-mage-game so the green CRT tint vars inherit to the overlay. -->
      <CRTOverlay />
    </div>
  </CircularViewport>
</template>

<style scoped>
.junk-mage-game {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, #1a1a1a 0%, #0a0a0a 70%, #000 100%);
  font-family: 'VT323', monospace;
  color: #e0e0e0;

  /* Junk Mage's green-phosphor CRT tint (the shared CRT defaults to neutral). */
  --crt-bloom-rgb: 0, 255, 136;
  --crt-halation-rgb: 200, 255, 200;
  --crt-tint-rgb: 0, 255, 100;
  --crt-tint-opacity: 1;
}

/* Screens */
.screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 50%;
  z-index: 60;
}

/* Boot Screen */
.boot-screen {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, #1a1a2e 0%, #0a0a12 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  border-radius: 50%;
}

.intro-sigil {
  width: 180px;
  height: 180px;
  position: relative;
}

.intro-sigil .sigil {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.intro-sigil .sigil.active {
  opacity: 1;
}

.intro-sigil .orbit-ring {
  animation: spinOrbitSlow 10s linear infinite;
  transform-origin: center;
}

.intro-sigil .orbital-dots {
  animation: spinOrbitFast 3s linear infinite;
  transform-origin: center;
}

@keyframes spinOrbitSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes spinOrbitFast {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

.intro-sigil .inner-glyph {
  animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 3px #f1c40f); }
  50% { opacity: 1; filter: drop-shadow(0 0 12px #f1c40f); }
}

.intro-title {
  font-family: 'Silkscreen', monospace;
  font-size: 36px;
  color: #f1c40f;
  text-shadow: 0 0 20px #f1c40f, 0 0 40px rgba(241, 196, 15, 0.3);
  margin-top: 25px;
  animation: fadeInUp 0.8s ease 0.3s both;
}

.intro-subtitle {
  font-family: 'VT323', monospace;
  font-size: 20px;
  color: #4ecdc4;
  margin-top: 12px;
  letter-spacing: 2px;
  animation: fadeInUp 0.8s ease 0.6s both;
}

.intro-start {
  font-family: 'Silkscreen', monospace;
  font-size: 16px;
  color: #888;
  margin-top: 40px;
  animation: fadeInUp 0.8s ease 1s both, blinkText 1.5s ease-in-out 2s infinite;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blinkText {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Intro Screen */
.intro-screen {
  background: radial-gradient(circle, #1a1a1a 0%, #000 100%);
}

.intro-mage {
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  margin-bottom: 10px;
}

.screen-title {
  font-family: 'Silkscreen', monospace;
  font-size: 24px;
  margin-bottom: 8px;
}

.accent { color: #ff4444; }

.intro-flavor {
  font-style: italic;
  opacity: 0.6;
  font-size: 14px;
  max-width: 320px;
  line-height: 1.4;
  margin-bottom: 20px;
}

.difficulty-select {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 260px;
}

.diff-btn {
  padding: 14px;
  font-family: 'Silkscreen', monospace;
  font-size: 14px;
  border: 2px solid #444;
  background: #1a1a1a;
  color: #e0e0e0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  border-radius: 8px;
  transition: all 0.2s;
}

.diff-btn:active { background: #333; }
.diff-desc { font-family: 'VT323', monospace; opacity: 0.6; }
.diff-btn.easy .diff-name { color: #44ff88; }
.diff-btn.normal .diff-name { color: #4a9fff; }
.diff-btn.hard .diff-name { color: #ff4444; }
.diff-btn.brutal .diff-name { color: #ffd700; }

.hint {
  font-size: 11px;
  opacity: 0.4;
  margin-top: 12px;
}

/* Game UI */
.game-ui {
  position: relative;
  width: 100%;
  height: 100%;
}

/* HP Ring */
.hp-ring {
  position: absolute;
  width: 580px;
  height: 580px;
  top: 70px;
  left: 70px;
  pointer-events: none;
}

.hp-ring svg {
  width: 100%;
  height: 100%;
}

.hp-track {
  fill: none;
  stroke: #222;
  stroke-width: 12;
}

.hp-fill {
  fill: none;
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dasharray 0.4s ease;
}

.hp-fill.monster {
  stroke: #ff4444;
  filter: drop-shadow(0 0 8px #ff4444);
}

.hp-fill.mage {
  stroke: #44ffaa;
  filter: drop-shadow(0 0 8px #44ffaa);
}

.hp-text {
  position: absolute;
  font-family: 'Silkscreen', monospace;
  font-size: 18px;
  text-shadow: 0 0 12px currentColor;
}

.monster-hp {
  top: 50%;
  right: 45px;
  transform: translateY(60px);
  color: #ff4444;
}

.mage-hp {
  top: 50%;
  left: 45px;
  transform: translateY(60px);
  color: #44ffaa;
}

/* Monster Zone */
.monster-zone {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.monster-sprite-wrap {
  position: relative;
}

.monster-sprite {
  display: block;
  position: static;   /* override the global `canvas{position:absolute}` in main.css */
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.monster-name {
  font-family: 'Silkscreen', monospace;
  font-size: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 0 10px #ff4444;
  color: #ff4444;
}

.weakness-badge {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.9;
}

.weakness-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  box-shadow: 0 0 6px currentColor;
}

/* Combat Log */
.combat-log {
  position: absolute;
  top: 155px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 14px;
  max-width: 280px;
  text-align: center;
  border: 1px solid #333;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 50;
}

.combat-log.show { opacity: 1; }

/* Damage Popup */
.damage-popup {
  position: absolute;
  font-family: 'Silkscreen', monospace;
  font-size: 22px;
  text-shadow: 2px 2px 0 #000;
  pointer-events: none;
  z-index: 20;
  animation: damagePopup 0.7s ease-out forwards;
}

.damage-popup.monster {
  top: 130px;
  left: 50%;
  transform: translateX(-50%);
}

.damage-popup.mage {
  bottom: 310px;
  left: 50%;
  transform: translateX(-50%);
}

.damage-popup.damage { color: #ff4444; }
.damage-popup.heal { color: #44ffaa; }
.damage-popup.crit { color: #ffd700; font-size: 28px; }

@keyframes damagePopup {
  0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.5); }
  20% { transform: translateX(-50%) translateY(-10px) scale(1.2); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-40px) scale(1); }
}

/* Battle Stage - larger size matching original */
.battle-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, #1a1a1a 0%, #111 100%);
  border: 2px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.stage-grid {
  position: absolute;
  inset: 0;
  opacity: 0.1;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 19px, #444 20px),
    repeating-linear-gradient(90deg, transparent, transparent 19px, #444 20px);
  border-radius: 50%;
}

.stage-particles {
  position: absolute;
  inset: 0;
  width: 280px;
  height: 280px;
  pointer-events: none;
  z-index: 2;
}

/* Spell circles */
.spell-circles {
  position: absolute;
  width: 200px;
  height: 200px;
  pointer-events: none;
}

.spell-circle {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.5s, border-color 0.3s;
}

.spell-circle.active { opacity: 1; }

.spell-circle.outer {
  inset: 0;
  border-style: dashed;
  animation: rotateCircle 20s linear infinite;
}
.spell-circle.middle {
  inset: 25px;
  border-style: dotted;
  animation: rotateCircle 15s linear infinite reverse;
}
.spell-circle.inner {
  inset: 50px;
  border-width: 1px;
  animation: rotateCircle 10s linear infinite;
}

@keyframes rotateCircle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Spell slots */
.spell-slots {
  position: absolute;
  width: 200px;
  height: 200px;
  pointer-events: none;
}

.spell-slot {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.3s ease;
}

.spell-slot.active {
  opacity: 1;
  transform: scale(1);
}

.spell-slot:nth-child(1) { top: 10px; left: 50%; margin-left: -14px; }
.spell-slot:nth-child(2) { top: 50%; left: 10px; margin-top: -14px; }
.spell-slot:nth-child(3) { top: 50%; right: 10px; margin-top: -14px; }

.slot-icon {
  width: 16px;
  height: 16px;
}

.slot-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

/* Spell runes */
.spell-runes {
  position: absolute;
  width: 200px;
  height: 200px;
  pointer-events: none;
}

.spell-rune {
  position: absolute;
  font-family: 'VT323', monospace;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.5s;
}

.spell-rune.active { opacity: 0.4; }

.spell-rune:nth-child(1) { top: 35px; left: 35px; }
.spell-rune:nth-child(2) { top: 35px; right: 35px; }
.spell-rune:nth-child(3) { bottom: 35px; left: 35px; }
.spell-rune:nth-child(4) { bottom: 35px; right: 35px; }
.spell-rune:nth-child(5) { top: 50%; left: 35px; transform: translateY(-50%); }
.spell-rune:nth-child(6) { top: 50%; right: 35px; transform: translateY(-50%); }

/* Spell core */
.spell-core {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  opacity: 0;
  transition: all 0.3s;
}

.spell-core.active { opacity: 1; }

.spell-core::before {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: inherit;
  opacity: 0.5;
  filter: blur(12px);
  animation: coreGlow 1.5s ease-in-out infinite;
}

@keyframes coreGlow {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.15); opacity: 0.6; }
}

.core-icon {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 0 6px currentColor);
}

.core-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

/* Spell info */
.spell-info {
  position: absolute;
  top: 210px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  opacity: 0;
  transition: all 0.3s;
  z-index: 10;
}

.spell-info.active { opacity: 1; }

.spell-name {
  font-family: 'Silkscreen', monospace;
  font-size: 18px;
  text-shadow: 0 0 15px currentColor;
}

.spell-damage {
  font-size: 24px;
  color: #ff4444;
  margin-top: 2px;
}

.spell-bonus { color: #ffd700; }

.stage-hint {
  font-size: 16px;
  opacity: 0.5;
}

/* Mage Zone */
.mage-zone {
  position: absolute;
  bottom: 195px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.mage-sprite {
  display: block;
  position: static;   /* override the global `canvas{position:absolute}` in main.css */
  width: 44px;
  height: 44px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.mage-label {
  font-family: 'Silkscreen', monospace;
  font-size: 14px;
  color: #4a9fff;
  text-shadow: 0 0 8px #4a9fff;
}

/* Info displays */
.info-left {
  position: absolute;
  top: 130px;
  left: 130px;
  font-size: 14px;
  text-align: left;
}

.info-right {
  position: absolute;
  top: 130px;
  right: 130px;
  font-size: 14px;
  text-align: right;
}

.fight-counter {
  font-family: 'Silkscreen', monospace;
  font-size: 16px;
  color: #ffd700;
  text-shadow: 0 0 10px #ffd700;
}

.turn-counter {
  font-size: 13px;
  opacity: 0.7;
  margin-top: 4px;
}

.combo-dots {
  display: flex;
  gap: 4px;
  margin-top: 10px;
  justify-content: center;
}

.combo-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #222;
  border: 2px solid #444;
  transition: all 0.2s;
}

.combo-dot.active {
  background: #4a9fff;
  border-color: #6bb3ff;
  box-shadow: 0 0 8px #6bb3ff;
}

.intent-display {
  font-size: 16px;
  color: #ff4444;
  margin-top: 8px;
  text-shadow: 0 0 8px #ff4444;
}

/* Status effects */
.status-effects {
  position: absolute;
  display: flex;
  gap: 3px;
}

.monster-status {
  top: 200px;
  left: 50%;
  transform: translateX(-50%);
}

.mage-status {
  bottom: 310px;
  left: 50%;
  transform: translateX(-50%);
}

.status-effect {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 3px;
}

.status-effect.burn { background: #f64; color: #fff; }
.status-effect.stun { background: #ffdd44; color: #000; }
.status-effect.shield { background: #4a9fff; color: #fff; }
.status-effect.weaken { background: #6666aa; color: #fff; }
.status-effect.armor { background: #a84; color: #fff; }
.status-effect.curse { background: #86a; color: #fff; }
.status-effect.phase { background: #4aa; color: #fff; }

/* Action Buttons */
.action-btn {
  position: absolute;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  border: 2px solid;
  background: rgba(20, 20, 25, 0.95);
  font-family: 'Silkscreen', monospace;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.2s;
}

.action-btn:active { transform: scale(0.95); }
.action-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-heal {
  left: 135px;
  top: 320px;
  border-color: #44ffaa;
  color: #44ffaa;
}

.btn-reroll {
  right: 135px;
  top: 320px;
  border-color: #bb66ff;
  color: #bb66ff;
}

.action-btn .icon { font-size: 18px; }

/* Cast Button - larger and curved */
.btn-cast {
  position: absolute;
  bottom: 140px;
  left: 50%;
  transform: translateX(-50%);
  width: 130px;
  height: 45px;
  background: linear-gradient(180deg, #ff4444 0%, #cc2222 50%, #aa1111 100%);
  border: 3px solid #ff6b6b;
  border-radius: 22px 22px 50% 50%;
  color: #fff;
  font-family: 'Silkscreen', monospace;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 0 30px rgba(255, 68, 68, 0.6), inset 0 -5px 15px rgba(0,0,0,0.3);
  animation: castPulse 2s ease-in-out infinite;
  transition: all 0.2s;
}

.btn-cast:hover {
  transform: translateX(-50%) scale(1.05);
}

.btn-cast:active {
  transform: translateX(-50%) scale(0.98);
}

@keyframes castPulse {
  0%, 100% { box-shadow: 0 0 30px rgba(255, 68, 68, 0.6), inset 0 -5px 15px rgba(0,0,0,0.3); }
  50% { box-shadow: 0 0 50px rgba(255, 68, 68, 0.9), inset 0 -5px 20px rgba(0,0,0,0.2); }
}

.btn-cast:disabled {
  background: linear-gradient(180deg, #333 0%, #222 50%, #1a1a1a 100%);
  border-color: #444;
  box-shadow: none;
  animation: none;
  cursor: not-allowed;
}

.btn-cast .icon { font-size: 20px; }

/* Component Tray - curved layout */
.component-tray {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 440px;
  height: 130px;
}

.component-ring {
  position: absolute;
  width: 100%;
  height: 100%;
}

.component {
  position: absolute;
  width: 65px;
  height: 72px;
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.component:hover {
  background: rgba(50, 50, 60, 0.95);
  border-radius: 8px;
}

.component.selected {
  background: #4a9fff;
  border-radius: 8px;
  box-shadow: 0 0 20px #6bb3ff;
}

.component.selected .comp-icon :deep(svg) { filter: brightness(0) invert(1); }
.component.selected .comp-name { color: #fff; }

.component.used {
  opacity: 0.2;
  pointer-events: none;
}

.comp-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comp-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.comp-name {
  font-size: 9px;
  text-transform: uppercase;
  text-align: center;
  margin-top: 4px;
  color: #e0e0e0;
}

.comp-element {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 5px currentColor;
}

/* Between Screen */
.between-screen {
  background: rgba(0, 0, 0, 0.95);
}

.between-title {
  font-family: 'Silkscreen', monospace;
  color: #44ff88;
  font-size: 20px;
  margin-bottom: 8px;
}

.between-subtitle {
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 16px;
}

.between-hp {
  color: #44ffaa;
  font-size: 18px;
  margin-bottom: 20px;
}

.between-choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 280px;
}

.choice-btn {
  padding: 12px;
  font-family: 'Silkscreen', monospace;
  font-size: 12px;
  border: 2px solid #555;
  background: transparent;
  color: #e0e0e0;
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
}

.choice-btn:active { background: rgba(255,255,255,0.1); }
.choice-title { margin-bottom: 4px; }
.choice-desc { font-family: 'VT323', monospace; opacity: 0.6; font-size: 11px; }

/* Result Screens */
.result-title {
  font-family: 'Silkscreen', monospace;
  font-size: 24px;
  margin-bottom: 16px;
}

.result-title.victory { color: #44ff88; }
.result-title.defeat { color: #ff4444; }

.defeat-text {
  opacity: 0.7;
  margin-bottom: 20px;
  font-size: 14px;
}

.result-stats {
  background: rgba(255,255,255,0.05);
  border: 1px solid #333;
  padding: 12px 24px;
  border-radius: 8px;
  margin: 12px 0;
  min-width: 180px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin: 4px 0;
  font-size: 14px;
}

.stat-label { opacity: 0.6; }
.stat-stars { color: #ffd700; letter-spacing: 3px; }

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.btn-result {
  padding: 10px 20px;
  font-family: 'Silkscreen', monospace;
  font-size: 12px;
  border: 2px solid;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
}

.btn-replay {
  border-color: #bb66ff;
  color: #bb66ff;
}

.btn-exit {
  margin-top: 20px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #555;
  color: #666;
  font-family: 'VT323', monospace;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-exit:hover {
  border-color: #888;
  color: #aaa;
}

.between-screen .btn-exit {
  position: absolute;
  bottom: 60px;
}

/* Colored combat-log segments */
.combat-log .log-player { color: #6bb3ff; }
.combat-log .log-monster { color: #ff6b6b; }
.combat-log .log-damage { color: #ff4444; }
.combat-log .log-effect { color: #bb66ff; }
.combat-log .log-crit { color: #ffd700; }
.combat-log .log-heal { color: #44ffaa; }

/* Turn indicator */
.turn-indicator {
  position: absolute;
  top: 280px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Silkscreen', monospace;
  font-size: 16px;
  color: #ff4444;
  background: rgba(0, 0, 0, 0.95);
  padding: 10px 18px;
  border: 2px solid #ff4444;
  border-radius: 8px;
  z-index: 50;
  display: none;
}

.turn-indicator.show {
  display: block;
  animation: flashIn 0.4s ease;
}

@keyframes flashIn {
  0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
  50% { transform: translateX(-50%) scale(1.1); }
  100% { transform: translateX(-50%) scale(1); }
}

/* Cast flash overlay */
.cast-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, transparent 100%);
  opacity: 0;
  pointer-events: none;
  z-index: 80;
  border-radius: 50%;
}

.cast-flash.active {
  animation: castFlash 0.5s ease-out;
}

@keyframes castFlash {
  0% { opacity: 0; background: radial-gradient(circle at center 70%, var(--flash-color) 0%, transparent 50%); }
  30% { opacity: 0.8; }
  100% { opacity: 0; background: radial-gradient(circle at center 70%, transparent 0%, transparent 100%); }
}

/* Screen shake on monster attack */
.game-ui.shake {
  animation: screenShake 0.3s ease-out;
}

@keyframes screenShake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5px, -3px); }
  20% { transform: translate(5px, 3px); }
  30% { transform: translate(-4px, 2px); }
  40% { transform: translate(4px, -2px); }
  50% { transform: translate(-3px, 3px); }
  60% { transform: translate(3px, -1px); }
  70% { transform: translate(-2px, 2px); }
  80% { transform: translate(2px, -2px); }
  90% { transform: translate(-1px, 1px); }
}
</style>
