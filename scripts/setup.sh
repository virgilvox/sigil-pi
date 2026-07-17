#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# SIGIL PI — one-command Raspberry Pi setup
#
#   git clone https://github.com/virgilvox/sigil-pi.git
#   cd sigil-pi
#   ./scripts/setup.sh
#   sudo reboot
#
# Turns a fresh Raspberry Pi (4 or 5) + round LCD into a kiosk that boots
# straight into the game hub, runs on boot, and restarts on crash. Routes
# audio through a SunFounder Fusion HAT+ if present. Idempotent — safe to
# re-run. Works for both the 4" and 5" round displays (the app is
# resolution-independent; no per-display config needed).
#
# Flags:
#   --no-audio      Skip Fusion HAT audio setup (plain Pi / different audio)
#   --update        git pull + rebuild + restart services, then exit
#   --port <n>      Hub server port (default 8080)
#   --no-kiosk      Install the server only; don't touch boot/kiosk/autologin
#   -h | --help     Show this help
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

# ---- args -----------------------------------------------------------
PORT=8080
DO_AUDIO=1
DO_KIOSK=1
UPDATE_ONLY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --no-audio) DO_AUDIO=0 ;;
    --no-kiosk) DO_KIOSK=0 ;;
    --update)   UPDATE_ONLY=1 ;;
    --port)     PORT="${2:?--port needs a value}"; shift ;;
    -h|--help)  grep -E '^#' "$0" | grep -v '^#!' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

# ---- context resolution --------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
  RUN_USER="${SUDO_USER:-root}"
else
  SUDO="sudo"
  RUN_USER="$(id -un)"
fi
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
RUN_HOME="${RUN_HOME:-$HOME}"
DROPINS="${RUN_HOME}/sigil-games"

# Run a command as the target (non-root) user, wherever we started from.
as_user() {
  if [ "$(id -u)" -eq 0 ]; then sudo -u "$RUN_USER" -H "$@"; else "$@"; fi
}

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }

say "SIGIL PI setup"
info "repo:   $REPO_DIR"
info "user:   $RUN_USER  (home: $RUN_HOME)"
info "port:   $PORT"
info "audio:  $([ "$DO_AUDIO" = 1 ] && echo 'Fusion HAT+' || echo 'skipped')"

# ---- node discovery helper -----------------------------------------
node_bin() { command -v node || echo /usr/bin/node; }

# ═══════════════════════════════════════════════════════════════════
# UPDATE MODE — pull, rebuild, restart, done.
# ═══════════════════════════════════════════════════════════════════
if [ "$UPDATE_ONLY" = 1 ]; then
  say "Updating"
  as_user git -C "$REPO_DIR" pull --ff-only
  as_user bash -lc "cd '$REPO_DIR' && npm ci && npm run build"
  $SUDO systemctl restart sigil-server.service || true
  info "Reloading kiosk browser…"
  pkill -f sigil-kiosk-instance || true
  say "Update complete."
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════
# 1. System packages
# ═══════════════════════════════════════════════════════════════════
say "Installing system packages"
$SUDO apt-get update -y
$SUDO apt-get install -y git curl ca-certificates unclutter x11-xserver-utils \
  || info "(some optional packages may be unavailable; continuing)"

# Chromium: package name differs across images.
if ! command -v chromium-browser >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1; then
  $SUDO apt-get install -y chromium-browser || $SUDO apt-get install -y chromium || true
fi

# ---- Node.js (need >=18; install NodeSource 20 LTS if missing/old) --
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  [ "$NODE_MAJOR" -ge 18 ] && NEED_NODE=0
fi
if [ "$NEED_NODE" = 1 ]; then
  say "Installing Node.js 20 LTS"
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi
info "node: $(node -v)  npm: $(npm -v)"

# ═══════════════════════════════════════════════════════════════════
# 2. Fusion HAT+ audio  (Pi 5 has no analog jack; route via the HAT's I2S)
# ═══════════════════════════════════════════════════════════════════
if [ "$DO_AUDIO" = 1 ]; then
  say "Configuring Fusion HAT+ audio"
  if ! command -v fusion_hat >/dev/null 2>&1; then
    info "Installing SunFounder fusion-hat tool…"
    curl -sSL https://raw.githubusercontent.com/sunfounder/fusion-hat/v1/install.sh | $SUDO bash \
      || info "(fusion-hat install failed — continuing; re-run with the HAT attached)"
  fi
  if command -v fusion_hat >/dev/null 2>&1; then
    $SUDO fusion_hat speaker enable            || true
    $SUDO fusion_hat speaker setup --setup-test || $SUDO fusion_hat speaker setup || true
    info "Fusion HAT speaker configured. Test later with: fusion_hat speaker test"
  else
    info "fusion_hat not available; skipping. (Use --no-audio to silence this.)"
    DO_AUDIO=0
  fi
fi

# ═══════════════════════════════════════════════════════════════════
# 3. Build the app
# ═══════════════════════════════════════════════════════════════════
say "Building the app"
as_user bash -lc "cd '$REPO_DIR' && npm ci && npm run build"

