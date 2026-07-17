<script setup lang="ts">
// The tap here is the user gesture that boots the audio engine.
const emit = defineEmits<{ start: [] }>()
</script>

<template>
  <div class="title" @pointerdown.prevent="emit('start')">
    <div class="rings"><span class="r r1"></span><span class="r r2"></span><span class="r r3"></span></div>
    <div class="mark">⌬</div>
    <div class="name">SYNTH LAB</div>
    <div class="sub">BENCH · PLAY · SEQ</div>
    <div class="cta">TAP TO POWER ON</div>
  </div>
</template>

<style scoped>
.title {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  background: radial-gradient(circle at center, #0b0b14 0%, #050508 70%);
  border-radius: 50%; cursor: pointer; font-family: 'Courier New', monospace; color: #d4d0c4;
}
.rings { position: absolute; inset: 0; }
.r { position: absolute; left: 50%; top: 50%; border-radius: 50%; transform: translate(-50%, -50%); }
.r1 { width: 250px; height: 250px; border: 1px solid rgba(212,208,196,0.14); animation: spin 34s linear infinite; }
.r2 { width: 400px; height: 400px; border: 1px solid rgba(76,201,160,0.08); animation: spin 54s linear infinite reverse; }
.r3 { width: 540px; height: 540px; border: 1px solid rgba(60,142,232,0.06); animation: spin 84s linear infinite; }
@keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
.mark { font-size: 66px; color: #d4d0c4; text-shadow: 0 0 40px rgba(212,208,196,0.5); }
.name { font-size: 38px; font-weight: bold; letter-spacing: 0.34em; text-indent: 0.34em; }
.sub { font-size: 11px; letter-spacing: 0.4em; color: rgba(212,208,196,0.45); }
.cta { margin-top: 26px; font-size: 12px; letter-spacing: 0.35em; color: rgba(76,201,160,0.85); animation: pulse 1.8s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
</style>
