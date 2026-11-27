#!/bin/bash
# Phase 2 full test: fresh server world → demo city → phase-1 defenses → phase-2 UI test
set -e
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPTS_DIR/../project/tribe-world-main"
pkill -f "python3 app.py" 2>/dev/null || true
sleep 1
ADMIN_KEY=testkey nohup python3 app.py > /tmp/server.log 2>&1 &
sleep 3
cd "$SCRIPTS_DIR"
python3 build_demo_city.py | tail -1
python3 build_defense.py | grep -E "built|rejected" | head -3
export NODE_PATH=/home/z/.npm-global/lib/node_modules
node test_phase2_ui.js
