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
        <span class="diff-desc">50 HP - 3 Fights</span>
      </button>
      <button class="diff-btn normal" @click="selectDifficulty('normal')">
        <span class="diff-name">NORMAL</span>
        <span class="diff-desc">40 HP - 3 Fights</span>
      </button>
      <button class="diff-btn hard" @click="selectDifficulty('hard')">
        <span class="diff-name">HARD</span>
        <span class="diff-desc">35 HP - 3 Fights</span>
      </button>
      <button class="diff-btn brutal" @click="selectDifficulty('brutal')">
        <span class="diff-name">BRUTAL</span>
        <span class="diff-desc">30 HP - 4 Fights</span>
      </button>
    </div>
    <p class="hint">HP carries between fights</p>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Silkscreen:wght@400;700&display=swap');

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
  font-size: 36px;
  margin: 0 0 5px;
  color: #fff;
}

.screen-title .accent {
  color: #4ecdc4;
}

.intro-flavor {
  font-size: 14px;
  color: #888;
  font-style: italic;
  max-width: 280px;
  margin: 0 0 20px;
}

.difficulty-select {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diff-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 40px;
  background: rgba(0,0,0,0.5);
  border: 2px solid;
  border-radius: 8px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.diff-btn.easy { border-color: #44ff88; }
.diff-btn.normal { border-color: #4a9fff; }
.diff-btn.hard { border-color: #ff4444; }
.diff-btn.brutal { border-color: #ffd700; }

.diff-btn:hover {
  transform: scale(1.05);
}

.diff-btn.easy:hover { background: rgba(68, 255, 136, 0.2); box-shadow: 0 0 20px rgba(68, 255, 136, 0.5); }
.diff-btn.normal:hover { background: rgba(74, 159, 255, 0.2); box-shadow: 0 0 20px rgba(74, 159, 255, 0.5); }
.diff-btn.hard:hover { background: rgba(255, 68, 68, 0.2); box-shadow: 0 0 20px rgba(255, 68, 68, 0.5); }
.diff-btn.brutal:hover { background: rgba(255, 215, 0, 0.2); box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }

.diff-name {
  font-size: 20px;
  font-weight: bold;
}

.diff-btn.easy .diff-name { color: #44ff88; }
.diff-btn.normal .diff-name { color: #4a9fff; }
.diff-btn.hard .diff-name { color: #ff4444; }
.diff-btn.brutal .diff-name { color: #ffd700; }

.diff-desc {
  font-size: 12px;
  color: #888;
}

.hint {
  font-size: 12px;
  color: #666;
  margin-top: 20px;
}
</style>
