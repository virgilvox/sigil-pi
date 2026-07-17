import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { BAKED_GAMES } from '@/games/registry'

// Routes are derived from the baked-game registry (single source of truth) plus a
// generic host for drop-in HTML games. Adding a baked game = one registry entry;
// adding a drop-in = one HTML file in the drop-in folder (no route edit needed).
const gameRoutes: RouteRecordRaw[] = BAKED_GAMES.map(game => ({
  path: game.route,
  name: game.id,
  component: game.component,
  props: game.props
}))

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/components/core/RadialMenu.vue')
  },
  ...gameRoutes,
  {
    // Drop-in single-file HTML games, hosted in a sandboxed iframe.
    path: '/play/:id',
    name: 'dropin',
    component: () => import('@/games/DropinHost.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
