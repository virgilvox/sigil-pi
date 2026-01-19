import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/components/core/RadialMenu.vue')
  },
  {
    path: '/sigil-lite',
    name: 'sigil-lite',
    component: () => import('@/components/sigil/SigilGame.vue'),
    props: { mode: 'lite' }
  },
  {
    path: '/sigil-full',
    name: 'sigil-full',
    component: () => import('@/components/sigil/SigilGame.vue'),
    props: { mode: 'full' }
  },
  {
    path: '/junk-mage',
    name: 'junk-mage',
    component: () => import('@/components/junk-mage/JunkMageGame.vue')
  },
  {
    path: '/null-arcana',
    name: 'null-arcana',
    component: () => import('@/components/null-arcana/NullArcanaGame.vue')
  },
  {
    path: '/prize-wheel',
    name: 'prize-wheel',
    component: () => import('@/components/prize-wheel/PrizeWheelGame.vue')
  },
  {
    path: '/null-synth',
    name: 'null-synth',
    component: () => import('@/components/null-synth/NullSynthGame.vue')
  },
  {
    path: '/robot-face',
    name: 'robot-face',
    component: () => import('@/components/robot-face/RobotFaceGame.vue')
  },
  {
    path: '/sigil-engine',
    name: 'sigil-engine',
    component: () => import('@/components/sigil-engine/SigilEngineGame.vue')
  },
  {
    path: '/carrom',
    name: 'carrom',
    component: () => import('@/components/carrom/CarromGame.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
