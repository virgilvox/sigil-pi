<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { useComposerStore } from '@/stores/composer'
import { CENTER, polar, indexAngle, wedgeMidAngle, angleFromTop, distFromCenter, ringSector } from '@/components/synth-lab/geometry'
import { STEPS } from '@/composables/useComposer'
import { withAlpha, stageGradient, engineColor } from '@/styles/palette'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'

// A round-LCD translation of the bellows workbench generative composer: six
// auto-generated voice tracks shown as concentric 16-step lamp rings, a
// transport hub, mood + compose + evolve, and a per-track voice-strip sheet.

const globalStore = useGlobalStore()
const store = useComposerStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const surfRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0

const started = ref(false)
const showTune = ref(false)

const TRACK_COLOR: Record<string, string> = {
  bass: '#ff6b5c', keys: '#ffb347', pad: '#b47cff', chime: '#3ad6e6', kit: '#ff5ca8', texture: '#5fe08a'
}
const MOOD_COLOR: Record<string, string> = {
  EMBER: '#ff6b5c', DRAW: '#4cc7c0', TEMPER: '#ffb347', BILLOW: '#5fe08a', QUENCH: '#b47cff', STRIKE: '#ff5ca8'
}
const RING_R = [272, 242, 212, 182, 152, 122]
const BAND = 24, HUB_R = 92

const rings = computed(() => store.piece.tracks.map((t, i) => ({ track: t, r: RING_R[i] ?? 120 })))
const selTrack = computed(() => store.selectedTrack ? store.trackById(store.selectedTrack) : null)
const moodColor = computed(() => MOOD_COLOR[store.piece.mood] ?? '#b47cff')

let alive = true
async function start(): Promise<void> {
  try {
    await store.boot()
    if (!alive) { store.dispose(); return }
    started.value = true
  } catch (e) { console.error('[composer] boot failed', e) }
}

function toLocal(e: PointerEvent): { x: number; y: number } {
  const r = surfRef.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / r.width * 720, y: (e.clientY - r.top) / r.height * 720 }
}
function onDown(e: PointerEvent): void {
  e.preventDefault()
  const { x, y } = toLocal(e)
  const d = distFromCenter(x, y)
  if (d < HUB_R) { store.togglePlay(); return }
  // which ring?
  let best = -1, bestGap = 22
  rings.value.forEach((rg, i) => { const g = Math.abs(d - rg.r); if (g < bestGap) { bestGap = g; best = i } })
  if (best >= 0) {
    const id = rings.value[best].track.id
    store.selectTrack(store.selectedTrack === id ? null : id)
  }
}

