# -*- coding: utf-8 -*-
"""منطق دنیا: ساخت اولیه، مهاجرت دیتابیس، اقتصاد (tick)، هدف‌ها، رویدادها و خروجی عمومی (view)."""
import time, random, math
from datetime import datetime, timezone
from srv_config import (SIZE, CELL, GRID, U, FOOT, GRID_TYPES, DAY, FOOD_PRICE, FOOD_PER_PERSON, FARM_YIELD, MARKET_INCOME, TZ_NAME,
                     CATALOG, COST, TIERS, GOALS, RES, WEATHER_TYPES, WEATHER_DEFAULT, runtime)
from srv_db import lock, fetch, save


def now_iso(): return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _cell_round(v): return int(math.floor(float(v) + .5))


def in_pond(gx, gz): return pond_world(gx * U, gz * U)


# ───────── ساخت و مهاجرت ─────────
def seed():
    rnd, b = random.Random(7), []
    while len(b) < 110:
        x, z = rnd.randint(-SIZE, SIZE - 1) * GRID, rnd.randint(-SIZE, SIZE - 1) * GRID
        if (-10 * GRID < x < 11 * GRID and -7 * GRID < z < 7 * GRID) or in_pond(x, z) or any(i["x"] == x and i["z"] == z for i in b): continue
        b.append({"id": len(b) + 1, "type": "tree", "x": x, "z": z, "gx": x, "gz": z, "rot": rnd.choice([0, 90, 180, 270])})
    d = {"_id": "main", "rev": 1, "last": time.time(), "country": {"name": "قبیله", "gov": ""},
            "stats": {"pop": 1, "money": 10_000_000, "food": 0.0, "subs": 0}, "story": {"reached": [], "values": {}},
            "buildings": b, "_grid_v2": True, "events": [{"t": now_iso(), "text": "یک زمین خالی، یک بنیان‌گذار و ۱۰ میلیون تومان. قبیله از اینجا شروع می‌شود."}], "next_id": len(b) + 1, **extras()}
    ensure_hq(d)
    return d


def extras(): return {"citizens": {}, "players": {}, "chat": [], "chat_id": 0, "env": {"mode": "live", "hour": 12.0}, "weather": dict(WEATHER_DEFAULT), "hq_made": False}


def migrate(d):
    """Idempotent migration from legacy house-unit floats to integer sub-cells."""
    changed = False
    for k, v in extras().items():
        if k not in d:
            d[k] = v
            changed = True
    if not d.get("_grid_v2"):
        for b in d.get("buildings", []):
            gx = _cell_round(float(b.get("x", 0)) * GRID)
            gz = _cell_round(float(b.get("z", 0)) * GRID)
            b.update(gx=gx, gz=gz, x=gx, z=gz)
        d["_grid_v2"] = True
        changed = True
    else:
        for b in d.get("buildings", []):
            gx, gz = _cell_round(b.get("gx", b.get("x", 0))), _cell_round(b.get("gz", b.get("z", 0)))
            if b.get("gx") != gx or b.get("gz") != gz or b.get("x") != gx or b.get("z") != gz:
                changed = True
            b.update(gx=gx, gz=gz, x=gx, z=gz)
    return changed


def ensure_hq(d):                                         # دفتر مدیرعامل: یک‌بار به‌صورت خودکار کنار مرکز ساخته می‌شود (بعدش با پنل جابه‌جا/حذف می‌شود)
    if d.get("hq_made"): return False
    d["hq_made"] = True
    if any(b["type"] == "hq" for b in d["buildings"]): return True
    notree = {**d, "buildings": [b for b in d["buildings"] if b["type"] != "tree"]}
    for r in range(0, 8 * GRID):
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                if max(abs(x), abs(z)) != r: continue
                try: check_place(notree, "hq", x, z)
                except ValueError: continue
                tiles = tiles_of(d["buildings"]); cand = {"type": "hq", "x": x, "z": z, "gx": x, "gz": z, "rot": 0}; R = set().union(*rects_of(cand, tiles))
                d["buildings"] = [b for b in d["buildings"] if not (b["type"] == "tree" and R.intersection(set().union(*rects_of(b, tiles))))]
                d["buildings"].append({"id": d["next_id"], **cand}); d["next_id"] += 1
                return True
    return True


