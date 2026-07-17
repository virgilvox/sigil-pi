// ═══════════════════════════════════════════════════════════════════
// Param model for the BENCH — curve-aware mapping, enum labels, and the
// grouped/paginated page plan for dense engines (FM operators, additive
// partials). Curve math mirrors the bellows workbench's toSlider/fromSlider
// so a knob feels identical to the reference.
// ═══════════════════════════════════════════════════════════════════
import type { ParamSpec } from 'bellowsjs'
import { paramGroup, groupColor } from '@/styles/palette'

// ── curve-aware normalize / denormalize (0..1 knob ↔ engineering value) ──
export function toNorm(spec: ParamSpec, value: number): number {
  if (spec.curve === 'exp') {
    const lo = spec.min > 0 ? spec.min : Math.max(spec.max / 1000, 1e-4)
    if (value <= lo) return 0
    return Math.min(1, Math.log(value / lo) / Math.log(spec.max / lo))
  }
  if (spec.max === spec.min) return 0
  return Math.max(0, Math.min(1, (value - spec.min) / (spec.max - spec.min)))
}
export function fromNorm(spec: ParamSpec, t: number): number {
  const c = Math.max(0, Math.min(1, t))
  if (spec.curve === 'exp') {
    const lo = spec.min > 0 ? spec.min : Math.max(spec.max / 1000, 1e-4)
    if (c === 0) return spec.min
    return lo * Math.pow(spec.max / lo, c)
  }
  const v = spec.min + (spec.max - spec.min) * c
  return v
}

// ── enum / stepped params ────────────────────────────────────────────
// ParamSpec has no enum metadata; the meanings live in each engine's header.
// Encode the important ones so a knob shows LADDER/SVF instead of 0/1.
const ENUM_LABELS: Record<string, string[]> = {
  'va:shape': ['SAW', 'SQR', 'TRI', 'SIN'],
  'va:filterType': ['LADDER', 'SVF'],
  'modal:material': ['BAR', 'MEMB', 'BELL', 'GLASS', 'WOOD'],
  'noise:color': ['WHITE', 'PINK', 'BROWN', 'VELVET', 'CRACKLE'],
  'noise:filterMode': ['LP', 'BP', 'HP'],
  'wavetable:filter': ['OFF', 'ON'],
  'formant:vowel': ['A', 'E', 'I', 'O', 'U']
}
// Params that snap to whole integers (indexed / stepped) rather than continuous.
const STEPPED = new Set([
  'va:shape', 'va:filterType', 'modal:material', 'noise:color', 'noise:filterMode',
  'wavetable:filter', 'fm:ops', 'fm:algorithm', 'westcoast:foldStages'
])

export function isStepped(engineId: string, name: string): boolean {
  return STEPPED.has(`${engineId}:${name}`)
}
export function enumLabels(engineId: string, name: string): string[] | null {
  return ENUM_LABELS[`${engineId}:${name}`] ?? null
}

/** Human label for a value: enum name, or magnitude-aware number + unit. */
export function formatValue(engineId: string, spec: ParamSpec, value: number): string {
  const labels = enumLabels(engineId, spec.name)
  if (labels) {
    const i = Math.max(0, Math.min(labels.length - 1, Math.round(value)))
    return labels[i]
  }
  if (isStepped(engineId, spec.name)) return String(Math.round(value))
  const a = Math.abs(value)
  let s: string
  if (a >= 1000) s = `${(value / 1000).toFixed(1)}k`
  else if (a >= 100) s = value.toFixed(0)
  else if (a >= 10) s = value.toFixed(1)
  else if (a >= 1) s = value.toFixed(2)
  else if (a === 0) s = '0'
  else s = value.toFixed(2)
  return spec.unit && a < 1000 ? `${s}${spec.unit === 's' ? 's' : spec.unit === 'Hz' ? '' : ''}` : s
}

/** Short display name for a knob (trim operator/partial suffixes into a tag). */
export function shortName(name: string): string {
  const op = /^(ratio|level|fixed)(\d+)$/.exec(name)
  if (op) return `${op[1].slice(0, 3).toUpperCase()}${op[2]}`
  const pt = /^(partial|target|detune)(\d+)$/.exec(name)
  if (pt) return `${pt[1][0].toUpperCase()}${pt[2]}`
  return name.length > 8 ? name.slice(0, 8) : name
}

