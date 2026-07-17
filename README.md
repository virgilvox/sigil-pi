# SIGIL PI

A circular-display **game hub** for a Raspberry Pi and a round LCD. Boots straight
into a radial launcher of small games/apps, runs full-screen as a kiosk, and lets
you switch apps mid-game with a stylized radial app-switcher.

- **Runs on a 4" _or_ 5" round LCD** — the UI is resolution-independent (renders in a
  fixed 720 logical space, scaled to fill whatever round panel is attached).
- **Raspberry Pi 4 and Pi 5** — one setup script installs, builds, runs on boot, and
  restarts on crash.
- **Audio via the SunFounder Fusion HAT+** (I2S speaker) on Pi 5, configured
  automatically.
- **Modular games** — bake them into the Vue app, or **drop a single-file HTML game
  into a folder and it auto-registers, no rebuild.**

---

## Quick start (Raspberry Pi)

```bash
git clone https://github.com/virgilvox/sigil-pi.git
cd sigil-pi
./scripts/setup.sh          # installs deps, audio, builds, enables boot kiosk
sudo reboot
```

The Pi reboots into the hub, full-screen. That's it.

Setup flags:

| Flag | Effect |
|------|--------|
| `--no-audio` | Skip Fusion HAT audio setup (plain Pi / other audio path) |
| `--update` | `git pull` + rebuild + restart services, then exit |
| `--port <n>` | Hub server port (default `8080`) |
| `--no-kiosk` | Install the server only; don't touch boot/kiosk/autologin |

Re-running `setup.sh` is safe (idempotent). To update later: `./scripts/setup.sh --update`.

---

## How it works

```
Chromium (kiosk, full-screen)
        │  http://localhost:8080
        ▼
Node hub server  (server/index.mjs, systemd: sigil-server, Restart=always)
   ├─ serves the built Vue SPA (dist/)
   ├─ GET /api/games      → scans the drop-in folder each request
   └─ GET /dropins/<file> → serves drop-in HTML (sandboxed iframe)
        ▲
        │ builds
Vue 3 + Vite app (src/)
   ├─ RadialMenu      home launcher (baked + drop-in games)
   ├─ AppSwitcher     radial switcher (two-finger swipe up / bottom handle)
   ├─ CircularViewport 720 logical stage, CSS-scaled to the panel
   └─ games/registry.ts  single source of truth for baked games
```

- **Server** is supervised by `systemd` (`sigil-server.service`, `Restart=always`).
- **Browser** is launched by the desktop autostart via `scripts/kiosk.sh`, which loops
  so a browser crash relaunches automatically.
- **Audio** on Pi 5 uses the Fusion HAT's I2S speaker. `sigil-audio.service` re-enables
  the HAT amp on each boot; the vendor `fusion_hat` tool sets it as the default sink.

---

## Switching apps

While in any app:

- **Two-finger swipe up** from the bottom, **or** tap the small **handle** at the bottom
  of the circle → opens the radial **app-switcher**.
- Tap an app to launch it. The center hub has **Home / Mute / CRT / Settings / Resume**.

(The bottom handle is always available — drop-in games run in an iframe that would
otherwise swallow the swipe gesture.)

---

## Adding games

### Option 1 — Drop-in single-file HTML (no rebuild)

Drop an `.html` file into the drop-in folder (`~/sigil-games` on the Pi, `dropins/`
in a dev checkout) and refresh. It appears in the menu automatically.

Author it for a **720 × 720** space; it's scaled to fit the panel. Metadata is optional
(defaults come from the filename + `<title>`):

```html
<title>My Game</title>
<meta name="sigil:name"        content="MY GAME">
<meta name="sigil:color"       content="#ff00aa">
<meta name="sigil:description" content="ARCADE">
<meta name="sigil:order"       content="120">
```

See [`dropins/README.md`](dropins/README.md) and the `dropins/pulse-demo.html` example.

### Option 2 — Baked-in Vue game

1. Add a component under `src/components/<id>/`.
2. Add one entry to `src/games/registry.ts` (`BAKED_GAMES`). The router, home menu,
   and app-switcher all derive from that list — no other edits needed.
3. `npm run build` (or `./scripts/setup.sh --update` on the Pi).

---

## Tuning the circle to your glass

If the content doesn't quite meet the round bezel, open the switcher → **⚙ Settings**:

- **FIT** — bezel inset (shrinks/grows the circle). Persisted per device.
- **DIAMETER** — force a pixel diameter for unusual panels (`0` = auto-detect).

---

## Development (desktop)

```bash
npm install
npm run dev        # Vite dev server (drop-ins from ./dropins work here too)
npm run build      # type-check + production build → dist/
npm start          # run the production hub server against dist/
```

- Resize the browser window to a square to preview the round layout.
- Press **`m`** (or Shift-drag up from the bottom edge) to open the app-switcher.

---

## Audio troubleshooting (Fusion HAT+)

```bash
fusion_hat speaker test          # play a test tone through the HAT
systemctl status sigil-audio     # per-boot amp enable
fusion_hat speaker setup         # re-run ALSA/Pulse config if silent
```

The Pi 5 has no analog jack — audio must go through the HAT (I2S), HDMI, or USB. The
setup script installs the vendor `fusion_hat` tool and makes the HAT the default output.
Chromium follows the system default sink.

---

## Service management

```bash
systemctl status  sigil-server      # hub server
systemctl restart sigil-server
journalctl -u sigil-server -f       # server logs
pkill -f sigil-kiosk-instance       # relaunch the kiosk browser
```
