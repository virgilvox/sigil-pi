<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useJunkMageStore } from '@/stores/junk-mage'
import { drawMonster, type Monster } from '@/data/monsters'

type BetweenChoice = 'heal' | 'power' | 'scout'

const store = useJunkMageStore()

const emit = defineEmits<{
  (e: 'replay'): void
  (e: 'exit'): void
  (e: 'between-choice', choice: BetweenChoice): void
}>()

const victorySpriteRef = ref<HTMLCanvasElement | null>(null)
const defeatSpriteRef = ref<HTMLCanvasElement | null>(null)

function shareResults(): void {
  const text = store.getShareText()
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }
}

function renderSprite(): void {
  if (!store.monster) return
  const canvas = store.screen === 'victory' ? victorySpriteRef.value : defeatSpriteRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (ctx) drawMonster(ctx, store.monster as Monster, 60)
}

watch(() => store.screen, () => {
  nextTick(renderSprite)
})

onMounted(() => {
  nextTick(renderSprite)
})
</script>

<template>
  <!-- Between Fights Screen -->
  <div v-if="store.screen === 'between'" class="screen between-screen">
    <h2 class="between-title">ENEMY DEFEATED</h2>
    <p class="between-subtitle">Fight {{ store.fightNum }}/{{ store.maxFights }} Complete</p>
    <p class="between-hp">HP: {{ store.mageHp }}/{{ store.mageMaxHp }}</p>
    <div class="between-choices">
      <button class="choice-btn" @click="emit('between-choice', 'heal')">
        <div class="choice-title">🩹 REST</div>
        <div class="choice-desc">Recover HP</div>
      </button>
      <button class="choice-btn" @click="emit('between-choice', 'power')">
        <div class="choice-title">⚡ POWER</div>
        <div class="choice-desc">+25% damage, no heal</div>
      </button>
      <button class="choice-btn" @click="emit('between-choice', 'scout')">
        <div class="choice-title">🔍 SCOUT</div>
        <div class="choice-desc">See attacks, +5 HP</div>
      </button>
    </div>
    <button class="btn-exit" @click="emit('exit')">← EXIT TO TITLE</button>
  </div>

  <!-- Victory Screen -->
  <div v-else-if="store.screen === 'victory'" class="screen victory-screen">
    <canvas ref="victorySpriteRef" width="60" height="60" class="result-sprite" />
    <h1 class="result-title victory">VICTORY</h1>
    <div class="result-stats">
      <div class="stat-row">
        <span class="stat-label">RATING</span>
        <span class="stat-stars">{{ '★'.repeat(store.getRating()) }}{{ '☆'.repeat(3 - store.getRating()) }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">FIGHTS</span>
        <span>{{ store.maxFights }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">DAMAGE</span>
        <span>{{ store.totalDamage }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">HP LEFT</span>
        <span>{{ store.mageHp }}/{{ store.mageMaxHp }}</span>
      </div>
    </div>
    <div class="share-preview">{{ store.getShareText() }}</div>
    <div class="result-actions">
      <button class="btn-result btn-share" @click="shareResults">SHARE</button>
      <button class="btn-result btn-replay" @click="emit('replay')">AGAIN</button>
    </div>
    <button class="btn-exit" @click="emit('exit')">← TITLE</button>
  </div>

  <!-- Defeat Screen -->
  <div v-else-if="store.screen === 'defeat'" class="screen defeat-screen">
    <canvas ref="defeatSpriteRef" width="60" height="60" class="result-sprite" />
    <h1 class="result-title defeat">DEFEATED</h1>
    <p class="defeat-text">
      {{ store.mageHp <= 0 ? `${store.monster?.name} overwhelmed you.` : 'The junk drawer wasn\'t enough.' }}
    </p>
    <button class="btn-result btn-replay" @click="emit('replay')">TRY AGAIN</button>
    <button class="btn-exit" @click="emit('exit')">← TITLE</button>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Silkscreen:wght@400;700&display=swap');

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
  font-family: 'VT323', monospace;
  color: #e0e0e0;
  background: radial-gradient(circle, #1a1a1a 0%, #000 100%);
}

/* Between fights */
.between-screen { background: rgba(0, 0, 0, 0.95); }

.between-title {
  color: #44ff88;
  font-size: 20px;
  margin: 0 0 8px;
}

.between-subtitle {
  font-size: 14px;
  opacity: 0.7;
  margin: 0 0 16px;
}

.between-hp {
  color: #44ffaa;
  font-size: 18px;
  margin: 0 0 20px;
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

.choice-btn:active { background: rgba(255, 255, 255, 0.1); }
.choice-title { margin-bottom: 4px; }
.choice-desc { font-family: 'VT323', monospace; opacity: 0.6; font-size: 11px; }

.between-screen .btn-exit {
  position: absolute;
  bottom: 60px;
}

/* Result screens */
.result-sprite {
  width: 60px;
  height: 60px;
  image-rendering: pixelated;
  margin-bottom: 10px;
  opacity: 0.5;
}

.result-title {
  font-family: 'Silkscreen', monospace;
  font-size: 24px;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.result-title.victory { color: #44ff88; }
.result-title.defeat { color: #ff4444; }

.result-stats {
  background: rgba(255, 255, 255, 0.05);
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

.share-preview {
  background: #000;
  padding: 8px 12px;
  font-family: monospace;
  font-size: 11px;
  border-radius: 4px;
  white-space: pre;
  margin: 8px 0;
}

.defeat-text {
  opacity: 0.7;
  margin-bottom: 20px;
  font-size: 14px;
}

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

.btn-share { border-color: #44ff88; color: #44ff88; }
.btn-replay { border-color: #bb66ff; color: #bb66ff; }

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
</style>
