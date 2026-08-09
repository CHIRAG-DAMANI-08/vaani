#!/usr/bin/env bash
# Vaani auto-deploy: every 2 min, pull the branch you're on and restart if it moved.
# Catches pushes to ANY branch — just `git checkout <branch>` on the VM first.
set -uo pipefail

APP_DIR="$HOME/vaani"
LOG="$APP_DIR/auto-deploy.log"
LOCK="$APP_DIR/.auto-deploy.lock"

cd "$APP_DIR" || exit 1

# Don't run two deploys at once.
exec 9>"$LOCK"
flock -n 9 || { echo "$(date +%H:%M) already running, skipping" >> "$LOG"; exit 0; }

# A valid build leaves .next/BUILD_ID behind.
valid_build() { [ -f "$APP_DIR/.next/BUILD_ID" ]; }

# Track the branch we're ON — that's the one that gets deployed.
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "$(date +%H:%M) checking $BRANCH..." >> "$LOG"

git fetch origin --prune >> "$LOG" 2>&1 || { echo "$(date +%H:%M) fetch failed (network?), skipping" >> "$LOG"; exit 0; }

# 1GB box: stop the running server BEFORE building so the build gets the whole box.
stop_server() {
  pkill -f "tsx server.ts" >> "$LOG" 2>&1 || true
  sleep 1
}

deploy() {
  echo "$(date +%H:%M) deploying origin/$BRANCH..." >> "$LOG"
  git pull --ff-only origin "$BRANCH" >> "$LOG" 2>&1 || {
    echo "$(date +%H:%M) pull failed (local changes?), leaving server alone" >> "$LOG"
    exit 1
  }

  export NODE_OPTIONS="--max-old-space-size=2048"
  if git diff --name-only HEAD@{1} HEAD -- package.json package-lock.json | grep -q .; then
    stop_server
    if ! npm install >> "$LOG" 2>&1; then
      echo "$(date +%H:%M) npm install failed, not starting" >> "$LOG"
      exit 1
    fi
  else
    stop_server
  fi

  if ! npm run build >> "$LOG" 2>&1; then
    echo "$(date +%H:%M) build FAILED, server left stopped" >> "$LOG"
    exit 1
  fi

  nohup npm start >> "$APP_DIR/server.log" 2>&1 &
  disown
  echo "$(date +%H:%M) deployed and restarted" >> "$LOG"
}

# Already up to date?
if git merge-base --is-ancestor "origin/$BRANCH" HEAD 2>/dev/null; then
  if ! pgrep -f "tsx server.ts" >/dev/null; then
    echo "$(date +%H:%M) up to date but server down — starting it" >> "$LOG"
    if valid_build; then
      nohup npm start >> "$APP_DIR/server.log" 2>&1 &
      disown
    else
      # No valid build (reboot after a failed build) — rebuild first.
      deploy
    fi
  else
    echo "$(date +%H:%M) up to date, nothing to do" >> "$LOG"
  fi
  exit 0
fi

deploy
