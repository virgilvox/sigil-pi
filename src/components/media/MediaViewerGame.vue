<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'

// A swipe-through gallery for whatever is in public/videos or public/images.
// The list is fetched at runtime (drop a file in, refresh, it appears). Only the
// CURRENT item is ever in the DOM — keyed by url, so swiping away destroys the
// previous <video>/<img> and releases its memory (important for big videos).
// Videos play with audio; a FILL/FIT button toggles crop-to-circle vs contain.
const props = defineProps<{ kind: 'videos' | 'images' }>()
const globalStore = useGlobalStore()

interface MediaItem { name: string; url: string; ext: string }
const items = ref<MediaItem[]>([])
const index = ref(0)
const loaded = ref(false)
const fit = ref<'cover' | 'contain'>('cover')  // cover = crop to circle, contain = fit
const muted = ref(false)
const playing = ref(false)
const failed = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)

const isVideo = computed(() => props.kind === 'videos')
const current = computed<MediaItem | null>(() => items.value[index.value] ?? null)

async function load(): Promise<void> {
  try {
    const r = await fetch(`/api/media/${props.kind}`, { cache: 'no-store' })
    const data = await r.json()
    items.value = Array.isArray(data) ? data : []
  } catch { items.value = [] }
  loaded.value = true
}

function go(dir: number): void {
  if (items.value.length < 2) return
  failed.value = false
  index.value = (index.value + dir + items.value.length) % items.value.length
}
function toggleFit(): void { fit.value = fit.value === 'cover' ? 'contain' : 'cover' }
function toggleMute(): void { muted.value = !muted.value; if (videoRef.value) videoRef.value.muted = muted.value }
function togglePlay(): void {
  const v = videoRef.value; if (!v) return
  if (v.paused) void v.play().catch(() => { playing.value = false }); else v.pause()
}

// New video → set volume + autoplay (with sound; the kiosk allows it, dev may
// block → shows the ▶ overlay to start on tap).
watch(current, async (c) => {
  if (!isVideo.value || !c) return
  failed.value = false
  await nextTick()
  const v = videoRef.value; if (!v) return
  v.muted = muted.value
  try { await v.play() } catch { playing.value = false }
})

// input: horizontal swipe = prev/next; a tap toggles video play/pause
let sx = 0, sy = 0, dragging = false
function onDown(e: PointerEvent): void { sx = e.clientX; sy = e.clientY; dragging = true }
function onUp(e: PointerEvent): void {
  if (!dragging) return
  dragging = false
  const dx = e.clientX - sx, dy = e.clientY - sy
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); return }
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && isVideo.value) togglePlay()
}

onMounted(() => { globalStore.setCurrentGame(props.kind); void load() })
onUnmounted(() => {
  const v = videoRef.value
  if (v) { try { v.pause(); v.removeAttribute('src'); v.load() } catch { /* gone */ } }
  globalStore.setCurrentGame(null)
})
</script>

<template>
  <CircularViewport>
    <div class="media" @pointerdown="onDown" @pointerup="onUp" @pointercancel="dragging = false">
      <template v-if="loaded && current">
        <video
          v-if="isVideo"
          ref="videoRef"
          :key="current.url"
          :src="current.url"
          class="el"
          :style="{ objectFit: fit }"
          loop
          playsinline
          @play="playing = true"
          @pause="playing = false"
          @error="failed = true"
        ></video>
        <img v-else :key="current.url" :src="current.url" class="el" :style="{ objectFit: fit }"
          @error="failed = true" alt="" />

        <div v-if="failed" class="notice">CAN'T PLAY<br><span>{{ current.name }}</span></div>
        <button v-else-if="isVideo && !playing" class="play-big" @pointerup.stop="togglePlay">▶</button>

        <!-- controls -->
        <div class="ctl">
          <button class="c" @pointerup.stop="go(-1)">‹</button>
          <button class="c wide" @pointerup.stop="toggleFit">{{ fit === 'cover' ? '▭ FIT' : '◯ FILL' }}</button>
          <button v-if="isVideo" class="c" :class="{ off: muted }" @pointerup.stop="toggleMute">{{ muted ? '🔇' : '🔊' }}</button>
          <button class="c" @pointerup.stop="go(1)">›</button>
        </div>
        <div class="meta">{{ index + 1 }} / {{ items.length }} · {{ current.name }}</div>
      </template>

      <div v-else-if="loaded" class="empty">
        <div class="glyph">{{ isVideo ? '▷' : '▨' }}</div>
        <div class="msg">NO {{ kind.toUpperCase() }}</div>
        <div class="sub">add files to public/{{ kind }}</div>
      </div>
      <div v-else class="empty"><div class="glyph spin">◌</div></div>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.media { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: #05040a; touch-action: none; font-family: 'Courier New', monospace; }
.el { position: absolute; inset: 0; width: 100%; height: 100%; display: block; animation: fade 0.35s ease; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }

.play-big {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 10;
  width: 84px; height: 84px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.55);
  background: rgba(10,8,20,0.5); color: rgba(255,255,255,0.9); font-size: 30px; cursor: pointer;
  backdrop-filter: blur(4px); padding-left: 6px;
}
.notice { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 10; text-align: center; color: rgba(255,120,120,0.9); font-size: 15px; letter-spacing: 0.2em; }
.notice span { font-size: 10px; color: rgba(216,211,228,0.55); letter-spacing: 0.08em; }

.ctl {
  position: absolute; left: 50%; bottom: 54px; transform: translateX(-50%); z-index: 12;
  display: flex; align-items: center; gap: 8px;
}
.c {
  background: rgba(10,8,20,0.62); border: 1px solid rgba(190,178,235,0.3); color: #eae6f5;
  font-family: 'Courier New', monospace; font-size: 13px; padding: 8px 12px; border-radius: 10px;
  cursor: pointer; backdrop-filter: blur(4px); min-width: 42px;
}
.c.wide { font-size: 11px; letter-spacing: 0.12em; }
.c.off { opacity: 0.55; }

.meta {
  position: absolute; left: 50%; bottom: 30px; transform: translateX(-50%); z-index: 12;
  max-width: 60%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-size: 9px; letter-spacing: 0.12em; color: rgba(230,226,245,0.6);
  background: rgba(10,8,20,0.5); padding: 3px 10px; border-radius: 8px; backdrop-filter: blur(3px);
}

.empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: rgba(216,211,228,0.6); }
.empty .glyph { font-size: 44px; opacity: 0.5; }
.empty .glyph.spin { animation: spin 2.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty .msg { font-size: 15px; letter-spacing: 0.28em; }
.empty .sub { font-size: 10px; letter-spacing: 0.14em; color: rgba(216,211,228,0.35); }
</style>
