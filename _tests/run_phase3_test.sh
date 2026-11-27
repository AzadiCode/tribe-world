#!/bin/bash
# Phase 3 full test: fresh server world → demo city → phase-3 functional district → real UI test
set -e
cd "$(dirname "$0")/../project/tribe-world-main"
pkill -f "python3 app.py" 2>/dev/null || true
pkill -f "python app.py" 2>/dev/null || true
sleep 1
ADMIN_KEY=testkey nohup python3 app.py > /tmp/server.log 2>&1 &
sleep 3
cd /home/z/my-project/scripts
python3 build_demo_city.py | tail -1
python3 build_phase3.py | tail -4
export NODE_PATH=/home/z/.npm-global/lib/node_modules
node test_phase3_ui.js
