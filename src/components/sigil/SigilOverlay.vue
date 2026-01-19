<script setup lang="ts">
import { computed } from 'vue'
import { PLAYER_COLORS } from '@/data/spells'

interface Props {
  type: 'start' | 'end'
  winner?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  winner: null
})

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'restart'): void
}>()

const winnerName = computed(() => {
  if (props.winner === null) return ''
  return props.winner === 0 ? 'EMBER WINS' : 'FROST WINS'
})

const winnerColor = computed(() => {
  if (props.winner === null) return '#d4d0c4'
  return PLAYER_COLORS[props.winner].pri
})

function handleClick(): void {
  if (props.type === 'start') {
    emit('start')
  } else {
    emit('restart')
  }
}
</script>

<template>
  <div class="overlay">
    <template v-if="type === 'start'">
      <div class="title">SIGIL</div>
      <div class="subtitle">A CIRCULAR DUEL</div>
      <button class="btn" @click="handleClick">BEGIN</button>
    </template>
    <template v-else>
      <div class="title" :style="{ color: winnerColor }">{{ winnerName }}</div>
      <div class="subtitle">THE DUEL IS DECIDED</div>
      <button class="btn" @click="handleClick">AGAIN</button>
    </template>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  background: rgba(6, 6, 10, 0.97);
  border-radius: 50%;
}

.title {
  font-size: min(12vw, 80px);
  font-weight: bold;
  letter-spacing: 0.4em;
  color: #d4d0c4;
  text-shadow: 0 0 40px rgba(212, 208, 196, 0.3);
  margin-bottom: 3%;
}

.subtitle {
  font-size: min(2vw, 14px);
  letter-spacing: 0.3em;
  color: #6a5c8a;
  margin-bottom: 6%;
}

.btn {
  padding: 2% 6%;
  font-size: min(2.5vw, 18px);
  letter-spacing: 0.2em;
  background: transparent;
  border: 1px solid #d4d0c4;
  color: #d4d0c4;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 3%;
  font-family: 'Courier New', monospace;
}

.btn:hover {
  background: rgba(212, 208, 196, 0.1);
}
</style>
