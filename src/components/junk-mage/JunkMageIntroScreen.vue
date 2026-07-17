<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { drawMage } from '@/data/monsters'

type Difficulty = 'easy' | 'normal' | 'hard' | 'brutal'

const emit = defineEmits<{
  (e: 'select', difficulty: Difficulty): void
}>()

const mageCanvasRef = ref<HTMLCanvasElement | null>(null)

function selectDifficulty(diff: Difficulty): void {
  emit('select', diff)
}

function renderMage(): void {
  if (mageCanvasRef.value) {
    const ctx = mageCanvasRef.value.getContext('2d')
    if (ctx) {
      drawMage(ctx, 80, false)
    }
  }
}

onMounted(() => {
  renderMage()
})
</script>

<template>
  <div class="intro-screen">
    <canvas
      ref="mageCanvasRef"
      width="80"
      height="80"
      class="intro-mage"
    />
    <h1 class="screen-title">JUNK <span class="accent">MAGE</span></h1>
    <p class="intro-flavor">"Academy components cost 200 gold. I got busted electronics and spite."</p>
    <div class="difficulty-select">
      <button class="diff-btn easy" @click="selectDifficulty('easy')">
        <span class="diff-name">EASY</span>
        <span class="diff-desc">50 HP • 3 Fights</span>
      </button>
      <button class="diff-btn normal" @click="selectDifficulty('normal')">
        <span class="diff-name">NORMAL</span>
        <span class="diff-desc">40 HP • 3 Fights</span>
      </button>
      <button class="diff-btn hard" @click="selectDifficulty('hard')">
        <span class="diff-name">HARD</span>
        <span class="diff-desc">35 HP • 3 Fights</span>
      </button>
      <button class="diff-btn brutal" @click="selectDifficulty('brutal')">
        <span class="diff-name">BRUTAL</span>
        <span class="diff-desc">30 HP • 4 Fights</span>
      </button>
    </div>
    <p class="hint">HP carries between fights</p>
  </div>
</template>

<style scoped>
.intro-screen {
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
}

.intro-mage {
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
  margin-bottom: 10px;
}

.screen-title {
  font-family: 'Silkscreen', monospace;
  font-size: 24px;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.screen-title .accent {
  color: #ff4444;
}

.intro-flavor {
  font-style: italic;
  opacity: 0.6;
  font-size: 14px;
  max-width: 320px;
  line-height: 1.4;
  margin: 0 0 20px;
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

.diff-desc {
  font-family: 'VT323', monospace;
  opacity: 0.6;
}

.diff-btn.easy .diff-name { color: #44ff88; }
.diff-btn.normal .diff-name { color: #4a9fff; }
.diff-btn.hard .diff-name { color: #ff4444; }
.diff-btn.brutal .diff-name { color: #ffd700; }

.hint {
  font-size: 11px;
  opacity: 0.4;
  margin-top: 12px;
}
</style>
