# SIGIL PI — Handoff

A circular-display **game/app hub** for a Raspberry Pi + round LCD. Boots into a
radial launcher; each app runs full-screen in a round CRT-styled viewport. Vue 3
+ Vite + Pinia + Vue Router. Ships as a kiosk (Node runtime server + Chromium).

- **Repo:** `github.com/virgilvox/sigil-pi` (git author: Moheeb Zara — keep it).
- **Runs fully offline** — all libs + fonts are bundled; **no CDN/network at runtime** (hard requirement for the Pi kiosk).
- **Displays:** works on 4" and 5" round panels. Everything is authored in a fixed **720×720 logical stage** that `CircularViewport` scales to the physical panel.

---

## How to run / test / deploy

```bash
npm install
npm run dev          # Vite dev server (drop-ins from ./dropins work here too)
npm run build        # vue-tsc typecheck + production build → dist/
npm start            # zero-dep Node server: serves dist + scans drop-in games
```
- Local kiosk test: `PORT=8080 SIGIL_DROPINS=~/sigil-games node server/index.mjs`, open `http://localhost:8080`, resize the window square to preview the circle.
- **Pi:** `./scripts/setup.sh` (idempotent) installs deps, Fusion HAT audio, builds, and sets up a systemd server (Restart=always) + kiosk autostart. `--update` pulls+rebuilds+restarts. See `README.md`.

---

## Architecture (key files)

- **`src/games/registry.ts`** — single source of truth for baked apps (`BAKED_GAMES`: `{id,name,route,color,description,source,order,icon?,component,props?}`). Router, home menu, and app-switcher all derive from it. Add a baked app = one entry + a component.
- **Drop-in games** — single-file HTML dropped in `~/sigil-games` (or `./dropins` in dev) auto-register with **no rebuild**. `server/scan.mjs` scans + parses optional `<meta name="sigil:*">`; `server/index.mjs` serves them; `useGameCatalog.ts` merges baked + drop-in. Hosted in a sandboxed iframe via `src/games/DropinHost.vue`.
- **`src/components/core/CircularViewport.vue`** — the 720 logical stage, scaled by `--stage-scale` (= displaySize/720 × bezel `--game-scale`). All games wrap in it. `src/stores/global.ts` computes the CSS vars (`detectDisplaySize`, `setGameScale`, `setDiameterOverride`).
- **CRT** — `src/styles/crt.css` (global, imported in `main.ts`) is a **16-layer phosphor-grid + scanline** stack ported from the junk-mage reference. Bloom/halation/tint route through CSS vars that **default to neutral white**; a game overrides them on its root to theme the glow (junk-mage sets green). `CRTOverlay.vue` renders the layer divs; performance mode drops the heavy animated ones.
- **Selector** — `useSwitcherLayout.ts` (adaptive concentric rings + paging, shared by home + switcher), `useMonogram.ts`, `AppGlyph.vue` (renders sigil-style SVG icons from `src/games/appIcons.ts`, monogram fallback). `RadialMenu.vue` (home), `AppSwitcher.vue` (in-game overlay opened by the always-present bottom handle in `App.vue`; the old two-finger swipe-up gesture was removed — it conflicted with multi-touch games — leaving only the handle + an `m`/`Esc` desktop shortcut).

### Audio / bellowsjs

