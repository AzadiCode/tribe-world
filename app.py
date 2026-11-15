# -*- coding: utf-8 -*-
"""
Tribe World — جهان زنده قبیله
Stack (مثل نمونه): Flask + MongoDB(pymongo) + فرانت تک‌فایلی (Three.js)
- بازدیدکننده: فقط مشاهده (GET /api/world)
- مدیر: پنل /admin با ADMIN_KEY؛ همه تغییرات در دیتابیس ذخیره می‌شوند
- اقتصاد: هر TICK ثانیه محاسبه می‌شود (محاسبه‌ی تأخیری، بدون thread پس‌زمینه)
"""
import os, time, hmac, hashlib, random, threading, logging
from functools import wraps
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory

MONGO_URI  = os.environ.get("MONGO_URI", "").strip()      # خالی = حافظه‌ی موقت
ADMIN_KEY  = os.environ.get("ADMIN_KEY", "").strip()      # رمز پنل مدیریت
SECRET_KEY = os.environ.get("SECRET_KEY") or ADMIN_KEY or "dev-only"
TICK, SIZE, CAP_BASE = 10, 20, 10                          # ثانیه / نیم‌اندازه‌ی نقشه / ظرفیت پایه
HERE = os.path.dirname(os.path.abspath(__file__))

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("tribe")
app, lock = Flask(__name__), threading.RLock()

if MONGO_URI:
    from pymongo import MongoClient
    col = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000).get_database("tribeworld").world
else:
    col = None
    log.warning("MONGO_URI تنظیم نشده؛ داده‌ها با هر ری‌استارت پاک می‌شوند")
_mem = {}

CATALOG = {"hall": "تالار قبیله", "house": "خانه", "farm": "مزرعه", "lumber": "چوب‌بری",
           "mine": "معدن", "market": "بازار", "road": "جاده", "tree": "درخت"}
# قوانین داستان: اثر هر مشترک / مشارکت
RULES = {"subscriber": {"pop": 1, "food": 10, "money": 5, "subs": 1},
         "contribution": {"pop": 2, "food": 20, "money": 25, "wood": 10}}
RES = ("pop", "money", "food", "wood", "stone", "subs")


def now_iso(): return datetime.now(timezone.utc).isoformat(timespec="seconds")


def seed():
    rnd, b, used = random.Random(7), [], set()
    def add(t, x, z):
        used.add((x, z)); b.append({"id": len(b) + 1, "type": t, "x": x, "z": z, "rot": rnd.choice([0, 90, 180, 270])})
    add("hall", 0, 0)
    for x in range(-8, 9): add("road", x, 1)
    for x in (-4, -2, 2, 4): add("house", x, 0)
    for x in (-4, -2, 2): add("farm", x, 2)
    add("market", 0, 2); add("lumber", 6, 2); add("mine", 7, 0)
    while sum(1 for i in b if i["type"] == "tree") < 45:
        x, z = rnd.randint(-SIZE, SIZE - 1), rnd.randint(-SIZE, SIZE - 1)
        if (x, z) not in used and not (-9 < x < 10 and -2 < z < 4): add("tree", x, z)
    return {"_id": "main", "rev": 1, "last": time.time(), "country": {"name": "قبیله"},
            "stats": {"pop": 8, "money": 100.0, "food": 60.0, "wood": 50.0, "stone": 20.0, "subs": 0},
            "buildings": b, "events": [{"t": now_iso(), "text": "🏕️ قبیله بنا شد."}], "next_id": len(b) + 1}


def load():
    d = col.find_one({"_id": "main"}) if col is not None else _mem.get("main")
    if not d: d = seed(); save(d)
    return d


def save(d):
    if col is not None: col.replace_one({"_id": "main"}, d, upsert=True)
    else: _mem["main"] = d


def counts(d):
    c = {}
    for b in d["buildings"]: c[b["type"]] = c.get(b["type"], 0) + 1
    return c


def capacity(d):
    c = counts(d); return CAP_BASE + c.get("house", 0) * 5 + c.get("hall", 0) * 10