function draw(): void {
  raf = requestAnimationFrame(draw)
  if (!ctx) return
  store.tickReadout()
  const cur = store.currentStep()
  ctx.clearRect(0, 0, 720, 720)
  ctx.fillStyle = stageGradient(ctx, CENTER, CENTER, 360, moodColor.value)
  ctx.fillRect(0, 0, 720, 720)

  const gap = 0.018
  for (const rg of rings.value) {
    const tr = rg.track
    const col = TRACK_COLOR[tr.id] ?? '#b9b3d0'
    const sel = store.selectedTrack === tr.id
    for (let s = 0; s < STEPS; s++) {
      const a0 = indexAngle(s, STEPS) + gap, a1 = indexAngle(s + 1, STEPS) - gap
      const on = !!tr.pattern[s]
      const isNow = cur === s
      ringSector(ctx, rg.r, BAND, a0, a1)
      if (on && !tr.mute) {
        ctx.fillStyle = withAlpha(col, isNow ? 1 : 0.5)
        ctx.fill()
        ctx.shadowColor = col; ctx.shadowBlur = isNow ? 20 : 6; ctx.fill(); ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = on ? withAlpha(col, 0.14) : (s % 4 === 0 ? 'rgba(190,178,235,0.10)' : 'rgba(190,178,235,0.04)')
        ctx.fill()
      }
      if (isNow && !on) { ctx.strokeStyle = 'rgba(244,241,234,0.4)'; ctx.lineWidth = 1; ctx.stroke() }
    }
    // selection rim
    if (sel) {
      ringSector(ctx, rg.r, BAND + 6, indexAngle(0, 1), indexAngle(1, 1))
      ctx.strokeStyle = withAlpha(col, 0.9); ctx.lineWidth = 1.5; ctx.stroke()
    }
    // label at top of ring
    const p = polar(rg.r, -Math.PI / 2)
    ctx.fillStyle = tr.mute ? 'rgba(190,178,235,0.3)' : withAlpha(col, 0.95)
    ctx.font = 'bold 8px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(tr.name, p.x, p.y)
  }

  // hub
  ctx.beginPath(); ctx.arc(CENTER, CENTER, HUB_R, 0, Math.PI * 2)
  const hub = ctx.createRadialGradient(CENTER, CENTER - 18, 8, CENTER, CENTER, HUB_R)
  hub.addColorStop(0, 'rgba(24,20,44,0.96)'); hub.addColorStop(1, 'rgba(12,10,24,0.92)')
  ctx.fillStyle = hub; ctx.fill()
  ctx.strokeStyle = withAlpha(moodColor.value, 0.45); ctx.lineWidth = 1.5; ctx.stroke()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = store.playing ? '#5fe08a' : withAlpha('#f4f1ea', 0.9); ctx.font = '24px "Courier New", monospace'
  ctx.fillText(store.playing ? '❚❚' : '▶', CENTER, CENTER - 26)
  ctx.fillStyle = '#f4f1ea'; ctx.font = 'bold 20px "Courier New", monospace'
  ctx.fillText(store.readout.chord, CENTER, CENTER + 2)
  ctx.font = '8px "Courier New", monospace'; ctx.fillStyle = 'rgba(216,211,228,0.55)'
  ctx.fillText(`${store.bpm} BPM · BAR ${store.readout.bar + 1} · ${store.readout.phrase}`, CENTER, CENTER + 20)
}

onMounted(() => globalStore.setCurrentGame('composer'))
// The canvas only exists once started (it's behind v-if), so grab its context
// after that flips true — not at mount time.
watch(started, async (on) => {
  if (!on) return
  await nextTick()
  ctx = canvasRef.value?.getContext('2d') ?? null
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(draw)
})
onUnmounted(() => {
  alive = false
  cancelAnimationFrame(raf)
  store.dispose()
  globalStore.setCurrentGame(null)
})

function cycleMood(dir: number): void {
  const i = store.moods.indexOf(store.piece.mood)
  store.setMood(store.moods[(i + dir + store.moods.length) % store.moods.length])
}
</script>

