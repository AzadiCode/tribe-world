# -*- coding: utf-8 -*-
"""موتور زیرساخت v2 (سرور) — آینهٔ پایتونیِ 05-geo-core.js (فرانت).
مسئولیت: مدل داده infrastructure v2 (nodes/edges/surfaces)، اعتبارسنجی هندسی مشترک با فرانت،
مهاجرت کاشی‌های قدیمی جاده/پیاده‌رو به مسیرهای هندسی، و APIهای مدیر (اتمیک).
هر تغییری در هندسه باید دوطرفه (JS و PY) انجام شود؛ تست پاریته: scripts/test-infra-parity.py"""
import math
from flask import Blueprint, request, jsonify
from srv_auth import admin_only
from srv_config import SIZE, CELL, FOOT, GRID_TYPES, CATALOG
from srv_world import mutate, log_event, view as world_view

bp = Blueprint("infra", __name__)

GEO_EPS = 1e-3
GEO_LO, GEO_HI = -SIZE * CELL - 1, SIZE * CELL - 1
GEO_KINDS = ("road", "walk", "dirt")
GEO_DEF = {"road": {"w": 2.0}, "walk": {"w": 0.6}, "dirt": {"w": 0.6}}
INFRA_COST = {"road": 100_000, "walk": 50_000, "dirt": 20_000}   # به ازای هر متر طول (تومان)
SURF_COST = 80_000                                               # به ازای هر متر مربع سطح خاکی


