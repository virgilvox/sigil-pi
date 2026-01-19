<script setup lang="ts">
interface Props {
  visible: boolean
  title?: string
  subtitle?: string
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-content">
        <div v-if="title" class="modal-title">{{ title }}</div>
        <div v-if="subtitle" class="modal-subtitle">{{ subtitle }}</div>
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  background: rgba(6, 6, 10, 0.97);
  border-radius: 50%;
}

.modal-content {
  text-align: center;
  padding: 20px;
}

.modal-title {
  font-size: min(12vw, 80px);
  font-weight: bold;
  letter-spacing: 0.4em;
  color: #d4d0c4;
  text-shadow: 0 0 40px rgba(212, 208, 196, 0.3);
  margin-bottom: 3%;
}

.modal-subtitle {
  font-size: min(2vw, 14px);
  letter-spacing: 0.3em;
  color: rgba(212, 208, 196, 0.4);
  text-transform: uppercase;
  margin-bottom: 6%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
