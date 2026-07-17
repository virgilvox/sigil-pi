<script setup lang="ts">
import { computed } from 'vue'
import { APP_ICONS } from '@/games/appIcons'
import { monogram } from '@/composables/useMonogram'

// Renders a sigil-style line icon for an app node (currentColor → inherits the
// node's accent). Falls back to a 2-letter monogram for drop-ins with no icon.
const props = defineProps<{ id: string; name: string; icon?: string }>()

const markup = computed(() => APP_ICONS[props.id] || (props.icon ? APP_ICONS[props.icon] : undefined))
</script>

<template>
  <svg v-if="markup" class="app-icon" viewBox="0 0 100 100" aria-hidden="true">
    <g v-html="markup" fill="none" stroke="currentColor" stroke-width="6"
       stroke-linecap="round" stroke-linejoin="round"></g>
  </svg>
  <span v-else class="app-mono">{{ monogram(name) }}</span>
</template>

<style scoped>
.app-icon { width: 60%; height: 60%; display: block; color: inherit; overflow: visible; }
.app-mono { font-weight: bold; }
</style>
