<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  current: number
  max: number
  color: string
  startAngle?: number
  endAngle?: number
  radius?: number
  strokeWidth?: number
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  startAngle: -Math.PI / 2,
  endAngle: Math.PI / 2,
  radius: 330,
  strokeWidth: 12,
  size: 720
})

const center = computed(() => props.size / 2)

const circumference = computed(() => {
  const angleSpan = props.endAngle - props.startAngle
  return props.radius * angleSpan
})

const healthRatio = computed(() => Math.max(0, Math.min(1, props.current / props.max)))

const dashArray = computed(() => {
  const filled = circumference.value * healthRatio.value
  const empty = circumference.value * (1 - healthRatio.value)
  return `${filled} ${empty}`
})

// Convert to degrees for SVG
const startDeg = computed(() => (props.startAngle * 180) / Math.PI)
const sweepDeg = computed(() => ((props.endAngle - props.startAngle) * 180) / Math.PI)
</script>

<template>
  <svg :width="size" :height="size" class="health-ring">
    <!-- Background arc -->
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      fill="none"
      :stroke="color"
      stroke-opacity="0.15"
      :stroke-width="strokeWidth"
      :stroke-dasharray="`${circumference} ${2 * Math.PI * radius - circumference}`"
      :transform="`rotate(${startDeg} ${center} ${center})`"
    />
    <!-- Health arc -->
    <circle
      :cx="center"
      :cy="center"
      :r="radius"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth - 2"
      stroke-linecap="round"
      :stroke-dasharray="dashArray"
      :transform="`rotate(${startDeg} ${center} ${center})`"
      class="health-fill"
    />
  </svg>
</template>

<style scoped>
.health-ring {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.health-fill {
  transition: stroke-dasharray 0.3s ease;
  filter: drop-shadow(0 0 6px currentColor);
}
</style>
