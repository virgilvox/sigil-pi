<script setup lang="ts">
// Title overlay. The tap here is the user gesture that boots the audio engine.
const emit = defineEmits<{ start: [] }>()
</script>

<template>
  <div class="title" @pointerdown.prevent="emit('start')">
    <div class="rings">
      <span class="r r1"></span>
      <span class="r r2"></span>
      <span class="r r3"></span>
    </div>
    <div class="mark">☉</div>
    <div class="name">ORRERY</div>
    <div class="sub">RADIAL SEQUENCER</div>
    <div class="cta">TAP TO BEGIN</div>
  </div>
</template>

<style scoped>
.title {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: radial-gradient(circle at center, #0b0b14 0%, #050508 70%);
  border-radius: 50%;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  color: #d4d0c4;
}
.rings { position: absolute; inset: 0; }
.r {
  position: absolute; left: 50%; top: 50%;
  border-radius: 50%; border: 1px solid rgba(232,161,60,0.14);
  transform: translate(-50%, -50%);
}
.r1 { width: 260px; height: 260px; animation: spin 30s linear infinite; }
.r2 { width: 400px; height: 400px; border-color: rgba(212,208,196,0.08); animation: spin 50s linear infinite reverse; }
.r3 { width: 540px; height: 540px; border-color: rgba(60,142,232,0.06); animation: spin 80s linear infinite; }
@keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
.mark { font-size: 64px; color: #e8a13c; text-shadow: 0 0 40px rgba(232,161,60,0.5); }
.name { font-size: 40px; font-weight: bold; letter-spacing: 0.42em; text-indent: 0.42em; }
.sub { font-size: 11px; letter-spacing: 0.45em; color: rgba(212,208,196,0.45); }
.cta {
  margin-top: 26px; font-size: 12px; letter-spacing: 0.35em;
  color: rgba(232,161,60,0.85); animation: pulse 1.8s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
</style>