RIVER_POINTS = [(-146, 22), (-96, 22), (-96, 6), (-40, 6), (-40, 24), (16, 24), (16, 4), (72, 4), (72, 18), (146, 18)]  # مسیر شکستهٔ رود — هماهنگ با RIVER_PTS در 06-world-scenery.js
def pond_world(x, z):
    for i in range(1, len(RIVER_POINTS)):
        ax, az = RIVER_POINTS[i - 1]; bx, bz = RIVER_POINTS[i]
        dx, dz = bx - ax, bz - az
        u = max(0.0, min(1.0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
        if math.hypot(x - ax - u * dx, z - az - u * dz) < 4.1: return True
    return False


def r4(v): return round(float(v), 4)


# ───────── هندسهٔ پایه (آینهٔ geo* در 05-geo-core.js) ─────────
def g_norm(x, z):
    l = math.hypot(x, z) or 1.0
    return x / l, z / l


def g_dist(ax, az, bx, bz): return math.hypot(bx - ax, bz - az)


def sample_path(pts, style="poly", step=0.4):
    """نقاط کنترل ← نمونه‌های [{x,z,dx,dz,s}]؛ style=poly خط‌قطعه‌ای، curve=Catmull-Rom."""
    P = [[float(p[0]), float(p[1])] for p in pts]
    if not P: return []
    if len(P) == 1: return [{"x": P[0][0], "z": P[0][1], "dx": 1.0, "dz": 0.0, "s": 0.0}]
    out, prev, s = [], [P[0][0], P[0][1]], 0.0

    def push(x, z):
        nonlocal s, prev
        dx, dz = x - prev[0], z - prev[1]
        l = math.hypot(dx, dz)
        if l < 1e-9: return
        s += l
        out.append({"x": x, "z": z, "dx": dx / l, "dz": dz / l, "s": s})
        prev = [x, z]

    out.append({"x": P[0][0], "z": P[0][1], "dx": 0.0, "dz": 0.0, "s": 0.0})
    if style == "curve" and len(P) >= 3:
        for i in range(len(P) - 1):
            p0, p1, p2, p3 = P[max(0, i - 1)], P[i], P[i + 1], P[min(len(P) - 1, i + 2)]
            seg = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            n = max(2, math.ceil(seg / step))
            for k in range(1, n + 1):
                t, t2, t3 = k / n, 0, 0
                t2, t3 = t * t, t * t * t
                x = .5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
                z = .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
                push(x, z)
    else:
        for i in range(1, len(P)):
            a, b = P[i - 1], P[i]
            l = math.hypot(b[0] - a[0], b[1] - a[1])
            n = max(1, math.ceil(l / step))
            for k in range(1, n + 1):
                push(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)
    for i, p in enumerate(out):  # مماس میانگین
        a, b = out[max(0, i - 1)], out[min(len(out) - 1, i + 1)]
        dx, dz = b["x"] - a["x"], b["z"] - a["z"]
        l = math.hypot(dx, dz)
        if l > 1e-9: p["dx"], p["dz"] = dx / l, dz / l
    if len(out) == 1: out[0]["dx"], out[0]["dz"] = 1.0, 0.0
    return out


def stroke_sides(S, w):
    """آینهٔ geoStrokeSides با join=round (آفست نرم مماس میانگین)."""
    h = w / 2
    L, R = [], []
    for p in S:
        nx, nz = -p["dz"], p["dx"]
        L.append([p["x"] + nx * h, p["z"] + nz * h])
        R.append([p["x"] - nx * h, p["z"] - nz * h])
    return L, R


def stroke_poly(S, w):
    """آینهٔ geoStrokePoly (join=round با آفست مماس + cap=butt؛ cap گرد فقط رندر فرانت است)."""
    if len(S) < 2: return []
    L, R = stroke_sides(S, w)
    return [list(p) for p in L] + [list(p) for p in reversed(R)]


def offset_band(S, d1, d2, side=1):
    fwd, bwd = [], []
    for p in S:
        nx, nz = -p["dz"] * side, p["dx"] * side
        fwd.append([p["x"] + nx * d2, p["z"] + nz * d2])
        bwd.append([p["x"] + nx * d1, p["z"] + nz * d1])
    return fwd + list(reversed(bwd))


def poly_area(P):
    a = 0.0
    for i in range(len(P)):
        p, q = P[i], P[(i + 1) % len(P)]
        a += p[0] * q[1] - q[0] * p[1]
    return a / 2


def poly_bbox(P):
    xs = [p[0] for p in P]; zs = [p[1] for p in P]
    return min(xs), max(xs), min(zs), max(zs)


def pip(P, x, z):
    inn = False
    n = len(P)
    for i in range(n):
        j = (i - 1 + n) % n
        xi, zi, xj, zj = P[i][0], P[i][1], P[j][0], P[j][1]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            inn = not inn
    return inn


def seg_isect(ax0, az0, ax1, az1, bx0, bz0, bx1, bz1):
    d1x, d1z, d2x, d2z = ax1 - ax0, az1 - az0, bx1 - bx0, bz1 - bz0
    den = d1x * d2z - d1z * d2x
    if abs(den) < 1e-12: return False
    t = ((bx0 - ax0) * d2z - (bz0 - az0) * d2x) / den
    u = ((bx0 - ax0) * d1z - (bz0 - az0) * d1x) / den
    return GEO_EPS < t < 1 - GEO_EPS and GEO_EPS < u < 1 - GEO_EPS


def poly_self_isect(P):
    n = len(P)
    if n < 3: return True
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1: continue
            if seg_isect(P[i][0], P[i][1], P[(i + 1) % n][0], P[(i + 1) % n][1],
                         P[j][0], P[j][1], P[(j + 1) % n][0], P[(j + 1) % n][1]): return True
    return False


def pt_seg(px, pz, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az
    l2 = dx * dx + dz * dz
    t = 0.0 if l2 <= 1e-12 else max(0.0, min(1.0, ((px - ax) * dx + (pz - az) * dz) / l2))
    return math.hypot(ax + dx * t - px, az + dz * t - pz)


def poly_vs_rect(P, R):
    if pip(P, (R[0] + R[1]) / 2, (R[2] + R[3]) / 2): return True
    for p in P:
        if R[0] + GEO_EPS < p[0] < R[1] - GEO_EPS and R[2] + GEO_EPS < p[1] < R[3] - GEO_EPS: return True
    for c in ((R[0], R[2]), (R[1], R[2]), (R[1], R[3]), (R[0], R[3])):
        if pip(P, c[0], c[1]): return True
    n = len(P)
    corners = ((R[0], R[2]), (R[1], R[2]), (R[1], R[3]), (R[0], R[3]))
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        for j in range(4):
            c, d = corners[j], corners[(j + 1) % 4]
            if seg_isect(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]): return True
    return False


def poly_vs_poly(A, B):
    """تماس لبه‌به‌لبه مجاز (آینهٔ geoPolyVsPy فرانت)."""
    bA, bB = poly_bbox(A), poly_bbox(B)
    if bA[0] > bB[1] + GEO_EPS or bB[0] > bA[1] + GEO_EPS or bA[2] > bB[3] + GEO_EPS or bB[2] > bA[3] + GEO_EPS:
        return False

    def deep_in(P, x, z):
        if not pip(P, x, z): return False
        n = len(P)
        for i in range(n):
            if pt_seg(x, z, P[i][0], P[i][1], P[(i + 1) % n][0], P[(i + 1) % n][1]) <= GEO_EPS * 10:
                return False
        return True

    for p in A:
        if deep_in(B, p[0], p[1]): return True
    for p in B:
        if deep_in(A, p[0], p[1]): return True
    na, nb = len(A), len(B)
    for i in range(na):
        for j in range(nb):
            if seg_isect(A[i][0], A[i][1], A[(i + 1) % na][0], A[(i + 1) % na][1],
                         B[j][0], B[j][1], B[(j + 1) % nb][0], B[(j + 1) % nb][1]): return True
    return False


# ───────── مدل دادهٔ v2 ─────────
def empty_infra(): return {"v": 2, "nodes": {}, "edges": {}, "surfaces": {}, "next_id": 1}


def infra_pack(inf):
    """Map-based (فرانت) → dict قابل ذخیره در Mongo. اینجا همین dict ذخیره می‌شود."""
    if isinstance(inf.get("nodes"), dict): return inf  # از قبل packed
    return {"v": 2, "next_id": inf["next_id"],
            "nodes": {str(k): {"x": r4(v["x"]), "z": r4(v["z"])} for k, v in inf["nodes"].items()},
            "edges": {str(k): {"a": v["a"], "b": v["b"], "kind": v["kind"], "style": v.get("style", "poly"),
                                "w": round(float(v.get("w") or GEO_DEF[v["kind"]]["w"]), 3), "ref": v.get("ref")}
                      for k, v in inf["edges"].items()},
            "surfaces": {str(k): {"pts": [[r4(p[0]), r4(p[1])] for p in v["pts"]], "mat": v.get("mat", "dirt")}
                         for k, v in inf["surfaces"].items()}}


def infra_load(d):
    inf = empty_infra()
    if not isinstance(d, dict) or d.get("v") != 2: return inf
    for k, v in (d.get("nodes") or {}).items(): inf["nodes"][int(k)] = {"x": float(v["x"]), "z": float(v["z"])}
    for k, v in (d.get("edges") or {}).items():
        inf["edges"][int(k)] = {"a": int(v["a"]), "b": int(v["b"]), "kind": v["kind"],
                                 "style": v.get("style", "poly"), "w": float(v.get("w") or 0.6), "ref": v.get("ref")}
    for k, v in (d.get("surfaces") or {}).items():
        inf["surfaces"][int(k)] = {"pts": [[float(p[0]), float(p[1])] for p in v.get("pts", [])], "mat": v.get("mat", "dirt")}
    inf["next_id"] = int(d.get("next_id") or 1)
    return inf


def edge_polys(inf, eid):
    e = inf["edges"][eid]
    A, B = inf["nodes"][e["a"]], inf["nodes"][e["b"]]
    S = sample_path([[A["x"], A["z"]], [B["x"], B["z"]]], e.get("style", "poly"), 0.4)
    w = float(e.get("w") or GEO_DEF[e["kind"]]["w"])
    return S, stroke_poly(S, w)


def bld_rects(buildings):
    """مستطیل‌های واقعی ساختمان‌ها (بدون کاشی‌های قدیمی)."""
    out = []
    for b in buildings:
        t = b.get("type")
        if t in GRID_TYPES or t not in FOOT: continue
        w, dp, ox, oz = FOOT[t]
        a = math.radians(b.get("rot", 0))
        s, c = round(math.sin(a)), round(math.cos(a))
        cx, cz = b["x"] * CELL + ox * c + oz * s, b["z"] * CELL - ox * s + oz * c
        if s: w, dp = dp, w
        out.append((cx - w / 2, cx + w / 2, cz - dp / 2, cz + dp / 2))
    return out


def validate_edge(inf, eid, rects, pond=pond_world):
    """آینهٔ geoValidateEdge — همان پیام‌های فرانت."""
    errs = []
    if eid not in inf["edges"]: return ["مسیر نامعتبر"]
    e = inf["edges"][eid]
    if e["a"] not in inf["nodes"] or e["b"] not in inf["nodes"]: return ["گره نامعتبر"]
    A, B = inf["nodes"][e["a"]], inf["nodes"][e["b"]]
    if g_dist(A["x"], A["z"], B["x"], B["z"]) < .05: return ["مسیر خیلی کوتاه"]
    if e["kind"] not in GEO_KINDS: errs.append("نوع مسیر نامعتبر")
    S, poly = edge_polys(inf, eid)
    if len(poly) < 3: errs.append("هندسهٔ مسیر نامعتبر")
    if poly_self_isect(poly): errs.append("مسیر خودمتقاطع")
    x0, x1, z0, z1 = poly_bbox(poly)
    if x0 < GEO_LO - GEO_EPS or x1 > GEO_HI + GEO_EPS or z0 < GEO_LO - GEO_EPS or z1 > GEO_HI + GEO_EPS:
        errs.append("خارج از نقشه")
    for p in S:
        if pond(p["x"], p["z"]): errs.append("روی حریم رودخانه"); break
    for r in rects:
        if poly_vs_rect(poly, r): errs.append("برخورد با ساختمان"); break
    for oid, o in inf["edges"].items():
        if oid == eid or o["kind"] == e["kind"]: continue
        _, opoly = edge_polys(inf, oid)
        if poly_vs_poly(poly, opoly): errs.append("برخورد با مسیر دیگر"); break
    return errs


def validate_surface(inf, sid, pond=pond_world):
    errs = []
    if sid not in inf["surfaces"]: return ["سطح نامعتبر"]
    P = inf["surfaces"][sid]["pts"]
    if len(P) < 3: return ["سطح باید حداقل ۳ نقطه داشته باشد"]
    if poly_self_isect(P): errs.append("چندضلعی خودمتقاطع")
    if abs(poly_area(P)) < .05: errs.append("مساحت خیلی کم")
    x0, x1, z0, z1 = poly_bbox(P)
    if x0 < GEO_LO - GEO_EPS or x1 > GEO_HI + GEO_EPS or z0 < GEO_LO - GEO_EPS or z1 > GEO_HI + GEO_EPS:
        errs.append("خارج از نقشه")
    for p in P:
        if pond(p[0], p[1]): errs.append("روی حریم رودخانه"); break
    return errs


# ───────── مهاجرت کاشی‌های قدیمی ← مسیرهای v2 (تکرارپذیر و ایمن) ─────────
def migrate_tiles(buildings):
    """آینهٔ infraMigrateTiles فرانت. کاشی‌های road/path گرید ← گره/یال هندسی.
    گره‌ها در مرکز هر سلولِ انتهایی/انشعابی؛ یال‌ها امتداد مستقیم سلول‌ها."""
    inf = empty_infra()
    tiles = [b for b in (buildings or []) if b.get("type") in GRID_TYPES]
    if not tiles: return inf
    key = lambda x, z: f"{round(x)}|{round(z)}"
    cellMap = {}
    for t in tiles:
        cellMap[key(t["x"], t["z"])] = t
    seen, runs = set(), []

    def neighbors(x, z):
        return [(x + dx, z + dz) for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1))]

    for t in tiles:
        k = key(t["x"], t["z"])
        if k in seen: continue
        comp, q = [], [(t["x"], t["z"])]
        seen.add(k)
        while q:
            x, z = q.pop()
            comp.append((x, z))
            for nx, nz in neighbors(x, z):
                nk = key(nx, nz)
                if nk in cellMap and nk not in seen:
                    seen.add(nk); q.append((nx, nz))
        deg = {}
        for x, z in comp:
            deg[key(x, z)] = sum(1 for nx, nz in neighbors(x, z) if key(nx, nz) in cellMap)
        ends = [(x, z) for x, z in comp if deg[key(x, z)] != 2]
        visited = set()
        for sx, sz in (ends or comp[:1]):
            sk = key(sx, sz)
            if sk in visited: continue
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nk = key(sx + dx, sz + dz)
                if nk not in cellMap or nk in visited: continue
                pts, px, pz, lx, lz = [(sx, sz)], sx, sz, dx, dz
                while True:
                    px += lx; pz += lz
                    pts.append((px, pz)); visited.add(key(px, pz))
                    nb = [(ax, az) for ax, az in ((1, 0), (-1, 0), (0, 1), (0, -1))
                          if (ax != -lx or az != -lz) and key(px + ax, pz + az) in cellMap]
                    if len(nb) == 1 and deg[key(px, pz)] == 2:
                        lx, lz = nb[0]; continue
                    break
                if len(pts) >= 2: runs.append((pts, cellMap[sk]["type"]))
    nodeIdx = {}

    def node_at(x, z):
        k = f"{r4(x)},{r4(z)}"
        if k in nodeIdx: return nodeIdx[k]
        nid = inf["next_id"]; inf["next_id"] += 1
        inf["nodes"][nid] = {"x": r4(x), "z": r4(z)}
        nodeIdx[k] = nid
        return nid

    for pts, t in runs:
        kind = "road" if t == "road" else "walk"
        ids = [node_at(px * CELL, pz * CELL) for px, pz in pts]
        for i in range(len(ids) - 1):
            inf["edges"][inf["next_id"]] = {"a": ids[i], "b": ids[i + 1], "kind": kind,
                                             "style": "poly", "w": GEO_DEF[kind]["w"], "ref": None}
            inf["next_id"] += 1
    return inf


