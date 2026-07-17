# Kickoff prompt — SYNTH + selector overhaul (paste into a fresh session)

---

ultracode — go deep and be thorough. Read `HANDOFF.md` at the repo root first; it
has the full architecture, conventions, and the exact reference locations. This is
a design-and-build push, so use workflows to research + design before implementing,
browser-verify every screen, and run an adversarial review before you finish.

**Mission:** the bellows/synth experience is janky, confusing, and too dark, and the
selector is flat. Make the whole app **more colorful and less dark**, make the synth
**coherent and genuinely good**, and **faithfully translate the bellows web app's
workbench + instrument pages onto the round 720 display.**

**Study the reference deeply (this is the core of the task).** The full bellows repo
is at `/Users/obsidian/Projects/ossuary-projects/bellowsjs`. Read and understand how
its web app actually works — the interaction model, the visual language, the data
flow — especially:
- `apps/workbench/src/views/WorkbenchView.vue` and `InstrumentView.vue`
- `apps/workbench/src/components/instrument/*` (EnginePicker, ParamPanel, FxRack, PianoKeyboard, LooperPanel, MidiPanel) and `components/bench/*` (TrackStrip, TransportPanel, FxPanel, MoodPanel, ScopePanel, TuningPanel, StepperField)
- `apps/workbench/src/lib/instrument-store.ts` and `bench-store.ts` (the real logic: engine/preset resolution, curve-aware param mapping `toSlider/fromSlider/formatValue`, fx chains, the note ledger, sustain, looper)
- `packages/bellows/src/` for the full capability surface (all engines + params, all fx, `INSTRUMENT_PRESETS`/`getPreset`/`presetsByFamily`, `Scale`, `euclid`, `Arpeggiator`, `listEngines`, buses/sends, scheduled param ramps, analyser/meter, offline render)

Then **rebuild/overhaul SYNTH LAB** (`src/components/synth-lab/`, `src/stores/synth-lab.ts`,
`src/composables/useBellows.ts`) so its three modes translate those pages to a circle,
crisply and beautifully — not a thin sketch. Concretely:
- **BENCH (workbench):** pick any engine, edit its FULL param surface with legible,
  color-coded circular knobs (curve-aware, grouped/paginated like FM ops / additive
  partials), add/remove effects with a real fx rack, audition on a keyboard. Match the
  workbench's capability and feel, adapted to the round screen.
- **PLAY (instrument):** KEEP the radial scale-wheel note buttons (they're liked) but
  give them real **color** (per-degree / per-octave hues, active-note glow), and back
  them with a **complete, browsable instrument list** — the full `INSTRUMENT_PRESETS`
  bank across all families, not just prev/next — with the expressive/legato/sustain
  behavior from `instrument-store.ts`, and multi-touch polyphony.
- **SEQ (per-step instrument):** keep the per-step-instrument idea but make it colorful
  and clear; consider the looper/arp/euclid affordances from the reference.
- Kill the jankiness: interactions must be coherent, smooth, in-key, and make sense.
  Fix anything that feels arbitrary. Add a live scope/meter from `b.analyser`/`b.meter`.

**Color + less dark (whole app).** Introduce a richer color system. The synth should be
vivid (color-code engines/params/notes/tracks). The **selector** (home `RadialMenu` +
`AppSwitcher`, `useSwitcherLayout.ts`, `AppGlyph.vue`/`appIcons.ts`) should be
**prettier and more thought-out** — more color, more depth, better visual hierarchy and
motion, less flat/black. Keep the sigil-style line icons but make them pop.

**Constraints (non-negotiable):**
- **Fully offline** — no CDN / Google Fonts / `https://` at runtime. bellows is bundled;
  fonts are `@fontsource/*`.
- **Round 720 logical space**; map pointer coords via the element rect so they survive
  `CircularViewport`'s `--stage-scale`.
- **bellows rules:** audio objects (`Bellows`/`Instrument`/`AudioContext`) live in
  closures, never in a `ref`; boot from a user gesture (idempotent); `Instrument` has no
  dispose — pool voices; fx params are numbers only; use REAL engine param names.
- **No Claude/AI attribution in git commits, ever.** Author stays Moheeb Zara. Commit in
  logical chunks and push to `origin/main`.

**Approach:** run the local kiosk (`PORT=8080 SIGIL_DROPINS=~/sigil-games node
server/index.mjs`, open `http://localhost:8080`, resize the window square). Design with
workflows (deep-read the bellows app, propose the circular translation + color system),
implement, verify each synth mode + the selector live in the browser, then adversarially
review the new code (bellows correctness, lifecycle/leaks, pointer state, round-display
math) and fix findings before finishing. Be exhaustive — this is a "go deep" pass.
