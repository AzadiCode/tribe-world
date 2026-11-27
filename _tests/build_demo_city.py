#!/usr/bin/env python3
"""Build a small demo city around the HQ via the admin API (for reference screenshots).
Layout sits WEST of the HQ (the river corner at world (16,4) is east — keep clear)."""
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
w = api("/api/world?since=0", "GET", token=tok)
hq = next((b for b in w["buildings"] if b["type"] == "hq"), None)
hx, hz = hq["x"], hq["z"]
print("HQ at", hx, hz, "| existing buildings:", len(w["buildings"]))

G = 8
items = []
road = lambda cx, cz: items.append({"type": "road", "x": cx, "z": cz, "rot": 0})
path = lambda cx, cz: items.append({"type": "path", "x": cx, "z": cz, "rot": 0})
house = lambda cx, cz: items.append({"type": "house", "x": cx, "z": cz, "rot": 0, "ar": True})

zx = hx - 4 * G    # vertical street (west of HQ)
zz = hz + 2 * G    # horizontal street (south of HQ)
for i in range(-3, 4):
    road(zx + i * G, zz)               # horizontal street
for j in range(-2, 3):
    if j:
        road(zx, zz + j * G)           # vertical street
# houses south of the horizontal street, facing north
for cx in [zx - 3 * G, zx - 2 * G, zx - G, zx + G, zx + 2 * G, zx + 3 * G]:
    house(cx, zz + 2 * G)
# houses west of the vertical street, facing east (skip zz+2G — the south row already fills it)
for cz in [zz - 2 * G, zz - G]:
    items.append({"type": "house", "x": zx - 2 * G, "z": cz, "rot": 90, "ar": True})
# sidewalk strip in front of the south houses
for i in range(-3, 4):
    if i:
        path(zx + i * G, zz + G)
# market NW of the crossroad
items.append({"type": "market", "x": zx + 2 * G, "z": zz - 2 * G, "rot": 0})
# crossing signs at the intersection
items.append({"type": "crossing", "x": zx - 2 * G, "z": zz + 5, "rot": 0})   # south of the horizontal street
items.append({"type": "crossing", "x": zx - 5, "z": zz - G, "rot": 0})   # west of the vertical street
# banner attached to HQ (south side)
items.append({"type": "banner", "x": hx, "z": hz + 5, "rot": 0})
# trees along the street
for cx in [zx - 4 * G, zx + 4 * G]:
    items.append({"type": "tree", "x": cx, "z": zz + G, "rot": 0})

# remove seeded trees that block the planned layout (same policy as ensure_hq)
FOOT_S = {"house": (6, 6), "hq": (8, 8), "farm": (8, 8), "market": (8, 6), "tree": (2, 2),
          "road": (8, 8), "crossing": (2, 2), "banner": (6, 3), "path": (2, 2)}


def rect_of(it):
    w, h = FOOT_S[it["type"]]
    x0 = it["x"] - w // 2
    z0 = it["z"] - h // 2
    return x0, x0 + w - 1, z0, z0 + h - 1


plans = [rect_of(i) for i in items]
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
print("built:", len(res.get("buildings", [])), "of", len(items))

# a few citizens so streets feel alive
api("/api/admin/contribution", "POST", {"kind": "subscriber", "count": 12}, tok)
print("population bumped")