# ═══════════════════════════════════════════════════════════════════
# 4. Drop-in games folder (seeded once with the bundled examples)
# ═══════════════════════════════════════════════════════════════════
say "Preparing drop-in games folder"
as_user mkdir -p "$DROPINS"
if [ -z "$(ls -A "$DROPINS" 2>/dev/null)" ] && [ -d "$REPO_DIR/dropins" ]; then
  as_user cp -n "$REPO_DIR"/dropins/* "$DROPINS"/ 2>/dev/null || true
  info "Seeded $DROPINS with example drop-ins."
fi
info "Drop new single-file HTML games into: $DROPINS  (then refresh — no rebuild)"

# ═══════════════════════════════════════════════════════════════════
# 5. systemd services
# ═══════════════════════════════════════════════════════════════════
NODE_BIN="$(node_bin)"

say "Installing hub server service"
$SUDO tee /etc/systemd/system/sigil-server.service >/dev/null <<UNIT
[Unit]
Description=SIGIL PI game hub server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${REPO_DIR}
Environment=PORT=${PORT}
Environment=HOST=127.0.0.1
Environment=SIGIL_DROPINS=${DROPINS}
ExecStart=${NODE_BIN} ${REPO_DIR}/server/index.mjs
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

if [ "$DO_AUDIO" = 1 ]; then
  say "Installing audio-enable service"
  # The Fusion HAT amp must be re-enabled on each boot before playback.
  $SUDO tee /etc/systemd/system/sigil-audio.service >/dev/null <<UNIT
[Unit]
Description=Enable SunFounder Fusion HAT speaker
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 -c "from fusion_hat import device; device.enable_speaker()"
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
UNIT
fi

$SUDO systemctl daemon-reload
$SUDO systemctl enable --now sigil-server.service
[ "$DO_AUDIO" = 1 ] && $SUDO systemctl enable --now sigil-audio.service || true
info "Hub server: http://127.0.0.1:${PORT}  (systemctl status sigil-server)"

# ═══════════════════════════════════════════════════════════════════
# 6. Kiosk autostart + boot-to-desktop autologin
# ═══════════════════════════════════════════════════════════════════
if [ "$DO_KIOSK" = 1 ]; then
  say "Configuring kiosk autostart"
  chmod +x "$REPO_DIR/scripts/kiosk.sh"
  KIOSK="SIGIL_PORT=${PORT} ${REPO_DIR}/scripts/kiosk.sh"

  # Boot to the desktop with autologin so a graphical session (with working
  # audio) exists for the kiosk browser.
  if command -v raspi-config >/dev/null 2>&1; then
    $SUDO raspi-config nonint do_boot_behaviour B4 || true   # B4 = Desktop Autologin
  fi

  # Install autostart for whichever session manager is in use. Writing all of
  # them is harmless — kiosk.sh guards against launching twice.
  # labwc (Pi 5 / Bookworm default)
  as_user mkdir -p "$RUN_HOME/.config/labwc"
  LABWC="$RUN_HOME/.config/labwc/autostart"
  as_user touch "$LABWC"
  grep -q 'sigil-pi/scripts/kiosk.sh' "$LABWC" 2>/dev/null || \
    echo "${KIOSK} &" | as_user tee -a "$LABWC" >/dev/null

  # wayfire (Pi 4 Bookworm)
  WAYFIRE="$RUN_HOME/.config/wayfire.ini"
  if [ -f "$WAYFIRE" ] && ! grep -q 'kiosk.sh' "$WAYFIRE"; then
    printf '\n[autostart]\nsigil = %s\n' "$KIOSK" | as_user tee -a "$WAYFIRE" >/dev/null
  fi

  # XDG autostart (X11 / LXDE fallback)
  as_user mkdir -p "$RUN_HOME/.config/autostart"
  as_user tee "$RUN_HOME/.config/autostart/sigil-kiosk.desktop" >/dev/null <<DESKTOP
[Desktop Entry]
Type=Application
Name=SIGIL PI Kiosk
Exec=${REPO_DIR}/scripts/kiosk.sh
Environment=SIGIL_PORT=${PORT}
X-GNOME-Autostart-enabled=true
DESKTOP

  info "Kiosk will launch on next boot. Test now with: ${REPO_DIR}/scripts/kiosk.sh"
fi

# ═══════════════════════════════════════════════════════════════════
say "Setup complete"
cat <<DONE

  Reboot to launch the kiosk:   sudo reboot

  Manage it:
    systemctl status sigil-server        # hub server (auto-restarts)
    ${REPO_DIR}/scripts/setup.sh --update  # pull + rebuild + restart
    fusion_hat speaker test              # verify HAT audio

  Add a game:  drop a single-file .html into  ${DROPINS}
               then refresh the screen (no rebuild needed).

  Tune the circle to your glass: two-finger swipe up → ⚙ → FIT slider.

DONE