<template>
  <CircularViewport>
    <div class="composer">
      <template v-if="started">
        <canvas ref="canvasRef" class="cv" width="720" height="720"></canvas>
        <div ref="surfRef" class="surface" @pointerdown="onDown"></div>

        <!-- top: mood + evolve -->
        <div class="top">
          <button class="nav" @click="cycleMood(-1)">‹</button>
          <div class="mood" :style="{ '--c': moodColor }">{{ store.piece.mood }}</div>
          <button class="nav" @click="cycleMood(1)">›</button>
          <button class="evolve" :class="{ on: store.piece.evolve }" @click="store.toggleEvolve()">EVOLVE</button>
        </div>

        <!-- bottom: compose / tune / panic -->
        <div class="bottom">
          <button class="b compose" @click="store.compose()">COMPOSE</button>
          <div class="seed">{{ store.seed }}</div>
          <button class="b" @click="showTune = true">TUNE</button>
          <button class="b panic" @click="store.panic()">◼</button>
        </div>

        <!-- track voice-strip sheet -->
        <div v-if="selTrack" class="strip-bg" @pointerdown.self="store.selectTrack(null)">
          <div class="strip" :style="{ '--c': TRACK_COLOR[selTrack.id] }">
            <div class="strip-head">
              <span class="sn"><span class="dot"></span>{{ selTrack.name }}</span>
              <button class="mute" :class="{ on: selTrack.mute }" @click="store.toggleMute(selTrack.id)">
                {{ selTrack.mute ? 'MUTED' : 'MUTE' }}
              </button>
              <button class="close" @click="store.selectTrack(null)">✕</button>
            </div>

            <div v-if="selTrack.kind !== 'kit'" class="engines">
              <button v-for="[id, label] in store.engineOptions" :key="id" class="ech"
                :class="{ on: id === selTrack.engine }" :disabled="id === selTrack.engine"
                :style="{ '--e': engineColor(store.usableEngine(id)) }"
                @click="store.setTrackEngine(selTrack.id, id)">{{ label }}</button>
            </div>
            <div v-else class="kitnote">KICK · SNARE · HAT</div>

            <div class="steppers">
              <div class="st"><span>OCT</span><button @click="store.shiftOct(selTrack.id, -1)">−</button><b>{{ selTrack.oct }}</b><button @click="store.shiftOct(selTrack.id, 1)">+</button></div>
              <div class="st"><span>HITS</span><button @click="store.setPulses(selTrack.id, selTrack.pulses - 1)">−</button><b>{{ selTrack.pulses }}</b><button @click="store.setPulses(selTrack.id, selTrack.pulses + 1)">+</button></div>
              <div class="st"><span>ROT</span><button @click="store.setRot(selTrack.id, selTrack.rot - 1)">−</button><b>{{ selTrack.rot }}</b><button @click="store.setRot(selTrack.id, selTrack.rot + 1)">+</button></div>
            </div>

            <div class="sliders">
              <label class="sl"><span>LEVEL</span><input type="range" min="0" max="1" step="0.01" :value="selTrack.level" @input="store.setTrackLevel(selTrack.id, +($event.target as HTMLInputElement).value)"><b>{{ Math.round(selTrack.level * 100) }}</b></label>
              <label class="sl"><span>DENS</span><input type="range" min="0" max="1" step="0.01" :value="selTrack.density" @input="store.setDensity(selTrack.id, +($event.target as HTMLInputElement).value)"><b>{{ Math.round(selTrack.density * 100) }}</b></label>
              <label class="sl"><span>DLY</span><input type="range" min="0" max="1" step="0.01" :value="selTrack.sendDelay" @input="store.setTrackSend(selTrack.id, 'delay', +($event.target as HTMLInputElement).value)"><b>{{ Math.round(selTrack.sendDelay * 100) }}</b></label>
              <label class="sl"><span>VRB</span><input type="range" min="0" max="1" step="0.01" :value="selTrack.sendVerb" @input="store.setTrackSend(selTrack.id, 'verb', +($event.target as HTMLInputElement).value)"><b>{{ Math.round(selTrack.sendVerb * 100) }}</b></label>
              <label v-for="(m, mi) in selTrack.macros" :key="m.param" class="sl">
                <span>{{ m.label }}</span>
                <input type="range" :min="m.min" :max="m.max" :step="(m.max - m.min) / 100" :value="m.value"
                  @input="store.setTrackMacro(selTrack.id, mi, +($event.target as HTMLInputElement).value)">
                <b>{{ m.value >= 100 ? Math.round(m.value) : m.value.toFixed(2) }}</b>
              </label>
            </div>
          </div>
        </div>

        <!-- tuning sheet -->
        <div v-if="showTune" class="strip-bg" @pointerdown.self="showTune = false">
          <div class="tune">
            <div class="row"><span>ROOT</span>
              <button @click="store.shiftRoot(-1)">−</button><b>{{ store.rootName }}</b><button @click="store.shiftRoot(1)">+</button>
            </div>
            <div class="row"><span>SCALE</span>
              <select :value="store.piece.scaleName" @change="store.setScaleName(($event.target as HTMLSelectElement).value)">
                <option v-for="s in store.scaleNames" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="row"><span>BPM</span>
              <button @click="store.setBpm(store.bpm - 2)">−</button><b>{{ store.bpm }}</b><button @click="store.setBpm(store.bpm + 2)">+</button>
            </div>
            <div class="row"><span>SWING</span>
              <button @click="store.setSwing(store.swing - 0.04)">−</button><b>{{ Math.round(store.swing * 100) }}%</b><button @click="store.setSwing(store.swing + 0.04)">+</button>
            </div>
            <div class="row"><span>COMP</span>
              <button class="comp" :class="{ on: store.piece.fx.comp }" @click="store.toggleComp()">{{ store.piece.fx.comp ? 'ON' : 'OFF' }}</button>
            </div>
            <button class="close-wide" @click="showTune = false">CLOSE</button>
          </div>
        </div>
      </template>

      <div v-else class="title" @pointerdown.prevent="start">
        <div class="aura"></div>
        <div class="mark">✶</div>
        <div class="name">COMPOSER</div>
        <div class="sub">GENERATIVE ENSEMBLE</div>
        <div class="cta">TAP TO POWER ON</div>
      </div>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.composer { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 50% 42%, #100c20 0%, #0a0812 66%, #050409 100%); font-family: 'Courier New', monospace; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; }
.surface { position: absolute; inset: 0; z-index: 1; touch-action: none; }

.top { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 6px; }
.top .nav { background: rgba(20,16,40,0.7); border: 1px solid rgba(190,178,235,0.28); color: #d8d3e4; border-radius: 8px; cursor: pointer; padding: 4px 9px; font-size: 13px; }
.mood { min-width: 74px; text-align: center; color: var(--c); font-size: 12px; letter-spacing: 0.24em; font-weight: bold; text-shadow: 0 0 12px color-mix(in srgb, var(--c) 40%, transparent); }
.evolve { background: rgba(20,16,40,0.7); border: 1px solid rgba(190,178,235,0.25); color: rgba(216,211,228,0.6); font-family: 'Courier New', monospace; font-size: 8px; letter-spacing: 0.15em; padding: 5px 9px; border-radius: 8px; cursor: pointer; margin-left: 6px; }
.evolve.on { background: #5fe08a; color: #12101f; border-color: #5fe08a; box-shadow: 0 0 10px rgba(95,224,138,0.5); }

.bottom { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; gap: 7px; }
.bottom .b { background: rgba(20,16,40,0.75); border: 1px solid rgba(190,178,235,0.28); color: #d8d3e4; font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.14em; padding: 7px 12px; border-radius: 9px; cursor: pointer; }
.bottom .compose { border-color: rgba(58,214,230,0.5); color: #3ad6e6; box-shadow: 0 0 12px rgba(58,214,230,0.3); }
.bottom .panic { border-color: rgba(255,92,92,0.45); color: #ff8a8a; padding: 7px 10px; }
.seed { font-size: 8px; color: rgba(216,211,228,0.45); letter-spacing: 0.08em; }

.strip-bg { position: absolute; inset: 0; z-index: 50; display: flex; align-items: flex-end; justify-content: center; background: rgba(6,5,14,0.7); backdrop-filter: blur(2px); border-radius: 50%; }
.strip { width: 82%; max-height: 74%; overflow-y: auto; margin-bottom: 58px; background: rgba(20,16,40,0.97); border: 1px solid var(--c); border-radius: 16px; padding: 12px; color: #d8d3e4; box-shadow: 0 0 24px color-mix(in srgb, var(--c) 25%, transparent); }
.strip-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sn { display: flex; align-items: center; gap: 7px; font-size: 12px; letter-spacing: 0.16em; color: #f4f1ea; }
.sn .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.mute { background: rgba(30,24,54,0.7); border: 1px solid rgba(190,178,235,0.25); color: rgba(216,211,228,0.7); font-family: 'Courier New', monospace; font-size: 9px; letter-spacing: 0.1em; padding: 4px 10px; border-radius: 7px; cursor: pointer; }
.mute.on { background: rgba(255,92,92,0.2); color: #ff8a8a; border-color: rgba(255,92,92,0.45); }
.close { background: none; border: none; color: rgba(216,211,228,0.6); font-size: 12px; cursor: pointer; }
.engines { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 10px; }
.ech { background: rgba(30,24,54,0.7); border: 1px solid color-mix(in srgb, var(--e) 35%, transparent); color: rgba(216,211,228,0.85); font-family: 'Courier New', monospace; font-size: 8px; padding: 5px 3px; border-radius: 7px; cursor: pointer; }
.ech.on { border-color: var(--e); color: var(--e); background: color-mix(in srgb, var(--e) 18%, rgba(30,24,54,0.7)); }
.kitnote { font-size: 9px; letter-spacing: 0.2em; color: rgba(216,211,228,0.45); text-align: center; margin-bottom: 10px; }
.steppers { display: flex; gap: 8px; justify-content: center; margin-bottom: 10px; }
.st { display: flex; align-items: center; gap: 4px; font-size: 8px; letter-spacing: 0.08em; color: rgba(216,211,228,0.6); }
.st button { width: 22px; height: 22px; border-radius: 6px; background: rgba(190,178,235,0.08); border: 1px solid rgba(190,178,235,0.25); color: #d8d3e4; font-size: 12px; cursor: pointer; }
.st b { min-width: 18px; text-align: center; color: #f4f1ea; font-size: 11px; }
.sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.sl { display: flex; align-items: center; gap: 6px; font-size: 8px; }
.sl span { width: 44px; color: rgba(216,211,228,0.55); }
.sl input { flex: 1; accent-color: var(--c); min-width: 0; }
.sl b { width: 30px; text-align: right; color: var(--c); }

.tune { width: 66%; margin-bottom: 58px; background: rgba(20,16,40,0.97); border: 1px solid rgba(190,178,235,0.25); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; color: #d8d3e4; }
.tune .row { display: flex; align-items: center; gap: 10px; font-size: 11px; letter-spacing: 0.14em; justify-content: center; }
.tune .row span { width: 56px; color: rgba(216,211,228,0.55); }
.tune .row b { min-width: 44px; text-align: center; }
.tune .row button { width: 30px; height: 30px; border-radius: 7px; background: rgba(190,178,235,0.08); border: 1px solid rgba(190,178,235,0.25); color: #d8d3e4; font-size: 15px; cursor: pointer; }
.tune select { background: rgba(16,13,30,0.9); border: 1px solid rgba(190,178,235,0.3); color: #d8d3e4; font-family: 'Courier New', monospace; padding: 5px; border-radius: 6px; }
.comp { width: auto !important; padding: 0 14px !important; }
.comp.on { background: #5fe08a !important; color: #12101f !important; border-color: #5fe08a !important; }
.close-wide { padding: 9px; background: #d8d3e4; color: #12101f; border: none; border-radius: 8px; letter-spacing: 0.2em; font-size: 11px; cursor: pointer; }

.title { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; color: #d8d3e4; }
.aura { position: absolute; left: 50%; top: 50%; width: 460px; height: 460px; margin: -230px 0 0 -230px; border-radius: 50%; background: conic-gradient(from 0deg, #ff6b5c, #ffb347, #5fe08a, #3ad6e6, #b47cff, #ff5ca8, #ff6b5c); filter: blur(64px); opacity: 0.22; animation: aspin 44s linear infinite; }
@keyframes aspin { to { transform: rotate(360deg); } }
.mark { font-size: 52px; color: #eadfff; text-shadow: 0 0 34px rgba(180,124,255,0.7); z-index: 1; }
.name { font-size: 34px; font-weight: bold; letter-spacing: 0.3em; text-indent: 0.3em; z-index: 1; background: linear-gradient(100deg, #c8e6ff, #f4f1ea 42%, #ffd6f2 72%, #c9b8ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { font-size: 10px; letter-spacing: 0.36em; color: rgba(200,190,235,0.5); z-index: 1; }
.cta { margin-top: 22px; font-size: 12px; letter-spacing: 0.32em; color: #5fe08a; text-shadow: 0 0 12px rgba(95,224,138,0.6); animation: pulse 1.8s ease-in-out infinite; z-index: 1; }
@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .aura, .cta { animation: none; } }
</style>