- **`bellowsjs@0.1.5`** is an npm dependency (bundled; worklet loads via inline blob → offline-safe). **The full bellows source repo is at `/Users/obsidian/Projects/ossuary-projects/bellowsjs`** — its `apps/workbench/` is the reference web app (see below).
- **`src/composables/useBellows.ts`** — thin non-reactive wrapper: `boot()` (idempotent, needs a gesture), `voice/registerVoice`, `onStep` (forwards the clock's real subdivision index), transport (`start/stop/setBpm/setSwing`), `analyser/meter`, `teardown` (unsub → panic → dispose). **Hard rules:** audio objects (`Bellows`/`Instrument`/`AudioContext`) live in closures, never in a `ref`; `Instrument` has **no dispose** (pool voices forever); fx params are numbers only; unknown engine params are ignored — use the REAL names.
- Bellows-backed apps: **ORRERY** (`src/components/orrery/`, radial step sequencer), **SYNTH LAB** (`src/components/synth-lab/`, 3-mode), **NULL SYNTH** (`src/stores/null-synth.ts`, ported to `va` voices), and **Sigil/Sigil+** SFX + euclidean music (`src/composables/useSigilAudio.ts`).

---

## What exists (apps)

| App | id | Notes |
|---|---|---|
| SIGIL / SIGIL+ | `sigil-lite` / `sigil-full` | 2-player circular duel. **Multitouch** (per-touch pointer map). Sigil+ has bellows SFX + a randomized **euclidean** high-energy backing track. |
| JUNK MAGE | `junk-mage` | Roguelike. **Matched to its reference** (`~/Downloads/junk-mage-circular (1).html`) — screens, combat layout, HP arcs, particles, and the green-tinted CRT. |
| NULL ARCANA | `null-arcana` | Digital-tarot oracle. Sigils **scattered across 3 concentric rings** like the reference. |
| NULL SYNTH | `null-synth` | Sigil sound machine, **ported to bellowsjs** (6 `va` suit voices, clock sequencer). UI unchanged. |
| ORRERY | `orrery` | Radial multi-track step sequencer (bellows). Solid. |
| SYNTH LAB | `synth-lab` | **3-mode bellows synth** (BENCH/PLAY/SEQ). Overhauled: colorful + coherent, faithful to the bellows workbench (see below). |
| COMPOSER | `composer` | **Generative ensemble** — the bellows workbench's seeded composer on the circle: 6 auto-generated voice tracks as concentric lamp rings, mood selector, compose/evolve, per-track voice strips. |
| GROMMET | `grommet` | **Muse EEG brainwave companion**, baked from a self-contained HTML app. Served as a static asset (`public/games/grommet.html`) in a **non-sandboxed** iframe (`GrommetGame.vue`) with `allow="bluetooth"` so a real Muse connects; graceful demo without one. Fully offline (fonts inlined). **Silent BLE reconnect** (see below). |
| WASHER | `washer` | **Pan/tilt laser rig console** (round aim graticule, phosphor trail, servo/beam settings), baked from a self-contained HTML app (`public/games/washer.html`, `WasherGame.vue`), non-sandboxed iframe `allow="bluetooth; serial"`. Talks the rig's line protocol over **Web Bluetooth (Nordic UART)** or **Web Serial**. **Silent BLE reconnect** (see below). Fully offline (no external scripts/fonts). |
| VIDEOS / IMAGES | `videos` / `images` | **Swipe-through galleries** for whatever is dropped into `public/videos` / `public/images` — auto-detected at runtime (drop a file, refresh, it appears; media stays **gitignored**). One `MediaViewerGame.vue` (`kind` prop) renders **only the current item** (keyed by url so swiping releases the previous element's memory). Videos autoplay with audio + mute; a **FILL/FIT** button toggles crop-to-circle vs contain; swipe or arrows page. See below. |
| CARROM | `carrom` | Physics board game. **Board now fills the round viewport** (surface/wall 322, corner pockets at the diagonal wall). 2 or 4 player via a **player→zone map** (`strikerZone`) so 2-player sit ACROSS; 4-player = 2v2 teams (teammates across). |
| PRIZE WHEEL | `prize-wheel` | Spin-to-win. **Sound** via `useSFX`: a tick per segment crossing (rate follows speed) + a victory jingle on settle. |
| SIGIL ENGINE | `sigil-engine` | Rune-ring alignment puzzle. **Fixed** the pointer→720-space mapping (grabbing/rotating rings was broken off-720), added a **ratchet click** per detent as rings turn. |
| ROBOT FACE | `robot-face` | Virtual pet. Working. |
| PULSE (`dropins/pulse-demo.html`) | drop-in | Resonant tap toy — full-spectrum per-pulse color, four instruments (waveform+filter) on pentatonic notes, and spark+chime bursts when ripples intersect. Self-contained offline drop-in (the reference for authoring one). |

---

## Color system (whole app)

- **`src/styles/palette.ts`** — the shared color source. Deep-indigo substrate (`BG`), warm-bone text (`INK`), `stageGradient()` for canvas backdrops, **pitch-class → hue** (`pcHue`/`noteColor`/`noteGlow`, circle-of-fifths spread so the same note is always the same color), **engine → hue** (`ENGINE_COLOR`), **family → hue** (`FAMILY_COLOR`), **param-group → hue** (`GROUP_COLOR` + `paramGroup()` name heuristic), `TRACK_COLORS` for SEQ, and color utils (`withAlpha` handles hex/rgb/**hsl**, `mix`). `main.css` mirrors the substrate in CSS vars.
- The home `RadialMenu` + in-game `AppSwitcher` share a rotating **spectrum aura**, glowing gradient discs, popping glyphs (`AppGlyph` has a blurred glow under-layer), gradient title, and a green **LIVE** badge on the current app.

## SYNTH LAB internals (overhauled)

- **`src/components/synth-lab/params.ts`** — curve-aware `toNorm`/`fromNorm` (mirrors the bellows workbench `toSlider`/`fromSlider`), enum labels + `isStepped`, `formatValue`, and **`buildPages()`** which splits any engine's `ParamSpec[]` into wheel-sized pages (SOUND / envelopes / **FM operator pages** / **additive partial pages**).
- **`stores/synth-lab.ts`** — full 17-engine catalogue + `engineMeta`; BENCH param editing + **fx rack** (`benchFx`, add/remove/param over all 19 effects via `inst.fx(...)`/`inst.fxParam`); full **preset bank** browsing across 8 families; the **PLAY note engine** (ledger keyed by pointer, sustain-defer, mono legato glide for string/tube presets via `param('freq', freqOf)`, multitouch polyphony, `activeNotes` lighting); SEQ per-step-instrument; `analyser()`/`meterFrame()` passthrough. Same bellows rules as before (audio objects in closures, pooled voices, numbers-only fx).
- **BENCH** = engine picker grid + color-coded curve-aware circular knobs (paged) + fx rack sheet + audition. **PLAY** = the liked radial scale wheel filling the disc; the center **hub is the sound-browser trigger** (PRESETS + any of the 17 raw ENGINES), SUS/LEG toggles tuck into the lower corners, a slim bottom bar holds the sound-cycle arrows, and **octave is an arc slider hugging the left rim** (`ARC_R 322`, ±3 across 15° detents centered on due-west; tap a rung or drag the thumb). The slider is visual-only SVG — its **hit-testing rides the keyboard surface** (`inOctBand`/`setOctaveFromXY` in `onDown`/`onMove`, `octPtr` + pointer capture) so it reuses the correct 720-space mapping and doesn't fight the SVG's pointer-events; per-pitch-class hues + active/sustained glow. **SEQ** = vivid tracks, glowing steps, playhead, arm-preview, euclid. **`ScopeStrip.vue`** = shared always-on scope + level meter.

### COMPOSER (`src/components/composer/`, `stores/composer.ts`, `composables/useComposer.ts`)

Round-LCD port of the bellows workbench generative composer. `useComposer.ts` is a faithful port of the `Composer` brain (chord progression, markov melody lanes with chord-tone gravity, nearest-motion pad voicings, euclid gates, drum kit) — the generative helpers (`buildProgression`/`buildStepwiseMatrix`/`weightedWalk`/`voiceLead`/`detectChord`) are all exported from `bellowsjs`. **Kiosk adaptations:** the composition seed is folded into every `b.rng()` label so a new seed reshuffles the piece *without* re-booting bellows or leaking (undisposable) voices — `Composer.reseed()` rebuilds only the score, reusing voices/buses; the registered test-tone `granular` engine is remapped to `wavetable` (`usableEngine`). Six voice tracks render as concentric 16-step lamp rings; tap a ring for its voice strip (engine swap, euclid HITS/ROT, octave, level, dly/vrb sends, macros, mute), tap the hub to play. `setMood` only swaps the voices whose engine actually changed (leak-safe).

### Media galleries (VIDEOS / IMAGES)

- **`server/media.mjs`** scans `public/videos` & `public/images` at runtime (case-insensitive extensions, natural sort, hidden-file filter). **`server/index.mjs`** exposes `/api/media/{videos,images}` (JSON listings) and serves the raw files with **HTTP Range (206)** so large videos stream instead of buffering; `vite.config.ts` mirrors the listing endpoints in dev (Vite's publicDir serves the files, with Range). `MediaViewerGame.vue` fetches the list and renders one keyed element at a time.
- **Media files are gitignored** (`/public/videos/*`, `/public/images/*`, only `.gitkeep` tracked) — the folders are the runtime drop location, not repo content. `SIGIL_MEDIA` overrides the base dir.
- Note: `vite.config.js` + `vite.config.d.ts` were stale compiled artifacts shadowing `vite.config.ts` (Vite resolves `.js` first) — removed. If they ever reappear, the dev media endpoints silently stop working.

### Bluetooth: silent reconnect (GROMMET + WASHER)

After the first pairing Chromium can remember the device, so the (top-left, awkward on a round LCD) picker doesn't have to reappear. On connect, both apps try `navigator.bluetooth.getDevices()` first and `gatt.connect()` to a remembered device silently (each attempt bounded by a 7s timeout so a powered-off device can't wedge the flow), falling back to the `requestDevice()` picker only when nothing remembered responds (`museAttach`/`bleAttach` hold the shared attach logic). This needs persisted BLE grants: `scripts/kiosk.sh` launches Chromium with `--enable-experimental-web-platform-features` (exposes Web Bluetooth on Linux) **and** `--enable-features=WebBluetoothNewPermissionsBackend` (the launch-flag form of `chrome://flags/#enable-web-bluetooth-new-permissions-backend`).

## Known issues / next-up

**CRT perf:** the new 16-layer CRT is heavier; `performanceMode` drops the animated layers. Verify frame rate on the actual Pi; trim default layers if needed. The new selector auras + synth glows are cheap (CSS blur / canvas), but re-check on-device.

---

## Conventions / constraints

- **No Claude/AI attribution in commits, ever** (no `Co-Authored-By`, no mentions). Author stays Moheeb Zara.
- **Fully offline** — never add a CDN/Google-Fonts/`https://` runtime dependency. Fonts are `@fontsource/*`; bellows is bundled.
- **Round 720 logical space** for all UI; map pointer coords via the canvas/element rect so they survive `--stage-scale`.
- **bellows rules** (above): non-reactive audio objects, gesture-boot, pool voices, real param names, numbers-only fx.
- Verify in a browser (drive the actual flow), and for nontrivial work run an **adversarial review** before finishing.

## Reference material

- **bellows repo:** `/Users/obsidian/Projects/ossuary-projects/bellowsjs` — `apps/workbench/src/` (the web workbench + instrument pages to translate), `packages/bellows/src/` (engines, fx, theory, seq, presets: `INSTRUMENT_PRESETS`/`getPreset`/`presetsByFamily`, `Scale`, `euclid`, `Arpeggiator`, `listEngines`). It's live at https://bellows.live (offline reference only).
- **junk-mage reference:** `/Users/obsidian/Downloads/junk-mage-circular (1).html`.
