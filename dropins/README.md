# Drop-in games

Drop a **single-file HTML game/app** into this folder and it auto-registers in the
menu — **no rebuild required**. Refresh the kiosk (or the browser) and it appears in
both the home screen and the in-game app-switcher.

On the Raspberry Pi the live drop-in folder is **`~/sigil-games`** (set via the
`SIGIL_DROPINS` environment variable by `scripts/setup.sh`). This repo-local
`dropins/` folder is the default used during development (`npm run dev`).

## Authoring

A game is just an `.html` file. Author it for a **720 × 720 logical space** — it is
rendered inside the circular viewport and scaled to whatever round panel is attached,
so it fits the 4" and 5" displays automatically.

### Optional metadata

Everything is derived from the filename + `<title>` by default. Override any of it
with `<meta>` tags anywhere in the `<head>`:

```html
<title>My Game</title>
<meta name="sigil:id"          content="my-game">     <!-- stable route id -->
<meta name="sigil:name"        content="MY GAME">     <!-- menu label -->
<meta name="sigil:color"       content="#ff00aa">     <!-- accent color -->
<meta name="sigil:description" content="ARCADE">      <!-- one-line tag -->
<meta name="sigil:order"       content="120">         <!-- sort weight (lower = first) -->
```

Games run sandboxed in an iframe (`allow-scripts allow-same-origin allow-pointer-lock
allow-forms allow-modals`, plus autoplay/gamepad/motion). Audio via the Web Audio API
follows the system output — on the Pi that's the Fusion HAT speaker.