def fix_pond(d):
    """Move/remove items if any occupied sub-cell intersects the pond."""
    ch = False
    for b in list(d["buildings"]):
        cells = set().union(*rects_of(b, tiles_of(d["buildings"])))
        if not any(pond_world((cx + .5) * U, (cz + .5) * U) for cx, cz in cells):
            continue
        ch = True
        if b["type"] == "tree":
            d["buildings"].remove(b)
        else:
            b["x"], b["z"] = free_cell(d, b["type"], b["id"])
            b["gx"], b["gz"] = b["x"], b["z"]
    return ch


def load():
    d = fetch()
    if not d: d = seed(); save(d)
    elif migrate(d) | fix_pond(d) | ensure_hq(d): save(d)
    return d


# ───────── شبکهٔ صحیحِ خرده‌سلولی ─────────
LO, HI = -SIZE * GRID, SIZE * GRID - 1
RIVER_POINTS = [(-146, 22), (-96, 22), (-96, 6), (-40, 6), (-40, 24), (16, 24), (16, 4), (72, 4), (72, 18), (146, 18)]  # مسیر شکستهٔ رود — هماهنگ با RIVER_PTS در 06-world-scenery.js
RIVER_GUARD = 4.1  # حریم رود بر حسب واحد دنیا (همان مقدار قبلی؛ فقط مرجعِ اندازه‌گیری عوض شد)

# ── مسیر «فِلِت‌شده» رود (آینهٔ دقیق FILLET در 06-world-scenery.js): هر گوشهٔ قائمهٔ ۹۰ درجه با کمان ۸-قطعه‌ای
#    (r=min(6, ۰٫۴۵·طول هر ضلع)) نرم می‌شود. رندر آب/ساحل/جالیِ زمین همه از همین مسیر پیروی می‌کنند و کمان در
#    گوشه‌ها تا r·(1−cos۴۵°)≈۱٫۷۶ داخلِ زاویه را می‌بُرد؛ پس گارد ساخت هم باید از همین مسیر اندازه بگیرد —
#    وگرنه در پیچ‌های رود خانه/درختِ «مجاز» وسط جالیِ بریده‌شده یا داخل حلقهٔ سنگ ساحل می‌نشیند (باگ گزارش‌شده:
#    «نزدیکی آب هرچی می‌سازم محو می‌شود»). الگوریتم عیناً همان JS است تا مرزِ فریم ۴٫۱ دو طرف کاملاً یکی بماند.
def _build_river_fillet():
    poly = []
    for i in range(len(RIVER_POINTS)):
        p = RIVER_POINTS[i]
        if i == 0 or i == len(RIVER_POINTS) - 1:
            poly.append([float(p[0]), float(p[1])]); continue
        ax, az = RIVER_POINTS[i - 1]; bx, bz = p; cx, cz = RIVER_POINTS[i + 1]
        d1x, d1z = bx - ax, bz - az; L1 = math.hypot(d1x, d1z)
        d2x, d2z = cx - bx, cz - bz; L2 = math.hypot(d2x, d2z)
        if L1 < 1e-9 or L2 < 1e-9: poly.append([float(bx), float(bz)]); continue
        u1x, u1z = d1x / L1, d1z / L1; u2x, u2z = d2x / L2, d2z / L2
        dot = max(-1.0, min(1.0, u1x * u2x + u1z * u2z))
        if math.acos(dot) < .12: poly.append([float(bx), float(bz)]); continue  # تقریباً مستقیم
        r = min(6.0, L1 * .45, L2 * .45)
        tin = [bx - u1x * r, bz - u1z * r]; tout = [bx + u2x * r, bz + u2z * r]
        poly.append(tin)
        nx, nz = -u1z, u1x                       # عمودِ ضلع ورودی
        sgn = 1 if (nx * (u2x - u1x) + nz * (u2z - u1z)) >= 0 else -1
        ccx, ccz = tin[0] + nx * sgn * r, tin[1] + nz * sgn * r   # مرکز کمان؛ دقیقاً هم‌فاصلهٔ r از هر دو مماس
        ain = math.atan2(tin[1] - ccz, tin[0] - ccx); aout = math.atan2(tout[1] - ccz, tout[0] - ccx)
        sweep = aout - ain
        while sweep > math.pi: sweep -= 2 * math.pi
        while sweep < -math.pi: sweep += 2 * math.pi
        for j in range(1, 8):                    # STEPS=8 — مثل فرانت
            t = j / 8; th = ain + sweep * t
            poly.append([ccx + math.cos(th) * r, ccz + math.sin(th) * r])
        poly.append(tout)
    return poly

