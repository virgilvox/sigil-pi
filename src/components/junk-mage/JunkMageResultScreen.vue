<script setup lang="ts">
import { useJunkMageStore } from '@/stores/junk-mage'

type BetweenChoice = 'heal' | 'power' | 'scout'

const store = useJunkMageStore()

const emit = defineEmits<{
  (e: 'replay'): void
  (e: 'exit'): void
  (e: 'between-choice', choice: BetweenChoice): void
}>()
</script>

<template>
  <!-- Between Fights Screen -->
  <div v-if="store.screen === 'between'" class="screen between-screen">
    <h2 class="between-title">ENEMY DEFEATED</h2>
    <p class="between-subtitle">Fight {{ store.fightNum }}/{{ store.maxFights }} Complete</p>
    <p class="between-hp">HP: {{ store.mageHp }}/{{ store.mageMaxHp }}</p>
    <div class="between-choices">
      <button class="choice-btn" @click="emit('between-choice', 'heal')">
        <div class="choice-title">REST</div>
        <div class="choice-desc">Recover HP</div>
      </button>
      <button class="choice-btn" @click="emit('between-choice', 'power')">
        <div class="choice-title">POWER</div>
        <div class="choice-desc">+25% damage, no heal</div>
      </button>
      <button class="choice-btn" @click="emit('between-choice', 'scout')">
        <div class="choice-title">SCOUT</div>
        <div class="choice-desc">See attacks, +5 HP</div>
      </button>
    </div>
    <button class="btn-exit" @click="emit('exit')">EXIT TO TITLE</button>
  </div>

  <!-- Victory Screen -->
  <div v-else-if="store.screen === 'victory'" class="screen victory-screen">
    <h1 class="result-title victory">VICTORY</h1>
    <div class="result-stats">
      <div class="stat-row">
        <span class="stat-label">RATING</span>
        <span class="stat-stars">{{ '\u2605'.repeat(store.getRating()) }}{{ '\u2606'.repeat(3 - store.getRating()) }}</span>
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
    <div class="result-actions">
      <button class="btn-result btn-replay" @click="emit('replay')">AGAIN</button>
    </div>
    <button class="btn-exit" @click="emit('exit')">TITLE</button>
  </div>

  <!-- Defeat Screen -->
  <div v-else-if="store.screen === 'defeat'" class="screen defeat-screen">
    <h1 class="result-title defeat">DEFEATED</h1>
    <p class="defeat-text">
      {{ store.mageHp <= 0 ? `${store.monster?.name} overwhelmed you.` : 'Ran out of components.' }}
    </p>
    <button class="btn-result btn-replay" @click="emit('replay')">TRY AGAIN</button>
    <button class="btn-exit" @click="emit('exit')">TITLE</button>
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
}

/* Between fights */
.between-screen {
  background: radial-gradient(circle at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 100%);
}

.between-title {
  font-family: 'Silkscreen', monospace;
  font-size: 28px;
  color: #4ecdc4;
  margin: 0 0 5px;
  text-shadow: 0 0 10px #4ecdc4;
}

.between-subtitle {
  font-size: 16px;
  color: #888;
  margin: 0 0 10px;
}

.between-hp {
  font-size: 20px;
  color: #44ffaa;
  margin: 0 0 20px;
}

.between-choices {
  display: flex;
  gap: 15px;
}

.choice-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0,0,0,0.6);
  border: 2px solid #4ecdc4;
  border-radius: 10px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.choice-btn:hover {
  background: rgba(78, 205, 196, 0.2);
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
}

.choice-title {
  font-size: 18px;
  color: #4ecdc4;
  margin-bottom: 5px;
}

.choice-desc {
  font-size: 11px;
  color: #888;
}

/* Result screens */
.victory-screen {
  background: radial-gradient(circle at center, rgba(0, 50, 30, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%);
}

.defeat-screen {
  background: radial-gradient(circle at center, rgba(50, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%);
}

.result-title {
  font-family: 'Silkscreen', monospace;
  font-size: 48px;
  margin: 0 0 20px;
}

.result-title.victory {
  color: #44ff88;
  text-shadow: 0 0 20px #44ff88, 0 0 40px #44ff88;
}

.result-title.defeat {
  color: #ff4444;
  text-shadow: 0 0 20px #ff4444, 0 0 40px #ff4444;
}

.result-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 30px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  font-size: 18px;
}

.stat-label {
  color: #888;
}

.stat-stars {
  color: #ffd700;
  font-size: 24px;
}

.defeat-text {
  font-size: 16px;
  color: #888;
  margin: 0 0 30px;
}

.result-actions {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.btn-result {
  padding: 12px 40px;
  font-family: 'Silkscreen', monospace;
  font-size: 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-replay {
  background: #4ecdc4;
  color: #000;
}

.btn-replay:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px #4ecdc4;
}

.btn-exit {
  background: transparent;
  border: 1px solid #666;
  color: #888;
  padding: 8px 20px;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  border-radius: 5px;
  margin-top: 10px;
}

.btn-exit:hover {
  border-color: #4ecdc4;
  color: #4ecdc4;
}
</style>
