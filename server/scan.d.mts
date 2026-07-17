// Type declarations for the plain-ESM drop-in scanner (runs under Node at runtime,
// imported by vite.config.ts at build time).

export interface DropinManifestEntry {
  id: string
  name: string
  file: string
  color?: string
  description?: string
  order?: number
}

export function dropinsDir(): string
export function scanDropins(dir?: string): Promise<DropinManifestEntry[]>