_FILLET = _build_river_fillet()

def _poly_dist(poly, X, Z):
    best = 1e18
    for i in range(1, len(poly)):
        ax, az = poly[i - 1]; bx, bz = poly[i]
        dx, dz = bx - ax, bz - az; dd = dx * dx + dz * dz
        u = 0.0 if dd <= 0 else max(0.0, min(1.0, ((X - ax) * dx + (Z - az) * dz) / dd))
        d = math.hypot(X - ax - u * dx, Z - az - u * dz)
        if d < best: best = d
    return best

def pond_world(X, Z):
    """حریم رود = فاصله تا مسیر «فِلِت‌شده» (همان مسیری که آب و ساحل رندر می‌شوند) < ۴٫۱.
    در قطعات مستقیم عیناً همان فاصلهٔ قبلی است؛ فقط در پیچ‌ها مرز با رندر هم‌تراز می‌شود."""
    return _poly_dist(_FILLET, X, Z) < RIVER_GUARD


def tiles_of(blds):
    return {(int(b.get("gx", b["x"])), int(b.get("gz", b["z"]))) for b in blds if b["type"] == "path"}


def _dims(t, rot=0):
    w, h = FOOT[t]
    return (h, w) if t not in GRID_TYPES and int(rot or 0) % 180 else (w, h)


def _base_cells(gx, gz, w, h):
    x0, z0 = int(gx) - w // 2, int(gz) - h // 2
    return {(x, z) for x in range(x0, x0 + w) for z in range(z0, z0 + h)}


def rects_of(b, tiles=None):
    """Return the exact occupied sub-cells. Paths own only their declared core footprint;
    edge-to-edge connections are visual/navigation links, never extra footprint."""
    gx, gz, t = int(b.get("gx", b["x"])), int(b.get("gz", b["z"])), b["type"]
    w, h = _dims(t, b.get("rot", 0))
    return [_base_cells(gx, gz, w, h)]


def _occupied(blds):
    occ = {}
    for b in blds:
        for cell in rects_of(b)[0]:
            occ.setdefault(cell, b)
    return occ


def check_place(d, t, x, z, rot=0, ignore=None, extra=()):
    gx, gz = _cell_round(x), _cell_round(z)
    rot = 0 if t in GRID_TYPES else (int(round(int(rot or 0) / 90)) * 90) % 360
    others = [b for b in list(d["buildings"]) + list(extra) if b.get("id") != ignore]
    cand = {"type": t, "gx": gx, "gz": gz, "x": gx, "z": gz, "rot": rot}
    cells = rects_of(cand)[0]
    if any(cx < LO or cx > HI or cz < LO or cz > HI for cx, cz in cells):
        raise ValueError("خارج از نقشه")
    if any(pond_world((cx + .5) * U, (cz + .5) * U) for cx, cz in cells):
        raise ValueError("اینجا حریم رودخانه است")
    occ = _occupied(others)
    if cells.intersection(occ):
        raise ValueError("با ساختمان دیگری برخورد دارد")
    return gx, gz, rot


def free_cell(d, t, ignore=None):
    for r in range(0, SIZE * GRID * 2):
        for gx in range(-r, r + 1):
            for gz in range(-r, r + 1):
                if max(abs(gx), abs(gz)) == r and LO <= gx <= HI and LO <= gz <= HI:
                    try:
                        check_place(d, t, gx, gz, 0, ignore)
                    except ValueError:
                        continue
                    return gx, gz
    raise ValueError("جایی خالی نیست")


