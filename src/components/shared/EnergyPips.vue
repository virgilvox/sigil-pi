<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  current: number
  max: number
  color: string
  label?: string
  position?: 'top' | 'bottom'
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  position: 'top'
})

const pips = computed(() => {
  return Array.from({ length: props.max }, (_, i) => ({
    index: i,
    filled: i < props.current
  }))
})
</script>

<template>
  <div class="energy-pips" :class="position">
    <span v-if="label" class="label" :style="{ color }">{{ label }}</span>
    <div
      v-for="pip in pips"
      :key="pip.index"
      class="pip"
      :class="{ full: pip.filled }"
      :style="{
        borderColor: color,
        backgroundColor: pip.filled ? color : 'transparent',
        boxShadow: pip.filled ? `0 0 8px ${color}` : 'none'
      }"
    />
  </div>
</template>

<style scoped>
.energy-pips {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  align-items: center;
  z-index: 50;
  padding: 4px 12px;
  background: rgba(6, 6, 10, 0.7);
  border-radius: 20px;
}

.energy-pips.top {
  top: 12%;
}

.energy-pips.bottom {
  bottom: 12%;
}

.label {
  font-size: 12px;
  letter-spacing: 0.15em;
  margin-right: 8px;
}

.pip {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid;
  transition: all 0.2s ease;
}

.pip.full {
  animation: pip-pulse 1.5s ease-in-out infinite;
}

@keyframes pip-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.85;
  }
}
</style>
