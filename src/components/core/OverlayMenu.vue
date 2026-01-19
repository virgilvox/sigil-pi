<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGlobalStore } from '@/stores/global'

const router = useRouter()
const globalStore = useGlobalStore()

function goHome(): void {
  globalStore.closeOverlayMenu()
  router.push('/')
}

function toggleMute(): void {
  globalStore.toggleMute()
}

function toggleCRT(): void {
  globalStore.toggleCRT()
}

function resume(): void {
  globalStore.closeOverlayMenu()
}
</script>

<template>
  <Transition name="fade">
    <div v-if="globalStore.overlayMenuOpen" class="overlay-menu">
      <div class="menu-backdrop" @click="resume"></div>
      <div class="menu-content">
        <button class="menu-btn" @click="goHome">
          <span class="icon">⌂</span>
          <span>HOME</span>
        </button>
        <button class="menu-btn" @click="toggleMute">
          <span class="icon">{{ globalStore.muted ? '🔇' : '🔊' }}</span>
          <span>{{ globalStore.muted ? 'UNMUTE' : 'MUTE' }}</span>
        </button>
        <button class="menu-btn" @click="toggleCRT">
          <span class="icon">📺</span>
          <span>CRT {{ globalStore.crtEnabled ? 'OFF' : 'ON' }}</span>
        </button>
        <button class="menu-btn primary" @click="resume">
          <span class="icon">▶</span>
          <span>RESUME</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay-menu {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
}

.menu-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(6, 6, 10, 0.9);
}

.menu-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: transparent;
  border: 1px solid rgba(212, 208, 196, 0.3);
  color: rgba(212, 208, 196, 0.8);
  font-family: 'Courier New', monospace;
  font-size: 14px;
  letter-spacing: 0.2em;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-btn:hover {
  background: rgba(212, 208, 196, 0.1);
  border-color: rgba(212, 208, 196, 0.5);
}

.menu-btn.primary {
  background: #d4d0c4;
  border-color: #d4d0c4;
  color: #06060a;
}

.menu-btn .icon {
  font-size: 18px;
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