def infra_migrate(d):
    """اتصال به چرخهٔ load سرور: اگر infrastructure v2 نیست، از کاشی‌های قدیمی بساز؛
    کاشی‌های قدیمی road/path از buildings حذف نمی‌شوند تا rollback ممکن باشد؛
    اما occupied-cells همان پوشش را می‌دهد و رندر v2 جایگزین می‌شود (کاشی‌ها hide می‌شوند)."""
    ch = False
    cur = d.get("infrastructure")
    if not isinstance(cur, dict) or cur.get("v") != 2:
        inf = migrate_tiles(d.get("buildings") or [])
        d["infrastructure"] = infra_pack(inf)
        ch = True
    return ch


def infra_view(d):
    """برای view(): زیرساخت pack شده + پرچم مهاجرت (فرانت رندر v2 را جایگزین کاشی‌ها می‌کند)."""
    inf = d.get("infrastructure")
    if not isinstance(inf, dict) or inf.get("v") != 2:
        inf = infra_pack(migrate_tiles(d.get("buildings") or []))
    return inf


def edge_cost(e, A, B):
    l = g_dist(A["x"], A["z"], B["x"], B["z"])
    return int(round(INFRA_COST[e["kind"]] * l)) if e["kind"] in INFRA_COST else 0


def surf_cost(P):
    return int(round(abs(poly_area(P)) * SURF_COST))


