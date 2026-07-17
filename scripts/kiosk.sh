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

# Avoid a second instance if more than one autostart hook fires (labwc + XDG).
if pgrep -f "sigil-kiosk-instance" >/dev/null 2>&1; then
  exit 0
fi
export SIGIL_KIOSK_TAG="sigil-kiosk-instance"

# Wait for the hub server to accept connections before opening the browser.
for _ in $(seq 1 60); do
  if curl -sf "${URL}" >/dev/null 2>&1; then break; fi
  sleep 1
done

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
FLAGS=(
  --kiosk
  --app="${URL}"
  --class=sigil-kiosk-instance
  --user-data-dir="${HOME}/.config/sigil-kiosk"
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
)

# Relaunch on exit/crash. systemd keeps the server alive; this keeps the UI alive.
while true; do
  "$CHROME" "${FLAGS[@]}" "${URL}" >/dev/null 2>&1 || true
  sleep 2
done
