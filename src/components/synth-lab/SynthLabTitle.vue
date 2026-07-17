<script setup lang="ts">
// The tap here is the user gesture that boots the audio engine.
const emit = defineEmits<{ start: [] }>()
</script>

<template>
  <div class="title" @pointerdown.prevent="emit('start')">
    <div class="aura"></div>
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
  background: radial-gradient(circle at 50% 42%, #14102a 0%, #0c0a1a 55%, #060410 100%);
  border-radius: 50%; cursor: pointer; font-family: 'Courier New', monospace; color: #d8d3e4;
}
.aura {
  position: absolute; left: 50%; top: 50%; width: 480px; height: 480px; margin: -240px 0 0 -240px; border-radius: 50%;
  background: conic-gradient(from 0deg, #ff6b5c, #ffb347, #5fe08a, #3ad6e6, #5c9bff, #b47cff, #ff5ca8, #ff6b5c);
  filter: blur(64px); opacity: 0.22; animation: aura-spin 40s linear infinite;
}
@keyframes aura-spin { to { transform: rotate(360deg); } }
.rings { position: absolute; inset: 0; }
.r { position: absolute; left: 50%; top: 50%; border-radius: 50%; transform: translate(-50%, -50%); }
.r1 { width: 250px; height: 250px; border: 1px solid rgba(180,124,255,0.20); animation: spin 34s linear infinite; }
.r2 { width: 400px; height: 400px; border: 1px solid rgba(58,214,230,0.12); animation: spin 54s linear infinite reverse; }
.r3 { width: 540px; height: 540px; border: 1px solid rgba(255,127,208,0.08); animation: spin 84s linear infinite; }
@keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
.mark { font-size: 60px; color: #eadfff; text-shadow: 0 0 40px rgba(180,124,255,0.7), 0 0 70px rgba(58,214,230,0.3); z-index: 1; }
.name {
  font-size: 38px; font-weight: bold; letter-spacing: 0.34em; text-indent: 0.34em; z-index: 1;
  background: linear-gradient(100deg, #c8e6ff, #f4f1ea 42%, #ffd6f2 72%, #c9b8ff);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 22px rgba(180,124,255,0.35));
}
.sub { font-size: 11px; letter-spacing: 0.4em; color: rgba(200,190,235,0.5); z-index: 1; }
.cta { margin-top: 26px; font-size: 12px; letter-spacing: 0.35em; color: #5fe08a; text-shadow: 0 0 14px rgba(95,224,138,0.6); animation: pulse 1.8s ease-in-out infinite; z-index: 1; }
@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .aura, .r, .cta { animation: none; } }
</style>