def infra_del_edge(inf, eid):
    e = inf["edges"].pop(eid, None)
    if not e: return
    for nid in (e["a"], e["b"]):
        if not any(x["a"] == nid or x["b"] == nid for x in inf["edges"].values()):
            inf["nodes"].pop(nid, None)


# ───────── APIهای مدیر (اتمیک از طریق mutate) ─────────
def _norm_op(j):
    """نرمال‌سازی ورودی عملیات زیرساخت: [{op:..., ...}]؛ هر op یک تغییر."""
    ops = j.get("ops") or []
    if not isinstance(ops, list) or not (1 <= len(ops) <= 200): raise ValueError("فهرست عملیات نامعتبر (۱ تا ۲۰۰)")
    return ops


@bp.post("/api/admin/infra")
@admin_only
def infra_apply():
    """عملیات دسته‌ای زیرساخت — همه یا هیچ:
    ops: [{op:'edge', kind, pts:[[x,z]...], style:'poly'|'curve', w, snap?},
          {op:'dels', edges:[id...]}, {op:'surf', pts:[[x,z]...], mat},
          {op:'delsurf', surfaces:[id...]}, {op:'undo'}]
    snap: {to:'node'|'start', ...} در فرانت اعمال شده و pts نهایی می‌آید."""
    j = request.get_json(silent=True) or {}
    ops = _norm_op(j)
    free = bool(j.get("free"))

    def f(d):
        inf = infra_load(infra_view(d))
        rects = bld_rects(d["buildings"])
        made = []
        for op in ops:
            k = op.get("op")
            if k == "edge":
                kind = op.get("kind")
                if kind not in GEO_KINDS: raise ValueError("نوع مسیر نامعتبر")
                pts = op.get("pts") or []
                if not isinstance(pts, list) or len(pts) < 2: raise ValueError("مسیر حداقل ۲ نقطه می‌خواهد")
                pts = [[float(p[0]), float(p[1])] for p in pts]
                style = "curve" if op.get("style") == "curve" else "poly"
                w = float(op.get("w") or GEO_DEF[kind]["w"])
                w = max(.3, min(6.0, w))
                # گره‌ها: چسبیدن به گرهٔ موجود در شعاع ۰٫۲۵ (اتصال توپولوژیک)
                def node_near(x, z):
                    for nid, n in inf["nodes"].items():
                        if g_dist(n["x"], n["z"], x, z) <= .25: return nid
                    nid = inf["next_id"]; inf["next_id"] += 1
                    inf["nodes"][nid] = {"x": r4(x), "z": r4(z)}
                    return nid
                ids = [node_near(p[0], p[1]) for p in pts]
                new_edges = []
                for i in range(len(ids) - 1):
                    eid = inf["next_id"]; inf["next_id"] += 1
                    inf["edges"][eid] = {"a": ids[i], "b": ids[i + 1], "kind": kind, "style": style, "w": w, "ref": None}
                    new_edges.append(eid)
                # اعتبارسنجی همهٔ یال‌های تازه (اتمیک: خطا = کل عملیات fail)
                for eid in new_edges:
                    errs = validate_edge(inf, eid, rects)
                    if errs: raise ValueError("؛ ".join(errs))
                made += [{"op": "edge", "ids": new_edges}]
            elif k == "dels":
                for eid in op.get("edges") or []:
                    if int(eid) not in inf["edges"]: raise ValueError("مسیر پیدا نشد")
                for eid in op.get("edges") or []: infra_del_edge(inf, int(eid))
                made.append({"op": "dels", "n": len(op.get("edges") or [])})
            elif k == "surf":
                pts = op.get("pts") or []
                if not isinstance(pts, list) or len(pts) < 3: raise ValueError("سطح حداقل ۳ نقطه می‌خواهد")
                P = [[float(p[0]), float(p[1])] for p in pts]
                sid = inf["next_id"]; inf["next_id"] += 1
                inf["surfaces"][sid] = {"pts": P, "mat": op.get("mat") or "dirt"}
                errs = validate_surface(inf, sid)
                if errs:
                    inf["surfaces"].pop(sid, None)
                    raise ValueError("؛ ".join(errs))
                made.append({"op": "surf", "ids": [sid]})
            elif k == "delsurf":
                for sid in op.get("surfaces") or []:
                    if int(sid) not in inf["surfaces"]: raise ValueError("سطح پیدا نشد")
                for sid in op.get("surfaces") or []: inf["surfaces"].pop(int(sid), None)
                made.append({"op": "delsurf", "n": len(op.get("surfaces") or [])})
            else:
                raise ValueError("عملیات نامعتبر")
        # هزینه: مجموع طول مسیرها × نرخ + مساحت سطوح × نرخ
        total = 0
        if not free:
            for eid, e in inf["edges"].items():
                if any(eid in m.get("ids", []) for m in made if m["op"] == "edge"):
                    total += edge_cost(e, inf["nodes"][e["a"]], inf["nodes"][e["b"]])
            for m in made:
                if m["op"] == "surf":
                    for sid in m["ids"]: total += surf_cost(inf["surfaces"][sid]["pts"])
            if d["stats"]["money"] < total: raise ValueError("پول خزانه کافی نیست")
            d["stats"]["money"] -= total
        d["infrastructure"] = infra_pack(inf)
        if made:
            n_e = sum(len(m.get("ids", [])) for m in made if m["op"] == "edge")
            n_s = sum(len(m.get("ids", [])) for m in made if m["op"] == "surf")
            n_d = sum(m.get("n", 0) for m in made if m["op"] in ("dels", "delsurf"))
            parts = []
            if n_e: parts.append(f"{n_e} قطعه مسیر")
            if n_s: parts.append(f"{n_s} سطح")
            if n_d: parts.append(f"حذف {n_d} مورد")
            log_event(d, "زیرساخت: " + "، ".join(parts) + (f" (−{total/1e6:g} میلیون تومان)." if total else "."))
        return made

    return jsonify(ok=True, made=mutate(f))
