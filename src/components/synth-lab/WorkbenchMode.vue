<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useSynthLabStore } from '@/stores/synth-lab'
import type { ParamSpec } from 'bellowsjs'
import { CENTER, polar } from './geometry'
import {
  buildPages, toNorm, fromNorm, formatValue, shortName, knobColor,
  isStepped, type KnobPage
} from './params'
import { stageGradient, withAlpha, engineColor } from '@/styles/palette'

// A sound-design bench: pick any engine, edit its FULL param surface as
// color-coded, curve-aware circular knobs (grouped + paginated), build a real
// fx rack, and audition. A circular translation of the bellows workbench.

const store = useSynthLabStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const surfRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0

const pageIndex = ref(0)
const showPicker = ref(false)
const showFx = ref(false)
const selectedFx = ref(0)

const pages = computed<KnobPage[]>(() => buildPages(store.benchEngine, store.benchSpecs))
const page = computed<KnobPage>(() => pages.value[Math.min(pageIndex.value, pages.value.length - 1)] ?? { id: '_', label: '', specs: [] })

watch(() => store.benchEngine, () => { pageIndex.value = 0 })

interface KnobPos { spec: ParamSpec; x: number; y: number; r: number }
let knobPositions: KnobPos[] = []

// Even full-circle distribution, top-anchored, with adjacent rings phase-offset
// so they interleave. Radii are sized so the lowest knob clears the bottom dock.
function layout(): KnobPos[] {
  const list = page.value.specs
  const n = list.length
  const out: KnobPos[] = []
  if (n === 0) return out
  let rings: { r: number; kr: number }[]
  if (n <= 6) rings = [{ r: 210, kr: 33 }]
  else if (n <= 12) rings = [{ r: 232, kr: 28 }, { r: 150, kr: 27 }]
  else rings = [{ r: 246, kr: 23 }, { r: 182, kr: 22 }, { r: 116, kr: 21 }]
  const perRing = Math.ceil(n / rings.length)
  list.forEach((spec, i) => {
    const ring = Math.min(rings.length - 1, Math.floor(i / perRing))
    const idxInRing = i - ring * perRing
    const c = Math.min(perRing, n - ring * perRing)
    const phase = ring % 2 ? Math.PI / Math.max(c, 1) : 0
    const a = -Math.PI / 2 + phase + (idxInRing / c) * Math.PI * 2
    const p = polar(rings[ring].r, a)
    out.push({ spec, x: p.x, y: p.y, r: rings[ring].kr })
  })
  return out
}

function toLocal(e: PointerEvent): { x: number; y: number } {
  const r = surfRef.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / r.width * 720, y: (e.clientY - r.top) / r.height * 720 }
}

let dragging: { pointerId: number; spec: ParamSpec; startY: number; startVal: number } | null = null

