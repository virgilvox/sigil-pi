import { ref, computed, readonly } from 'vue'
import type { GameEntry, DropinManifestEntry } from '@/types'
import { bakedCatalog } from '@/games/registry'

// ═══════════════════════════════════════════════════════════════════
// UNIFIED GAME CATALOG
//
// Merges the baked-in registry with drop-in HTML games discovered at runtime
// via /api/games. Module-level state so the home menu and the in-game
// AppSwitcher share a single fetch and stay in sync.
// ═══════════════════════════════════════════════════════════════════

const baked = bakedCatalog()
const dropins = ref<GameEntry[]>([])
const loading = ref(false)
const loaded = ref(false)

function toEntry(d: DropinManifestEntry): GameEntry {
  return {
    id: d.id,
    name: d.name,
    route: `/play/${d.id}`,
    color: d.color || '#d4d0c4',
    description: d.description || 'DROP-IN',
    source: 'dropin',
    order: d.order ?? 1000,
    file: d.file
  }
}

/** Fetch the drop-in list. Fails soft: dev/no-server contexts keep an empty list. */
async function refresh(): Promise<void> {
  loading.value = true
  try {
    const res = await fetch('/api/games', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as DropinManifestEntry[]
      dropins.value = Array.isArray(data) ? data.map(toEntry) : []
    }
  } catch {
    // No runtime server (e.g. `vite build` preview without the plugin) — ignore.
  } finally {
    loaded.value = true
    loading.value = false
  }
}

const games = computed<GameEntry[]>(() => {
  // Baked entries win on id collision, so seeding the drop-in folder with the
  // standalone copies of baked games never produces duplicates in the menu.
  const seen = new Set(baked.map(g => g.id))
  const merged = [...baked]
  for (const d of dropins.value) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    merged.push(d)
  }
  return merged.sort(
    (a, b) => (a.order ?? 1000) - (b.order ?? 1000) || a.name.localeCompare(b.name)
  )
})

export function useGameCatalog() {
  // Kick off a background load on first use; callers can await refresh() too.
  if (!loaded.value && !loading.value) void refresh()

  function findById(id: string): GameEntry | undefined {
    return games.value.find(g => g.id === id)
  }

  return {
    games,
    dropins: readonly(dropins),
    loading: readonly(loading),
    loaded: readonly(loaded),
    refresh,
    findById
  }
}
