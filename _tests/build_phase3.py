#!/usr/bin/env python3
"""Phase 3 verification scene: the 7 functional buildings placed around the demo city
(west/south of HQ) via the admin API — school/warehouse north of the street, workshop/
store/clinic south, mill by the vertical street, park near the banner. All ar=True
(auto-face the road) except the symmetric turbine."""
import json, urllib.request

BASE = "http://localhost:10000"
KEY = "testkey"


def api(path, method="POST", body=None, token=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 headers={"Content-Type": "application/json"})
    if token:
        req.add_header("X-Admin-Token", token)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(json.loads(e.read().decode()).get("error", e.read().decode()))


tok = api("/api/admin/login", "POST", {"key": KEY})["token"]
w = api("/api/world?since=0", "GET", token=tok)
hq = next((b for b in w["buildings"] if b["type"] == "hq"), None)
hx, hz = hq["x"], hq["z"]
print("HQ at", hx, hz, "| existing buildings:", len(w["buildings"]))

# ── planned spots (sub-cells, relative to HQ) — verified against the demo-city layout
plans = [
    ("school", hx - 64, hz),        # شمال خیابان افقی، رو به جنوب (جفت خانه‌های غربی)
    ("warehouse", hx - 80, hz),
    ("workshop", hx - 64, hz + 32),  # غربی‌ترین خانهٔ ردیف جنوبی
    ("store", hx - 80, hz + 40),
    ("clinic", hx - 16, hz + 40),
    ("mill", hx - 32, hz - 8),       # شمال خیابان عمودی
    ("park", hx + 8, hz + 40),          # جنوب شرقی، رو به جاده/خانه‌ها
]
FOOT = {"school": 14, "warehouse": 12, "workshop": 10, "store": 14, "clinic": 10, "mill": 8, "park": 12}
removed = 0
for b in list(w["buildings"]):
    if b["type"] != "tree":
        continue
    for (t, gx, gz) in plans:
        d = FOOT[t]
        if abs(b["x"] - gx) <= d // 2 + 1 and abs(b["z"] - gz) <= d // 2 + 1:
            api("/api/admin/building/%d" % b["id"], "DELETE", None, tok)
            removed += 1
            break
print("cleared trees:", removed)

items = [{"type": t, "x": x, "z": z, "rot": 0, "ar": True} for (t, x, z) in plans if t != "mill"]
items += [{"type": "mill", "x": hx - 32, "z": hz - 8, "rot": 0}]
try:
    res = api("/api/admin/buildings/batch", "POST", {"items": items, "free": True}, tok)
    print("built:", len(res.get("buildings", [])), "of", len(items))
    for b in res.get("buildings", []):
        print("  ", b["type"], "at", b["x"], b["z"], "rot", b["rot"])
except RuntimeError as e:
    print("BATCH FAILED:", e)
    raise SystemExit(1)

# ── negative checks (generic rules still hold for the new types)
try:
    api("/api/admin/building", "POST", {"type": "park", "x": hx - 64, "z": hz, "free": True}, tok)
    print("NEGATIVE FAIL: park placed on occupied school spot!")
except RuntimeError as e:
    print("overlap rejected:", e)
try:
    api("/api/admin/building", "POST", {"type": "mill", "x": hx - 32, "z": hz, "free": True}, tok)
    print("NEGATIVE FAIL: mill placed on road tile!")
except RuntimeError as e:
    print("road-tile overlap rejected:", e)

w2 = api("/api/world?since=0", "GET", token=tok)
counts = {t: sum(1 for b in w2["buildings"] if b["type"] == t) for (t, _, _) in plans}
print("final counts:", counts)
