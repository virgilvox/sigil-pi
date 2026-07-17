// Type declarations for the plain-ESM media scanner (runs under Node at runtime,
// imported by vite.config.ts at build time).

export interface MediaItem {
  name: string
  url: string
  ext: string
}

export function mediaBase(): string
export function isMediaKind(kind: string): boolean
export function scanMedia(kind: string): Promise<MediaItem[]>
