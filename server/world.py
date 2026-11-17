# -*- coding: utf-8 -*-
"""منطق دنیا: ساخت اولیه، مهاجرت دیتابیس، اقتصاد (tick)، هدف‌ها، رویدادها و خروجی عمومی (view)."""
import time, random
from datetime import datetime, timezone
from .config import (SIZE, DAY, FOOD_PRICE, FOOD_PER_PERSON, FARM_YIELD, MARKET_INCOME, TZ_NAME,
                     CATALOG, COST, TIERS, GOALS, RES, runtime)
from .db import lock, fetch, save


def now_iso(): return datetime.now(timezone.utc).isoformat(timespec="seconds")


def in_pond(x, z): return ((x * 2 + 17) / 8.6) ** 2 + ((z * 2 + 17) / 6) ** 2 < 1.15   # برکه؛ سلول‌ها → مختصات دنیا (×۲)


# ───────── ساخت و مهاجرت ─────────
def seed():
    rnd, b = random.Random(7), []
    while len(b) < 110:
        x, z = rnd.randint(-SIZE, SIZE - 1), rnd.randint(-SIZE, SIZE - 1)
        if (-10 < x < 11 and -7 < z < 7) or in_pond(x, z) or any(i["x"] == x and i["z"] == z for i in b): continue
        b.append({"id": len(b) + 1, "type": "tree", "x": x, "z": z, "rot": rnd.choice([0, 90, 180, 270])})
    d = {"_id": "main", "rev": 1, "last": time.time(), "country": {"name": "قبیله", "gov": ""},
            "stats": {"pop": 1, "money": 10_000_000, "food": 0.0, "subs": 0}, "story": {"reached": [], "values": {}},
            "buildings": b, "events": [{"t": now_iso(), "text": "یک زمین خالی، یک بنیان‌گذار و ۱۰ میلیون تومان. قبیله از اینجا شروع می‌شود."}], "next_id": len(b) + 1, **extras()}
    ensure_hq(d)
    return d


def extras(): return {"citizens": {}, "players": {}, "chat": [], "chat_id": 0, "env": {"mode": "live", "hour": 12.0}, "hq_made": False}


def migrate(d):                                           # افزودن فیلدهای جدید به دیتابیس قدیمی
    ch = False
    for k, v in extras().items():
        if k not in d: d[k] = v; ch = True
    return ch


def ensure_hq(d):                                         # دفتر مدیرعامل: یک‌بار به‌صورت خودکار کنار مرکز ساخته می‌شود (بعدش با پنل جابه‌جا/حذف می‌شود)
    if d.get("hq_made"): return False
    d["hq_made"] = True
    if any(b["type"] == "hq" for b in d["buildings"]): return True
    at = {(b["x"], b["z"]): b for b in d["buildings"]}
    for r in range(0, 8):
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                if max(abs(x), abs(z)) != r or in_pond(x, z): continue
                o = at.get((x, z))
                if o and o["type"] != "tree": continue
                if o: d["buildings"].remove(o)
                d["buildings"].append({"id": d["next_id"], "type": "hq", "x": x, "z": z, "rot": 0}); d["next_id"] += 1
                return True
    return True


def fix_pond(d):                                          # ساختمان‌های قدیمیِ روی برکه جابه‌جا/حذف می‌شوند
    ch = False
    for b in list(d["buildings"]):
        if in_pond(b["x"], b["z"]):
            ch = True
            if b["type"] == "tree": d["buildings"].remove(b)
            else: b["x"], b["z"] = free_cell(d, b["type"])
    return ch


def load():
    d = fetch()
    if not d: d = seed(); save(d)
    elif fix_pond(d) | migrate(d) | ensure_hq(d): save(d)
    return d


# ───────── نقشه ─────────
def free_cell(d, t):
    used = {(b["x"], b["z"]) for b in d["buildings"]}
    for r in range(0, SIZE * 2):
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                if max(abs(x), abs(z)) == r and (x, z) not in used and -SIZE <= x < SIZE and -SIZE <= z < SIZE and not in_pond(x, z):
                    return x, z
    raise ValueError("جایی خالی نیست")


def check_cell(d, x, z, ignore=None):
    if not (-SIZE <= x < SIZE and -SIZE <= z < SIZE): raise ValueError("خارج از نقشه")
    if in_pond(x, z): raise ValueError("اینجا برکه است")
    if any(b["x"] == x and b["z"] == z and b["id"] != ignore for b in d["buildings"]): raise ValueError("این خانه پر است")


# ───────── اقتصاد و رویدادها ─────────
def counts(d):
    c = {}
    for b in d["buildings"]: c[b["type"]] = c.get(b["type"], 0) + 1
    return c


def capacity(d): return counts(d).get("house", 0) * 4


def tick(d):
    n = min(int((time.time() - d["last"]) // DAY), 60)
    if n <= 0: return False
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
            "goals": [{"at": a, "key": k, "title": t, "value": d["story"]["values"].get(k)} for a, k, t in GOALS]}


def mutate(fn):
    """الگوی همه‌ی تغییرات: قفل ← بارگذاری ← tick ← اجرای fn ← rev+1 ← ذخیره"""
    with lock:
        d = load(); tick(d); out = fn(d); d["rev"] += 1; save(d); return out