def tick(d):
    t = time.time(); n = min(int((t - d["last"]) // TICK), 8640)
    if n <= 0: return False
    d["last"] = t if n == 8640 else d["last"] + n * TICK
    c, s = counts(d), d["stats"]
    s["food"] = max(0, s["food"] + n * (c.get("farm", 0) * 3 - s["pop"] * 0.2))
    s["money"] += n * (c.get("market", 0) * 5 + s["pop"] * 0.1)
    s["wood"] += n * c.get("lumber", 0) * 2
    s["stone"] += n * c.get("mine", 0) * 1.5
    cap = capacity(d)
    if s["food"] > 0 and s["pop"] < cap: s["pop"] += min(n, cap - s["pop"])
    for k in ("money", "food", "wood", "stone"): s[k] = round(s[k], 1)
    d["rev"] += 1
    return True


def log_event(d, text):
    d["events"] = ([{"t": now_iso(), "text": text}] + d["events"])[:50]


def apply_delta(d, delta):
    for k in RES:
        v = float(delta.get(k, 0) or 0)
        if v: d["stats"][k] = max(0, int(d["stats"][k] + v) if k in ("pop", "subs") else round(d["stats"][k] + v, 1))


def view(d):
    return {"rev": d["rev"], "country": d["country"], "stats": d["stats"], "capacity": capacity(d),
            "buildings": d["buildings"], "events": d["events"][:20], "catalog": CATALOG}


def mutate(fn):
    with lock:
        d = load(); tick(d); out = fn(d); d["rev"] += 1; save(d); return out


# ───────────── احراز هویت مدیر (توکن امضاشده) ─────────────
def sign(exp): return hmac.new(SECRET_KEY.encode(), str(exp).encode(), hashlib.sha256).hexdigest()
def make_token(): exp = int(time.time()) + 12 * 3600; return f"{exp}.{sign(exp)}"


def valid_token(tok):
    try:
        exp, sig = tok.split(".")
        return int(exp) > time.time() and hmac.compare_digest(sig, sign(exp))
    except Exception:
        return False


def admin_only(f):
    @wraps(f)
    def w(*a, **k):
        if not ADMIN_KEY or not valid_token(request.headers.get("X-Admin-Token", "")):
            return jsonify(error="unauthorized"), 401
        try: return f(*a, **k)
        except ValueError as e: return jsonify(error=str(e)), 400
    return w


_fails = {}


@app.post("/api/admin/login")
def login():
    ip, t = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0], time.time()
    _fails[ip] = [x for x in _fails.get(ip, []) if t - x < 600]
    if len(_fails[ip]) >= 5: return jsonify(error="تلاش زیاد؛ چند دقیقه بعد دوباره امتحان کن"), 429
    key = str((request.get_json(silent=True) or {}).get("key", ""))
    if not ADMIN_KEY or not hmac.compare_digest(key.encode(), ADMIN_KEY.encode()):
        _fails[ip].append(t); return jsonify(error="رمز اشتباه است"), 401
    return jsonify(token=make_token())


# ───────────── API عمومی (فقط مشاهده) ─────────────
@app.get("/api/world")
def world():
    with lock:
        d = load()
        if tick(d): save(d)
        if request.args.get("since", type=int) == d["rev"]: return jsonify(rev=d["rev"], same=True)
        return jsonify(view(d))


@app.get("/healthz")
def health(): return "ok"


# ───────────── API مدیر ─────────────
def free_cell(d, t):
    used = {(b["x"], b["z"]) for b in d["buildings"]}
    for r in range(0, SIZE * 2):
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                if max(abs(x), abs(z)) == r and (x, z) not in used and -SIZE <= x < SIZE and -SIZE <= z < SIZE:
                    return x, z
    raise ValueError("جایی خالی نیست")


def check_cell(d, x, z, ignore=None):
    if not (-SIZE <= x < SIZE and -SIZE <= z < SIZE): raise ValueError("خارج از نقشه")
    if any(b["x"] == x and b["z"] == z and b["id"] != ignore for b in d["buildings"]): raise ValueError("این خانه پر است")


@app.post("/api/admin/building")
@admin_only
def add_building():
    j = request.get_json(silent=True) or {}; t = j.get("type")
    if t not in CATALOG: raise ValueError("نوع ساختمان نامعتبر")
    def f(d):
        if t == "hall" and counts(d).get("hall"): raise ValueError("فقط یک تالار می‌تواند وجود داشته باشد")
        x, z = (int(j["x"]), int(j["z"])) if j.get("x") not in (None, "") and j.get("z") not in (None, "") else free_cell(d, t)
        check_cell(d, x, z)
        b = {"id": d["next_id"], "type": t, "x": x, "z": z, "rot": random.choice([0, 90, 180, 270])}
        d["next_id"] += 1; d["buildings"].append(b); log_event(d, f"🏗️ {CATALOG[t]} ساخته شد."); return b
    return jsonify(building=mutate(f))


@app.delete("/api/admin/building/<int:bid>")
@admin_only
def del_building(bid):
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b: raise ValueError("پیدا نشد")
        d["buildings"].remove(b)
        if b["type"] != "tree": log_event(d, f"🧱 {CATALOG[b['type']]} برداشته شد.")
    mutate(f); return jsonify(ok=True)


@app.put("/api/admin/building/<int:bid>")
@admin_only
def move_building(bid):
    j = request.get_json(silent=True) or {}
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b: raise ValueError("پیدا نشد")
        x, z = int(j["x"]), int(j["z"]); check_cell(d, x, z, bid); b["x"], b["z"] = x, z
        if "rot" in j: b["rot"] = int(j["rot"]) % 360
    mutate(f); return jsonify(ok=True)


@app.post("/api/admin/adjust")
@admin_only
def adjust():
    j = request.get_json(silent=True) or {}
    def f(d):
        apply_delta(d, j)
        if j.get("name"): d["country"]["name"] = str(j["name"])[:40]
        if j.get("note"): log_event(d, str(j["note"])[:200])
    mutate(f); return jsonify(ok=True)


@app.post("/api/admin/contribution")
@admin_only
def contribution():
    j = request.get_json(silent=True) or {}; kind = j.get("kind"); n = max(1, min(int(j.get("count", 1)), 100000))
    if kind not in RULES: raise ValueError("نوع نامعتبر")
    def f(d):
        apply_delta(d, {k: v * n for k, v in RULES[kind].items()})
        who = "مشترک جدید" if kind == "subscriber" else "مشارکت"
        log_event(d, f"🎉 {n} {who}" + (f" — {str(j['note'])[:120]}" if j.get("note") else "") + " به قبیله پیوست.")
    mutate(f); return jsonify(ok=True)


@app.post("/api/admin/event")
@admin_only
def story_event():
    j = request.get_json(silent=True) or {}; text = str(j.get("text", "")).strip()[:200]
    if not text: raise ValueError("متن اتفاق خالی است")
    def f(d): apply_delta(d, j.get("effects") or {}); log_event(d, "📜 " + text)
    mutate(f); return jsonify(ok=True)


@app.get("/")
def index(): return send_from_directory(HERE, "index.html")


@app.get("/admin")
def admin_page(): return send_from_directory(HERE, "admin.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
