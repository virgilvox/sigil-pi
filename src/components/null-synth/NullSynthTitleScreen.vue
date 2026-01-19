<script setup lang="ts">
const emit = defineEmits<{
  (e: 'start'): void
}>()
</script>

<template>
  <div class="title-overlay">
    <div class="title-main">NULL SYNTH</div>
    <div class="title-sub">SIGIL SOUND MACHINE</div>
    <div class="title-instructions">
      <div><kbd>A</kbd> - <kbd>L</kbd> PLAY NOTES</div>
      <div><kbd>1</kbd> - <kbd>6</kbd> SUITS</div>
      <div><kbd>↑</kbd> <kbd>↓</kbd> BPM</div>
      <div><kbd>SPACE</kbd> PLAY</div>
    </div>
    <button class="title-prompt" @click="emit('start')">START</button>
  </div>
</template>

<style scoped>
.title-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  background: radial-gradient(ellipse at center, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.9) 100%);
  border-radius: 50%;
  font-family: 'Courier New', monospace;
}

.title-main {
  font-size: 48px;
  letter-spacing: 16px;
  color: #00ff88;
  text-shadow: 0 0 30px #00ff88, 0 0 60px #00ff88;
  margin-bottom: 10px;
}

.title-sub {
  font-size: 10px;
  letter-spacing: 8px;
  color: rgba(255,255,255,0.4);
  margin-bottom: 40px;
}

.title-instructions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 30px;
}

.title-instructions kbd {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(0,255,136,0.1);
  border: 1px solid rgba(0,255,136,0.3);
  border-radius: 3px;
  color: #00ff88;
  font-family: inherit;
}

.title-prompt {
  padding: 15px 50px;
  font-size: 18px;
  letter-spacing: 6px;
  background: transparent;
  border: 2px solid #00ff88;
  color: #00ff88;
  cursor: pointer;
  transition: all 0.3s;
  font-family: 'Courier New', monospace;
}

.title-prompt:hover {
  background: rgba(0,255,136,0.1);
  box-shadow: 0 0 30px rgba(0,255,136,0.3);
}
</style>