// ── page plan ────────────────────────────────────────────────────────
export interface KnobPage { id: string; label: string; specs: ParamSpec[] }

const AMP_ENV = ['attack', 'decay', 'sustain', 'release']
const FILT_ENV = ['fAttack', 'fDecay', 'fSustain', 'fRelease']
const MOD_ENV = ['mAttack', 'mDecay', 'mSustain', 'mRelease']

/**
 * Split an engine's ParamSpec[] into labelled pages sized for the circular knob
 * wheel. Envelopes get their own pages; FM operators paginate 2-per-page;
 * additive partials paginate by 12 level knobs.
 */
export function buildPages(engineId: string, specs: ParamSpec[]): KnobPage[] {
  const byName = new Map(specs.map(s => [s.name, s]))
  const opNums = new Set<number>()
  const partNums = new Set<number>()
  for (const s of specs) {
    const op = /^(?:ratio|level|fixed)(\d+)$/.exec(s.name)
    if (op) opNums.add(Number(op[1]))
    const pt = /^partial(\d+)$/.exec(s.name)
    if (pt) partNums.add(Number(pt[1]))
  }
  const isEnv = (n: string) => AMP_ENV.includes(n) || FILT_ENV.includes(n) || MOD_ENV.includes(n)
  const isOp = (n: string) => /^(?:ratio|level|fixed)\d+$/.test(n)
  const isPart = (n: string) => /^(?:partial|target|detune)\d+$/.test(n)

  const core = specs.filter(s => !isEnv(s.name) && !isOp(s.name) && !isPart(s.name))
  const pages: KnobPage[] = []

  // CORE — grouped by function, split if it overflows one wheel (>13)
  const sortedCore = [...core].sort((a, b) => groupOrder(a.name) - groupOrder(b.name))
  if (sortedCore.length <= 13) {
    pages.push({ id: 'core', label: 'SOUND', specs: sortedCore })
  } else {
    const half = Math.ceil(sortedCore.length / 2)
    pages.push({ id: 'core', label: 'SOUND', specs: sortedCore.slice(0, half) })
    pages.push({ id: 'core2', label: 'SOUND II', specs: sortedCore.slice(half) })
  }

  // Envelopes
  const amp = AMP_ENV.map(n => byName.get(n)).filter(Boolean) as ParamSpec[]
  const filt = FILT_ENV.map(n => byName.get(n)).filter(Boolean) as ParamSpec[]
  const mod = MOD_ENV.map(n => byName.get(n)).filter(Boolean) as ParamSpec[]
  if (amp.length) pages.push({ id: 'amp', label: filt.length || mod.length ? 'AMP ENV' : 'ENV', specs: amp })
  if (filt.length) pages.push({ id: 'filt', label: 'FILTER ENV', specs: filt })
  if (mod.length) pages.push({ id: 'mod', label: 'MOD ENV', specs: mod })

  // FM operators — 2 ops per page (ratio/level/fixed each)
  const ops = [...opNums].sort((a, b) => a - b)
  for (let i = 0; i < ops.length; i += 2) {
    const grp = ops.slice(i, i + 2)
    const specsForOps: ParamSpec[] = []
    for (const op of grp) {
      for (const pfx of ['ratio', 'level', 'fixed']) {
        const s = byName.get(`${pfx}${op}`); if (s) specsForOps.push(s)
      }
    }
    pages.push({ id: `op${grp[0]}`, label: grp.length > 1 ? `OP ${grp[0]}·${grp[1]}` : `OP ${grp[0]}`, specs: specsForOps })
  }

  // Additive partials — 12 level knobs per page
  const parts = [...partNums].sort((a, b) => a - b)
  for (let i = 0; i < parts.length; i += 12) {
    const grp = parts.slice(i, i + 12)
    const specsForParts = grp.map(n => byName.get(`partial${n}`)).filter(Boolean) as ParamSpec[]
    pages.push({ id: `part${grp[0]}`, label: `PARTIALS ${grp[0]}–${grp[grp.length - 1]}`, specs: specsForParts })
  }

  return pages
}

const GROUP_ORDER = ['pitch', 'tone', 'filter', 'space', 'mod', 'env', 'fx', 'level']
function groupOrder(name: string): number {
  const g = paramGroup(name)
  const i = GROUP_ORDER.indexOf(g)
  return i < 0 ? 99 : i
}

export function knobColor(name: string): string {
  return groupColor(paramGroup(name))
}
