<script setup lang="ts">
import { computed } from 'vue'
import { APP_ICONS } from '@/games/appIcons'
import { monogram } from '@/composables/useMonogram'

// Renders a sigil-style line icon for an app node (currentColor → inherits the
// node's accent). A soft blurred under-layer makes the stroke glow/pop against
// the disc; the crisp layer rides on top. Falls back to a monogram for drop-ins.
const props = defineProps<{ id: string; name: string; icon?: string }>()

const markup = computed(() => APP_ICONS[props.id] || (props.icon ? APP_ICONS[props.icon] : undefined))
</script>

<template>
  <svg v-if="markup" class="app-icon" viewBox="0 0 100 100" aria-hidden="true">
    <!-- glow under-layer: same paths, thicker + blurred -->
    <g class="glow" v-html="markup" fill="none" stroke="currentColor" stroke-width="9"
       stroke-linecap="round" stroke-linejoin="round"></g>
    <!-- crisp layer -->
    <g class="line" v-html="markup" fill="none" stroke="currentColor" stroke-width="6"
       stroke-linecap="round" stroke-linejoin="round"></g>
  </svg>
  <span v-else class="app-mono">{{ monogram(name) }}</span>
</template>

<style scoped>
.app-icon { width: 62%; height: 62%; display: block; color: inherit; overflow: visible; }
.app-icon .glow { opacity: 0.55; filter: blur(2.4px); }
.app-icon .line { filter: brightness(1.25); }
.app-mono { font-weight: bold; }
</style>
