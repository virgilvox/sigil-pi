#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# SIGIL PI kiosk launcher — starts Chromium full-screen at the local hub.
# Invoked by the desktop autostart entries that scripts/setup.sh installs.
# Loops so a browser crash relaunches automatically. The Node hub server is
# supervised separately by systemd (sigil-server.service, Restart=always).
# ═══════════════════════════════════════════════════════════════════
set -u

PORT="${SIGIL_PORT:-8080}"
URL="http://localhost:${PORT}"

# ── single instance ────────────────────────────────────────────────
# setup.sh installs autostart hooks for labwc, wayfire AND XDG; on some
# sessions more than one fires. A flock guarantees exactly one kiosk loop —
# two Chromiums sharing one --user-data-dir crash-loop over the profile lock,
# which looks exactly like "loads then keeps restarting". The pgrep is a
# secondary guard for older behaviour.
LOCK="${XDG_RUNTIME_DIR:-/tmp}/sigil-kiosk.lock"
exec 9>"$LOCK" 2>/dev/null || true
if command -v flock >/dev/null 2>&1; then
  flock -n 9 || { echo "[sigil-kiosk] another instance holds the lock; exiting" >&2; exit 0; }
fi
if pgrep -f "sigil-kiosk-instance" >/dev/null 2>&1; then
  exit 0
fi
export SIGIL_KIOSK_TAG="sigil-kiosk-instance"

# Wait for the hub server to accept connections before opening the browser.
for _ in $(seq 1 60); do
  if curl -sf "${URL}" >/dev/null 2>&1; then break; fi
  sleep 1
done

# ── crank the system volume to max every boot ──────────────────────
# Runs inside the graphical session so it reaches PipeWire (Bookworm default);
# falls back to ALSA. Chromium follows the default sink, so this makes the kiosk
# boot loud without touching per-app gain.
set_volume_max() {
  if command -v wpctl >/dev/null 2>&1; then
    wpctl set-mute @DEFAULT_AUDIO_SINK@ 0 >/dev/null 2>&1 || true
    wpctl set-volume @DEFAULT_AUDIO_SINK@ 1.0 >/dev/null 2>&1 || true
  fi
  if command -v amixer >/dev/null 2>&1; then
    for ctl in Master PCM Speaker Digital Playback Headphone Lineout; do
      amixer -q sset "$ctl" 100% unmute >/dev/null 2>&1 || true
    done
  fi
}
set_volume_max

# Hide the mouse cursor when idle (X11); harmless if unclutter is absent.
command -v unclutter >/dev/null 2>&1 && unclutter -idle 0 >/dev/null 2>&1 &

# Disable screen blanking / power management on X11 sessions.
if [ "${XDG_SESSION_TYPE:-}" = "x11" ]; then
  xset s off >/dev/null 2>&1 || true
  xset -dpms >/dev/null 2>&1 || true
  xset s noblank >/dev/null 2>&1 || true
fi

# Pick whichever Chromium binary this OS ships.
CHROME=""
for c in chromium-browser chromium chromium-browser-stable; do
  if command -v "$c" >/dev/null 2>&1; then CHROME="$c"; break; fi
done
if [ -z "$CHROME" ]; then
  echo "[sigil-kiosk] no chromium binary found" >&2
  exit 1
fi

# Kiosk flags: full-screen app, no chrome UI, no crash bubbles, no updates,
# autoplay allowed (game audio), touch-friendly, let Ozone pick X11/Wayland.
#   --password-store=basic : never prompt to unlock the login keyring on launch.
#   --enable-experimental-web-platform-features : exposes navigator.bluetooth on
#     Linux (Web Bluetooth is gated behind this flag here) so the GROMMET Muse app
#     and the WASHER rig can connect. No-op if Web Bluetooth is compiled out.
#   --enable-features=WebBluetoothNewPermissionsBackend : persists BLE grants so
#     navigator.bluetooth.getDevices() remembers a paired device — GROMMET/WASHER
#     then reconnect silently on tap instead of re-showing the top-left picker
#     (awkward on a round LCD). This is chrome://flags/#enable-web-bluetooth-new-
#     permissions-backend expressed as a launch flag.
#   --touch-events=enabled : make sure the panel is treated as a real (multi-)
#     touch device.
FLAGS=(
  --kiosk
  --app="${URL}"
  --class=sigil-kiosk-instance
  --user-data-dir="${HOME}/.config/sigil-kiosk"
  --password-store=basic
  --noerrdialogs
  --disable-infobars
  --disable-session-crashed-bubble
  --disable-features=Translate,TranslateUI
  --no-first-run
  --fast
  --fast-start
  --check-for-update-interval=31536000
  --overscroll-history-navigation=0
  --disable-pinch
  --autoplay-policy=no-user-gesture-required
  --ozone-platform-hint=auto
  --hide-scrollbars
  --enable-experimental-web-platform-features
  --enable-features=WebBluetoothNewPermissionsBackend
  --touch-events=enabled
)

# Relaunch on exit/crash. systemd keeps the server alive; this keeps the UI
# alive. Chromium output is logged (so a crash is diagnosable), and if it dies
# almost immediately we back off instead of hammering a hard failure.
LOG="${HOME}/.config/sigil-kiosk/kiosk.log"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true
while true; do
  start="$(date +%s)"
  "$CHROME" "${FLAGS[@]}" "${URL}" >>"$LOG" 2>&1 || true
  end="$(date +%s)"
  if [ "$((end - start))" -lt 5 ]; then
    echo "[sigil-kiosk] chromium exited after $((end - start))s — backing off 5s (see $LOG)" >&2
    sleep 5
  else
    sleep 2
  fi
done