function onDown(e: PointerEvent): void {
  e.preventDefault()
  if (dragging) return
  const { x, y } = toLocal(e)
  if (Math.hypot(x - CENTER, y - CENTER) < 62) { store.auditionChord(); return }
  let best: KnobPos | null = null, bestD = 42
  for (const k of knobPositions) {
    const d = Math.hypot(x - k.x, y - k.y)
    if (d < bestD) { bestD = d; best = k }
  }
  if (best) {
    dragging = { pointerId: e.pointerId, spec: best.spec, startY: y, startVal: store.benchParams[best.spec.name] ?? best.spec.default }
    try { surfRef.value!.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
}
function onMove(e: PointerEvent): void {
  if (!dragging || e.pointerId !== dragging.pointerId) return
  const { y } = toLocal(e)
  const stepped = isStepped(store.benchEngine, dragging.spec.name)
  const sens = stepped ? 120 : 240
  const t = toNorm(dragging.spec, dragging.startVal) + (dragging.startY - y) / sens
  store.setBenchParam(dragging.spec.name, fromNorm(dragging.spec, t))
}
function onUp(e: PointerEvent): void {
  if (dragging && e.pointerId === dragging.pointerId) dragging = null
}

function drawKnob(k: KnobPos): void {
  if (!ctx) return
  const v = store.benchParams[k.spec.name] ?? k.spec.default
  const t = Math.max(0, Math.min(1, toNorm(k.spec, v)))
  const col = knobColor(k.spec.name)
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25
  const ang = a0 + t * (a1 - a0)
  // face
  ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(16,13,30,0.86)'; ctx.fill()
  // track
  ctx.beginPath(); ctx.arc(k.x, k.y, k.r - 3, a0, a1)
  ctx.strokeStyle = withAlpha('#b9b3d0', 0.16); ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.stroke()
  // value arc (glowing)
  ctx.shadowColor = col; ctx.shadowBlur = 8
  ctx.beginPath(); ctx.arc(k.x, k.y, k.r - 3, a0, ang)
  ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.stroke()
  ctx.shadowBlur = 0
  // pointer dot
  const pp = { x: k.x + Math.cos(ang) * (k.r - 3), y: k.y + Math.sin(ang) * (k.r - 3) }
  ctx.beginPath(); ctx.arc(pp.x, pp.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#f4f1ea'; ctx.fill()
  // labels
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = withAlpha('#d8d3e4', 0.82)
  ctx.font = '9px "Courier New", monospace'
  ctx.fillText(shortName(k.spec.name), k.x, k.y - 5)
  ctx.fillStyle = col
  ctx.font = 'bold 10px "Courier New", monospace'
  ctx.fillText(formatValue(store.benchEngine, k.spec, v), k.x, k.y + 7)
}

function draw(): void {
  raf = requestAnimationFrame(draw)
  if (!ctx) return
  ctx.clearRect(0, 0, 720, 720)
  ctx.fillStyle = stageGradient(ctx, CENTER, CENTER, 360, store.benchColor)
  ctx.fillRect(0, 0, 720, 720)

  knobPositions = layout()
  for (const k of knobPositions) drawKnob(k)

  // center audition hub
  const col = store.benchColor
  ctx.beginPath(); ctx.arc(CENTER, CENTER, 58, 0, Math.PI * 2)
  const hub = ctx.createRadialGradient(CENTER, CENTER - 12, 6, CENTER, CENTER, 58)
  hub.addColorStop(0, withAlpha(col, 0.28)); hub.addColorStop(1, 'rgba(12,10,24,0.92)')
  ctx.fillStyle = hub; ctx.fill()
  ctx.strokeStyle = withAlpha(col, 0.55); ctx.lineWidth = 1.5; ctx.stroke()
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f4f1ea'; ctx.font = 'bold 17px "Courier New", monospace'
  ctx.fillText(store.benchEngine.toUpperCase(), CENTER, CENTER - 8)
  ctx.fillStyle = withAlpha(col, 0.85); ctx.font = '8px "Courier New", monospace'
  ctx.fillText(store.benchPoly > 1 ? `${store.benchPoly}-VOICE` : 'MONO', CENTER, CENTER + 7)
  ctx.fillStyle = withAlpha('#d8d3e4', 0.5)
  ctx.fillText('▷ AUDITION', CENTER, CENTER + 20)
}

onMounted(() => { ctx = canvasRef.value?.getContext('2d') ?? null; raf = requestAnimationFrame(draw) })
onUnmounted(() => cancelAnimationFrame(raf))

function pickEngine(id: string): void { store.selectEngine(id); showPicker.value = false }
function addFx(id: string): void { store.addBenchFx(id); selectedFx.value = store.benchFx.length - 1 }
function fxNorm(spec: ParamSpec, slot: { params: Record<string, number> }): number {
  return toNorm(spec, slot.params[spec.name] ?? spec.default)
}
function onFxSlider(i: number, spec: ParamSpec, e: Event): void {
  const t = Number((e.target as HTMLInputElement).value)
  store.setBenchFxParam(i, spec.name, fromNorm(spec, t))
}
</script>

<template>
  <div class="mode">
    <canvas ref="canvasRef" class="cv" width="720" height="720"></canvas>
    <div ref="surfRef" class="surface" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"></div>

    <!-- page chips + engine nav + fx -->
    <div class="dock">
      <button class="nav" @click="store.cycleBenchEngine(-1)">‹</button>
      <button class="pick" :style="{ '--c': store.benchColor }" @click="showPicker = true">ENGINE</button>
      <button class="nav" @click="store.cycleBenchEngine(1)">›</button>
      <button class="fx-btn" :class="{ has: store.benchFx.length }" @click="showFx = true">
        FX<span v-if="store.benchFx.length" class="fxn">{{ store.benchFx.length }}</span>
      </button>
    </div>

    <div v-if="pages.length > 1" class="pages">
      <button v-for="(p, i) in pages" :key="p.id" class="pg" :class="{ on: i === pageIndex }"
        @click="pageIndex = i">{{ p.label }}</button>
    </div>

    <!-- engine picker -->
    <div v-if="showPicker" class="sheet-bg" @pointerdown.self="showPicker = false">
      <div class="sheet">
        <div class="sheet-title">ENGINE</div>
        <div class="grid">
          <button v-for="id in store.BENCH_ENGINES" :key="id" class="chip"
            :class="{ on: id === store.benchEngine }"
            :style="{ '--c': engineColor(id) }" @click="pickEngine(id)">
            <span class="dot"></span>{{ id }}
          </button>
        </div>
      </div>
    </div>

    <!-- fx rack -->
    <div v-if="showFx" class="sheet-bg" @pointerdown.self="showFx = false">
      <div class="sheet fx">
        <div class="sheet-title">FX RACK <button class="x" @click="showFx = false">✕</button></div>
        <div class="rack">
          <div v-if="!store.benchFx.length" class="empty">no effects — add one below</div>
          <div v-for="(slot, i) in store.benchFx" :key="i" class="fxslot"
            :class="{ sel: i === selectedFx }" @click="selectedFx = i">
            <div class="fxhead">
              <span class="fxname">{{ i + 1 }}. {{ store.fxLabel(slot.effectId) }}</span>
              <button class="del" @click.stop="store.removeBenchFx(i)">✕</button>
            </div>
            <div v-if="i === selectedFx" class="fxparams">
              <label v-for="spec in store.fxSpecs(slot.effectId)" :key="spec.name" class="fxrow">
                <span class="pn">{{ spec.name }}</span>
                <input type="range" min="0" max="1" step="0.001" :value="fxNorm(spec, slot)"
                  @input="onFxSlider(i, spec, $event)" />
                <span class="pv">{{ formatValue(slot.effectId, spec, slot.params[spec.name] ?? spec.default) }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="addbar">
          <span class="addlbl">ADD</span>
          <div class="addgrid">
            <button v-for="e in store.allEffects" :key="e.id" class="addchip" @click="addFx(e.id)">{{ e.label }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mode { position: absolute; inset: 0; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; }
.surface { position: absolute; inset: 0; z-index: 1; touch-action: none; }

.dock {
  position: absolute; left: 50%; bottom: 72px; transform: translateX(-50%); z-index: 10;
  display: flex; align-items: center; gap: 8px; font-family: 'Courier New', monospace;
}
.nav { background: rgba(20,16,40,0.7); border: 1px solid rgba(190,178,235,0.28); color: #d8d3e4; border-radius: 9px; cursor: pointer; padding: 6px 12px; font-size: 15px; }
.pick { background: rgba(20,16,40,0.7); border: 1px solid var(--c); color: var(--c); border-radius: 9px; cursor: pointer; padding: 6px 16px; font-size: 11px; letter-spacing: 0.2em; box-shadow: 0 0 14px color-mix(in srgb, var(--c) 35%, transparent); }

.pages {
  position: absolute; left: 50%; bottom: 44px; transform: translateX(-50%); z-index: 10;
  display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; max-width: 420px;
}
.pg { background: rgba(20,16,40,0.6); border: 1px solid rgba(190,178,235,0.2); color: rgba(216,211,228,0.6); font-family: 'Courier New', monospace; font-size: 8px; letter-spacing: 0.12em; padding: 4px 8px; border-radius: 8px; cursor: pointer; }
.pg.on { background: #d8d3e4; color: #12101f; border-color: #d8d3e4; }

.fx-btn { background: rgba(20,16,40,0.7); border: 1px solid rgba(255,127,208,0.4); color: #ff7fd0;
  font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.15em; padding: 6px 12px; border-radius: 9px; cursor: pointer; }
.fx-btn.has { box-shadow: 0 0 14px rgba(255,127,208,0.4); }
.fxn { margin-left: 5px; background: #ff7fd0; color: #12101f; border-radius: 7px; padding: 0 5px; font-weight: bold; }

/* sheets */
.sheet-bg { position: absolute; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(6,5,14,0.82); backdrop-filter: blur(3px); border-radius: 50%; }
.sheet { width: 78%; max-height: 70%; overflow-y: auto; background: rgba(20,16,40,0.95); border: 1px solid rgba(190,178,235,0.25); border-radius: 18px; padding: 16px; color: #d8d3e4; font-family: 'Courier New', monospace; }
.sheet-title { font-size: 11px; letter-spacing: 0.3em; color: rgba(216,211,228,0.6); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.chip { display: flex; align-items: center; gap: 6px; background: rgba(30,24,54,0.7); border: 1px solid color-mix(in srgb, var(--c) 40%, transparent); color: #d8d3e4; font-family: 'Courier New', monospace; font-size: 10px; padding: 8px 6px; border-radius: 9px; cursor: pointer; }
.chip .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); flex-shrink: 0; }
.chip.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 22%, rgba(30,24,54,0.7)); box-shadow: 0 0 14px color-mix(in srgb, var(--c) 40%, transparent); }

.fx { width: 82%; }
.x { background: none; border: none; color: rgba(216,211,228,0.6); cursor: pointer; font-size: 12px; }
.rack { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.empty { font-size: 10px; color: rgba(216,211,228,0.4); text-align: center; padding: 10px; }
.fxslot { background: rgba(30,24,54,0.6); border: 1px solid rgba(190,178,235,0.16); border-radius: 10px; padding: 8px 10px; cursor: pointer; }
.fxslot.sel { border-color: rgba(255,127,208,0.45); }
.fxhead { display: flex; justify-content: space-between; align-items: center; }
.fxname { font-size: 10px; letter-spacing: 0.1em; color: #f4f1ea; }
.del { background: none; border: none; color: rgba(255,120,120,0.7); cursor: pointer; font-size: 11px; }
.fxparams { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-top: 8px; }
.fxrow { display: flex; align-items: center; gap: 6px; font-size: 8px; }
.fxrow .pn { width: 52px; color: rgba(216,211,228,0.55); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fxrow input { flex: 1; accent-color: #ff7fd0; min-width: 0; }
.fxrow .pv { width: 40px; text-align: right; color: #ff7fd0; }
.addbar { border-top: 1px solid rgba(190,178,235,0.14); padding-top: 10px; }
.addlbl { font-size: 9px; letter-spacing: 0.3em; color: rgba(216,211,228,0.5); }
.addgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 8px; }
.addchip { background: rgba(30,24,54,0.7); border: 1px solid rgba(190,178,235,0.18); color: rgba(216,211,228,0.85); font-family: 'Courier New', monospace; font-size: 9px; padding: 6px 4px; border-radius: 8px; cursor: pointer; }
.addchip:active { background: rgba(255,127,208,0.2); }
</style>