# ───────── اقتصاد و رویدادها ─────────
def counts(d):
    c = {}
    for b in d["buildings"]: c[b["type"]] = c.get(b["type"], 0) + 1
    return c


def capacity(d): return counts(d).get("house", 0) * 4


# ───────── آب‌وهوای زنده ─────────
def wx_tick(d):
    """سیر طبیعی آب‌وهوا (فقط حالت خودکار): زنجیرهٔ مارکوف با ماندگاری چند‌دقیقه‌ای؛
    شدت و دمای هر حالت هم‌زمان با نوعش تعیین می‌شود. تغییر ⇒ rev+1 تا همهٔ کلاینت‌ها در poll بعدی ببینند."""
    w = d.get("weather")
    if not isinstance(w, dict):
        d["weather"] = dict(WEATHER_DEFAULT); return True
    now = time.time()
    if w.get("mode", "auto") != "auto" or now < float(w.get("next") or 0):
        return False
    cur = WEATHER_TYPES.get(w.get("type")) or WEATHER_TYPES["clear"]
    keys, weights = list(cur["next"]), list(cur["next"].values())
    t = random.choices(keys, weights=weights)[0]
    cfg = WEATHER_TYPES[t]; lo, hi = cfg["dur"]
    w.update(mode="auto", type=t, intensity=round(random.uniform(.45, 1), 2),
             since=now, next=now + random.uniform(lo, hi),
             temp=round(max(-10, min(45, cfg["temp"] + random.uniform(-3, 3))), 1))
    return True


def tick(d):
    n = min(int((time.time() - d["last"]) // DAY), 60)
    wx = wx_tick(d)                                           # آب‌وهوا مستقل از اقتصاد تکامل می‌یابد
    if n <= 0:
        if wx: d["rev"] += 1
        return wx
    d["last"] = time.time() if n == 60 else d["last"] + n * DAY
    c, s = counts(d), d["stats"]
    for _ in range(n):
        s["food"] += c.get("farm", 0) * FARM_YIELD; s["money"] += c.get("market", 0) * MARKET_INCOME
        need = s["pop"] * FOOD_PER_PERSON
        if s["food"] >= need: s["food"] -= need
        else:                                              # کمبود غذا: خرید از خزانه
            buy = need - s["food"]; s["food"] = 0; s["money"] = max(0, s["money"] - buy * FOOD_PRICE)
    s["food"], s["money"] = round(s["food"], 1), int(s["money"])
    d["rev"] += 1
    return True


def check_goals(d):
    for at, key, title in GOALS:
        if d["stats"]["subs"] >= at and key not in d["story"]["reached"]:
            d["story"]["reached"].append(key); log_event(d, f"به {at} نفر رسیدیم! {title} — منتظر رأی شما باشید.")


def log_event(d, text):
    d["events"] = ([{"t": now_iso(), "text": text}] + d["events"])[:50]


def apply_delta(d, delta):
    for k in RES:
        v = float(delta.get(k, 0) or 0)
        if v: d["stats"][k] = max(0, int(d["stats"][k] + v) if k != "food" else round(d["stats"][k] + v, 1))
    check_goals(d)


# ───────── خروجی عمومی و تغییر ─────────
def view(d):
    return {"rev": d["rev"], "country": d["country"], "stats": d["stats"], "capacity": capacity(d),
            "buildings": d["buildings"], "events": d["events"][:20], "catalog": CATALOG, "cost": COST, "day": DAY,
            "tier": [n for at, n in TIERS if d["stats"]["subs"] >= at][-1], "tiers": [n for _, n in TIERS],
            "citizens": d["citizens"], "bot": runtime["bot_user"], "chat": d["chat"][-12:], "env": d["env"], "tz": TZ_NAME,
            "weather": d.get("weather") or dict(WEATHER_DEFAULT),
            "goals": [{"at": a, "key": k, "title": t, "value": d["story"]["values"].get(k)} for a, k, t in GOALS]}


def mutate(fn):
    """الگوی همه‌ی تغییرات: قفل ← بارگذاری ← tick ← اجرای fn ← rev+1 ← ذخیره"""
    with lock:
        d = load(); tick(d); out = fn(d); d["rev"] += 1; save(d); return out
