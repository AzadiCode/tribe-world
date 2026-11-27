#!/usr/bin/env python3
"""Phase-1 verification: place wall run + towers + gate around the existing demo city via admin API.
Gate sits ON the road tile (-32,48); walls chain from both gate flanks; towers at wall ends; corner/T/end-cap tiles included."""
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
        raise RuntimeError(e.read().decode())


tok = api("/api/admin/login", "POST", {"key": KEY})["token"]

items = []
# extend the vertical street south so the road passes THROUGH the gate
for z in (40, 48, 56):
    items.append({"type": "road", "x": -32, "z": z, "rot": 0})
# gate exactly on road tile (-32,48); road runs along z -> server auto-rot should give 0
items.append({"type": "gate", "x": -32, "z": 48, "rot": 0})
# wall run EAST from the gate's east flank (straight tiles)
for wx in (-23, -19, -15, -11, -7, -3):
    items.append({"type": "wall", "x": wx, "z": 48, "rot": 0})
# tower at the east end
items.append({"type": "tower", "x": 2, "z": 48, "rot": 0})
# from the tower: wall north, then corner turning east, T-junction with a stub, end cap
for wz in (43, 39, 35):
    items.append({"type": "wall", "x": 2, "z": wz, "rot": 0})
items.append({"type": "wall", "x": 6, "z": 35, "rot": 0})   # T (N stub + E+W)
items.append({"type": "wall", "x": 10, "z": 35, "rot": 0})  # end cap (W only)
items.append({"type": "wall", "x": 6, "z": 31, "rot": 0})   # T stub (N of the T tile)
# wall run WEST from the gate's west flank + tower
for wx in (-41, -45):
    items.append({"type": "wall", "x": wx, "z": 48, "rot": 0})
items.append({"type": "tower", "x": -50, "z": 48, "rot": 0})

# clear trees that block the plan (same policy as ensure_hq)
w = api("/api/world?since=0", "GET", token=tok)
FOOT_S = {"house": (6, 6), "hq": (8, 8), "farm": (8, 8), "market": (8, 6), "tree": (2, 2),
          "road": (8, 8), "crossing": (2, 2), "banner": (6, 3), "path": (2, 2),
          "wall": (4, 4), "tower": (6, 6), "gate": (14, 6)}


def rect_of(it):
    ww, hh = FOOT_S[it["type"]]
    if it["type"] == "gate":  # two 3-wide flanks — clear trees under both
        x0 = it["x"] - ww // 2
        z0 = it["z"] - hh // 2
        return None  # handled below
    x0 = it["x"] - ww // 2
    z0 = it["z"] - hh // 2
    return x0, x0 + ww - 1, z0, z0 + hh - 1


def gate_rects(it):
    ww, hh = FOOT_S["gate"]
    x0, z0 = it["x"] - ww // 2, it["z"] - hh // 2
    return [(x0, x0 + 2, z0, z0 + hh - 1), (x0 + ww - 3, x0 + ww - 1, z0, z0 + hh - 1)]


plans = [rect_of(i) for i in items if rect_of(i)]
for i in items:
    if i["type"] == "gate":
        plans.extend(gate_rects(i))
removed = 0
for b in w["buildings"]:
    if b["type"] != "tree":
        continue
    bx0, bx1, bz0, bz1 = rect_of(b)
    if any(not (bx1 < p0 or bx0 > p1 or bz1 < p2 or bz0 > p3) for p0, p1, p2, p3 in plans):
        api("/api/admin/building/%d" % b["id"], "DELETE", None, tok)
        removed += 1
print("cleared trees:", removed)

res = api("/api/admin/buildings/batch", "POST", {"items": items, "free": True}, tok)
made = res.get("buildings", [])
print("built:", len(made), "of", len(items))
for b in made:
    if b["type"] != "wall":
        print("  ", b["type"], "at", b["x"], b["z"], "rot", b["rot"])

# negative tests: gate NOT on a road must fail
try:
    api("/api/admin/building", "POST", {"type": "gate", "x": 20, "z": 20, "free": True}, tok)
    print("NEGATIVE TEST FAILED: gate placed off-road!")
except RuntimeError as e:
    print("gate off-road correctly rejected:", json.loads(str(e).replace("'", '"')) if False else e)
# wall overlapping a road must fail
try:
    api("/api/admin/building", "POST", {"type": "wall", "x": -32, "z": 48, "free": True}, tok)
    print("NEGATIVE TEST FAILED: wall placed on gate/road cell!")
except RuntimeError as e:
    print("wall on road correctly rejected:", e)
