<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCanvas } from '@/composables/useCanvas'

interface Props {
  size?: number
  layers?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  size: 720,
  layers: () => ['bg', 'main']
})

const containerRef = ref<HTMLElement | null>(null)
const { canvasLayers, ready, getContext, clear, clearCircle } = useCanvas(containerRef, {
  size: props.size,
  layers: props.layers
})

defineExpose({
  canvasLayers,
  ready,
  getContext,
  clear,
  clearCircle,
  containerRef
})
</script>

<template>
  <div ref="containerRef" class="game-canvas-container">
    <slot v-if="ready" />
  </div>
</template>

<style scoped>
.game-canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}
</style>
