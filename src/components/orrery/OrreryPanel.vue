<script setup lang="ts">
import { useOrreryStore } from '@/stores/orrery'

// Control overlay (opened by the ⚙ chip): per-track sound/mute/solo/clear plus
// global tempo, swing, and session save/load. Big touch targets for the panel.
const store = useOrreryStore()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="panel-root">
    <div class="backdrop" @pointerdown="emit('close')"></div>
    <div class="panel">
      <div class="head">
        <span class="ttl">SESSION</span>
        <button class="x" @click="emit('close')">✕</button>
      </div>

      <!-- transport row -->
      <div class="row global">
        <div class="ctl-group">
          <span class="lbl">BPM</span>
          <button class="mini" @click="store.setBpm(store.bpm - 1)">−</button>
          <span class="val">{{ store.bpm }}</span>
          <button class="mini" @click="store.setBpm(store.bpm + 1)">+</button>
        </div>
        <div class="ctl-group">
          <span class="lbl">SWING</span>
          <button class="mini" @click="store.setSwing(store.swing - 0.04)">−</button>
          <span class="val">{{ Math.round(store.swing * 100) }}%</span>
          <button class="mini" @click="store.setSwing(store.swing + 0.04)">+</button>
        </div>
      </div>

      <!-- per-track -->
      <div class="tracks">
        <div v-for="(tr, t) in store.tracks" :key="tr.id" class="trk" :style="{ '--c': tr.color }">
          <span class="dot"></span>
          <span class="name">{{ tr.label }}</span>
          <button class="sound" @click="store.cycleSound(t, 1)">{{ store.currentSoundLabel(t) }} ▸</button>
          <button class="tg" :class="{ on: tr.muted }" @click="store.toggleMute(t)">M</button>
          <button class="tg solo" :class="{ on: tr.solo }" @click="store.toggleSolo(t)">S</button>
          <button class="tg" @click="store.clearTrack(t)">⌫</button>
        </div>
      </div>

      <!-- session -->
      <div class="row session">
        <button class="wide" @click="store.save()">SAVE</button>
        <button class="wide" @click="store.load()">LOAD</button>
        <button class="wide danger" @click="store.clearAll()">CLEAR ALL</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-root { position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; }
.backdrop { position: absolute; inset: 0; background: rgba(5,5,8,0.86); backdrop-filter: blur(3px); }
.panel {
  position: relative; z-index: 1; width: 74%; max-width: 480px;
  display: flex; flex-direction: column; gap: 12px;
  font-family: 'Courier New', monospace; color: #d4d0c4;
}
.head { display: flex; align-items: center; justify-content: space-between; }
.ttl { font-size: 16px; letter-spacing: 0.35em; }
.x { background: none; border: 1px solid rgba(212,208,196,0.3); color: #d4d0c4; width: 34px; height: 34px; border-radius: 50%; font-size: 14px; cursor: pointer; }
.row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.ctl-group { display: flex; align-items: center; gap: 8px; }
.lbl { font-size: 10px; letter-spacing: 0.2em; color: rgba(212,208,196,0.5); }
.val { min-width: 44px; text-align: center; font-size: 15px; }
.mini { width: 34px; height: 34px; border-radius: 8px; background: rgba(212,208,196,0.06); border: 1px solid rgba(212,208,196,0.25); color: #d4d0c4; font-size: 18px; cursor: pointer; }
.tracks { display: flex; flex-direction: column; gap: 7px; }
.trk { display: flex; align-items: center; gap: 8px; }
.dot { width: 12px; height: 12px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); flex: none; }
.trk .name { width: 62px; font-size: 11px; letter-spacing: 0.12em; }
.sound { flex: 1; text-align: left; padding: 8px 12px; background: color-mix(in srgb, var(--c) 12%, rgba(10,10,15,0.7)); border: 1px solid var(--c); color: var(--c); font-size: 11px; letter-spacing: 0.12em; border-radius: 8px; cursor: pointer; }
.tg { width: 34px; height: 34px; border-radius: 8px; background: rgba(212,208,196,0.05); border: 1px solid rgba(212,208,196,0.22); color: rgba(212,208,196,0.75); font-size: 12px; cursor: pointer; flex: none; }
.tg.on { background: var(--c); border-color: var(--c); color: #06060a; }
.tg.solo.on { background: #d9d089; border-color: #d9d089; }
.session { margin-top: 4px; }
.wide { flex: 1; padding: 12px; background: rgba(212,208,196,0.06); border: 1px solid rgba(212,208,196,0.28); color: #d4d0c4; letter-spacing: 0.2em; font-size: 11px; border-radius: 8px; cursor: pointer; }
.wide.danger { border-color: rgba(232,90,60,0.5); color: #e85a3c; }
</style>
