<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGlobalStore } from '@/stores/global'
import { useGameCatalog } from '@/composables/useGameCatalog'
import CircularViewport from '@/components/core/CircularViewport.vue'
import CRTOverlay from '@/components/core/CRTOverlay.vue'

// Generic host for drop-in single-file HTML games. The game runs sandboxed in an
// iframe and inherits the circular viewport's scale-to-panel sizing, exactly like
// a baked game, so a 720-authored HTML file fits any round display unchanged.

const route = useRoute()
const globalStore = useGlobalStore()
const { games, loaded, refresh } = useGameCatalog()

const id = computed(() => String(route.params.id || ''))
const entry = computed(() => games.value.find(g => g.id === id.value && g.source === 'dropin'))
const src = computed(() => (entry.value?.file ? `/dropins/${entry.value.file}` : ''))
const notFound = ref(false)

async function resolveEntry(): Promise<void> {
  if (!entry.value) {
    // Catalog may not have loaded yet (deep link / cold start) — force a scan.
    await refresh()
  }
  notFound.value = loaded.value && !entry.value
}

onMounted(() => {
  globalStore.setCurrentGame(id.value)
  void resolveEntry()
})

watch(id, () => {
  globalStore.setCurrentGame(id.value)
  notFound.value = false
  void resolveEntry()
})
</script>

<template>
  <CircularViewport>
    <div class="dropin-host">
      <iframe
        v-if="src"
        :key="src"
        :src="src"
        class="dropin-frame"
        title="drop-in game"
        sandbox="allow-scripts allow-pointer-lock allow-same-origin allow-forms allow-modals"
        allow="autoplay; microphone; gamepad; accelerometer; gyroscope"
      ></iframe>
      <div v-else-if="notFound" class="dropin-missing">
        <div class="glyph">⟳</div>
        <div class="msg">GAME NOT FOUND</div>
        <div class="sub">{{ id }}</div>
      </div>
      <div v-else class="dropin-loading">
        <div class="glyph">◌</div>
        <div class="msg">LOADING</div>
      </div>
    </div>
    <CRTOverlay />
  </CircularViewport>
</template>

<style scoped>
.dropin-host {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #06060a;
}

.dropin-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #06060a;
}

.dropin-missing,
.dropin-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(212, 208, 196, 0.7);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.3em;
}

.glyph {
  font-size: 40px;
  opacity: 0.6;
  animation: spin 3s linear infinite;
}

.dropin-missing .glyph {
  animation: none;
}

.msg {
  font-size: 14px;
}

.sub {
  font-size: 10px;
  color: rgba(212, 208, 196, 0.4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
