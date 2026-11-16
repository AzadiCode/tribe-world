# -*- coding: utf-8 -*-
"""
Tribe World — جهان زنده قبیله
Stack (مثل نمونه): Flask + MongoDB(pymongo) + فرانت تک‌فایلی (Three.js)
- بازدیدکننده: فقط مشاهده (GET /api/world)
- مدیر: پنل /admin با ADMIN_KEY؛ همه تغییرات در دیتابیس ذخیره می‌شوند
- اقتصاد: هر TICK ثانیه محاسبه می‌شود (محاسبه‌ی تأخیری، بدون thread پس‌زمینه)
"""
import os, re, json, time, hmac, hashlib, random, threading, logging
from urllib.parse import parse_qsl
from urllib.request import Request, urlopen
from functools import wraps
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory

MONGO_URI  = os.environ.get("MONGO_URI", "").strip()      # خالی = حافظه‌ی موقت
ADMIN_KEY  = os.environ.get("ADMIN_KEY", "").strip()      # رمز پنل مدیریت
BOT_TOKEN  = os.environ.get("BOT_TOKEN", "").strip()      # توکن ربات تلگرام (از BotFather)؛ بدون آن هیچ‌کس کارکتر نمی‌گیرد
PUBLIC_URL = (os.environ.get("PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
SECRET_KEY = os.environ.get("SECRET_KEY") or ADMIN_KEY or "dev-only"
SIZE = 20                                                  # نیم‌اندازه‌ی نقشه (خانه)
DAY = int(os.environ.get("DAY_SECONDS", "600"))            # طول یک «روز بازی» به ثانیه‌ی واقعی
FOOD_PRICE, FOOD_PER_PERSON, FARM_YIELD, MARKET_INCOME = 20000, 0.5, 10, 200000
TZ_NAME = os.environ.get("TZ_NAME", "Asia/Tehran")        # منطقه‌ی زمانی ساعت زنده‌ی دنیا
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

CATALOG = {"house": "خانه", "farm": "مزرعه", "market": "بازار", "road": "جاده", "path": "پیاده‌رو", "tree": "درخت", "hq": "دفتر مدیرعامل"}
COST = {"house": 2_000_000, "farm": 1_500_000, "market": 3_000_000, "road": 100_000, "path": 50_000, "tree": 0, "hq": 5_000_000}  # تومان
# قوانین داستان (مطابق ویدیو): هر فالو = ۱ نفر + ۱ میلیون تومان به خزانه
RULES = {"subscriber": {"pop": 1, "money": 1_000_000, "subs": 1}, "contribution": {"pop": 1, "money": 1_000_000}}
TIERS = [(0, "قبیله"), (500, "روستا"), (5000, "شهر"), (50000, "کشور")]   # آستانه‌ها پیشنهادی‌اند؛ تغییرشان بده
GOALS = [(100, "name", "انتخاب اسم قبیله با رأی مخاطبان"), (2000, "gov", "انتخاب نظام حکومت: پادشاهی یا جمهوری")]
RES = ("pop", "money", "food", "subs")


def now_iso(): return datetime.now(timezone.utc).isoformat(timespec="seconds")


def in_pond(x, z): return ((x * 2 + 17) / 8.6) ** 2 + ((z * 2 + 17) / 6) ** 2 < 1.15   # برکه؛ سلول‌ها → مختصات دنیا (×۲)


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


def load():
    d = col.find_one({"_id": "main"}) if col is not None else _mem.get("main")
    if not d: d = seed(); save(d)
    elif fix_pond(d) | migrate(d) | ensure_hq(d): save(d)
    return d


def fix_pond(d):                                          # ساختمان‌های قدیمیِ روی برکه جابه‌جا/حذف می‌شوند
    ch = False
    for b in list(d["buildings"]):
        if in_pond(b["x"], b["z"]):
            ch = True
            if b["type"] == "tree": d["buildings"].remove(b)
            else: b["x"], b["z"] = free_cell(d, b["type"])
    return ch


def save(d):
    if col is not None: col.replace_one({"_id": "main"}, d, upsert=True)
    else: _mem["main"] = d


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


def view(d):
    return {"rev": d["rev"], "country": d["country"], "stats": d["stats"], "capacity": capacity(d),
            "buildings": d["buildings"], "events": d["events"][:20], "catalog": CATALOG, "cost": COST, "day": DAY,
            "tier": [n for at, n in TIERS if d["stats"]["subs"] >= at][-1], "tiers": [n for _, n in TIERS],
            "citizens": d["citizens"], "bot": BOT_USER, "chat": d["chat"][-12:], "env": d["env"], "tz": TZ_NAME,
            "goals": [{"at": a, "key": k, "title": t, "value": d["story"]["values"].get(k)} for a, k, t in GOALS]}


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



# ───────────── ربات تلگرام + بازیکن‌ها ─────────────
# هویت = حساب تلگرام (initData امضاشده). فقط شناسه‌ی عددی، شماره‌ی کارکتر و آخرین بازدید ذخیره می‌شود.
HOOK = hashlib.sha256(("hook|" + BOT_TOKEN).encode()).hexdigest()[:24]
ONLINE_SEC, SEEN_SAVE, MAX_PLAYERS, PRUNE_DAYS = 75, 300, 5000, 120
BOT_USER, _tg_ready, _base = "", False, ""
_live, _saved, _joins, _renames = {}, {}, {}, {}           # فقط در حافظه


def tg_api(method, **kw):
    try:
        r = urlopen(Request(f"https://api.telegram.org/bot{BOT_TOKEN}/{method}", json.dumps(kw).encode(), {"Content-Type": "application/json"}), timeout=8)
        return json.loads(r.read().decode())
    except Exception as e:
        log.warning("telegram %s failed: %s", method, e); return {}


def tg_setup(base):
    global BOT_USER, _base
    _base = base
    me = tg_api("getMe").get("result") or {}; BOT_USER = me.get("username", "")
    tg_api("setWebhook", url=f"{base}/tg/{HOOK}", allowed_updates=["message"])
    for sc in ({"type": "default"}, {"type": "all_private_chats"}):          # دستورهای قدیمی ربات پاک می‌شود؛ فقط /start می‌ماند
        for lc in ("", "fa", "en"):
            tg_api("deleteMyCommands", scope=sc, **({"language_code": lc} if lc else {}))
    tg_api("setMyCommands", commands=[{"command": "start", "description": "شروع"}])
    tg_api("setMyCommands", commands=[{"command": "start", "description": "شروع"}], language_code="fa")
    tg_api("setChatMenuButton", menu_button={"type": "web_app", "text": "🎮 ورود به بازی", "web_app": {"url": base}})
    log.info("telegram bot @%s ready, webhook %s/tg/…", BOT_USER, base)


@app.before_request
def lazy_bot():
    global _tg_ready
    if BOT_TOKEN and not _tg_ready:
        _tg_ready = True
        base = PUBLIC_URL or request.url_root.replace("http://", "https://").rstrip("/")
        threading.Thread(target=tg_setup, args=(base,), daemon=True).start()


def tg_uid(init):
    """initData امضاشده‌ی مینی‌اپ را تأیید می‌کند و شناسه‌ی کاربر تلگرام را برمی‌گرداند (وگرنه None)"""
    if not BOT_TOKEN or not init: return None
    try:
        q = dict(parse_qsl(str(init), keep_blank_values=True)); h = q.pop("hash", "")
        data = "\n".join(f"{k}={q[k]}" for k in sorted(q))
        key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(hmac.new(key, data.encode(), hashlib.sha256).hexdigest(), h): return None
        if time.time() - int(q.get("auth_date", 0)) > 86400: return None
        return "t" + str(int(json.loads(q["user"])["id"]))
    except Exception:
        return None


def welcome(chat_id):
    url = _base or PUBLIC_URL
    tg_api("sendMessage", chat_id=chat_id, text="سلام، خوش اومدی! 👋\n\nاینجا «جهان زنده قبیله»‌ست؛ یه دنیای کوچیک که آدماش راه می‌رن، خونه می‌سازن و زندگی می‌کنن 🌍\n\nدکمهٔ پایین رو بزن و بیا تو؛ همون لحظه یه کارکتر مخصوص خودت برات ساخته می‌شه 😉",
           reply_markup={"inline_keyboard": [[{"text": "🎮 ورود به بازی", "web_app": {"url": url}}], [{"text": "🌐 باز کردن در مرورگر", "url": url}]]})


@app.post("/tg/<tok>")
def tg_hook(tok):
    if not BOT_TOKEN or not hmac.compare_digest(tok, HOOK): return "", 403
    m = (request.get_json(silent=True) or {}).get("message") or {}
    if (m.get("chat") or {}).get("type") == "private":     # هر پیامی در چت خصوصی (از جمله /start) همین پیام خوش‌آمد را می‌گیرد
        threading.Thread(target=welcome, args=(m["chat"]["id"],), daemon=True).start()
    return "ok"


def cit_name(d, cid): return (d["citizens"].get(str(cid)) or {}).get("name", "")


def assign_cid(d):
    """۱) شهروندِ نام‌دار (ادمین قبلاً اضافه کرده) که صاحب ندارد  ۲) وگرنه یک شهروند تازه به جمعیت اضافه می‌شود"""
    used = {p["cid"] for p in d["players"].values()}
    pop = int(d["stats"]["pop"])
    free = sorted(int(k) for k in d["citizens"] if k.isdigit() and 1 <= int(k) < pop and int(k) not in used)
    if free: return free[0]
    cid = max(pop, 1)
    while cid in used or str(cid) in d["citizens"]: cid += 1
    d["stats"]["pop"] = max(pop, cid + 1)
    return cid


def prune_players(d, t):                                  # بازیکنِ خیلی قدیمی (یا ردیف‌های نسخه‌ی مرورگری) آزاد می‌شود
    old = [k for k, p in d["players"].items() if not k.startswith("t") or t - p["seen"] > PRUNE_DAYS * 86400]
    for k in old:
        cid = d["players"].pop(k)["cid"]
        if not any(q["cid"] == cid for q in d["players"].values()) and (d["citizens"].get(str(cid)) or {}).get("own"): d["citizens"].pop(str(cid), None)
        _live.pop(k, None); _saved.pop(k, None)


def client_ip(): return request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()


@app.post("/api/join")
def join():
    pid = tg_uid((request.get_json(silent=True, force=True) or {}).get("init"))
    if not pid: return jsonify(cid=-1)                     # از مرورگر: فقط تماشاچی
    t = time.time()
    with lock:
        _live[pid] = t
        d = load(); P = d["players"]; p = P.get(pid)
        if p:
            if t - p["seen"] > SEEN_SAVE: p["seen"] = int(t); _saved[pid] = t; save(d)
            return jsonify(cid=p["cid"], name=cit_name(d, p["cid"]), new=False)
        ip = client_ip(); _joins[ip] = [x for x in _joins.get(ip, []) if t - x < 3600]
        if len(_joins[ip]) >= 30 or len(P) >= MAX_PLAYERS: return jsonify(cid=-1)
        _joins[ip].append(t); tick(d); prune_players(d, t)
        cid = assign_cid(d); P[pid] = {"cid": cid, "seen": int(t)}; _saved[pid] = t
        d["rev"] += 1; save(d)
        return jsonify(cid=cid, name=cit_name(d, cid), new=True)


@app.post("/api/ping")
def ping():
    pid = tg_uid((request.get_json(silent=True, force=True) or {}).get("init")); t = time.time()
    if not pid: return jsonify(ok=False), 400
    _live[pid] = t
    if t - _saved.get(pid, 0) > SEEN_SAVE:                 # دیتابیس فقط هر ~۵ دقیقه یک‌بار نوشته می‌شود
        with lock:
            d = load(); p = d["players"].get(pid)
            if p: p["seen"] = int(t); _saved[pid] = t; save(d)
    return jsonify(ok=True)


@app.post("/api/leave")
def leave():
    pid = tg_uid((request.get_json(silent=True, force=True) or {}).get("init")); t = time.time()
    if pid and pid in _live:
        _live.pop(pid, None)
        with lock:
            d = load(); p = d["players"].get(pid)
            if p: p["seen"] = int(t); _saved[pid] = t; save(d)
    return jsonify(ok=True)


@app.post("/api/player/name")
def player_name():
    j = request.get_json(silent=True, force=True) or {}; pid = tg_uid(j.get("init")); t = time.time()
    if not pid: return jsonify(error="از طریق تلگرام وارد شو"), 400
    _renames[pid] = [x for x in _renames.get(pid, []) if t - x < 60]
    if len(_renames[pid]) >= 6: return jsonify(error="کمی بعد دوباره امتحان کن"), 429
    name = re.sub(r"[\x00-\x1f\x7f<>]", "", str(j.get("name", ""))); name = re.sub(r"\s+", " ", name).strip()[:20]
    with lock:
        d = load(); p = d["players"].get(pid)
        if not p: return jsonify(error="ابتدا وارد شو"), 404
        _renames[pid].append(t)
        if name: d["citizens"][str(p["cid"])] = {"name": name, "own": 1}
        else: d["citizens"].pop(str(p["cid"]), None)
        d["rev"] += 1; save(d)
    return jsonify(ok=True, name=name)


@app.get("/api/admin/players")
@admin_only
def admin_players():
    t = time.time()
    with lock:
        d = load(); out = []
        for pid, p in d["players"].items():
            lv = _live.get(pid, 0)
            out.append({"cid": p["cid"], "name": cit_name(d, p["cid"]), "seen": int(max(p["seen"], lv)), "on": t - lv < ONLINE_SEC})
    out.sort(key=lambda x: (not x["on"], -x["seen"]))
    return jsonify(now=int(t), total=len(out), online=sum(1 for x in out if x["on"]), players=out[:150])

# ───────────── API مدیر ─────────────
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


@app.post("/api/admin/building")
@admin_only
def add_building():
    j = request.get_json(silent=True) or {}; t = j.get("type")
    if t not in CATALOG: raise ValueError("نوع ساختمان نامعتبر")
    def f(d):
        if t == "hq" and any(i["type"] == "hq" for i in d["buildings"]): raise ValueError("دفتر مدیرعامل فقط یکی است")
        cost = 0 if j.get("free") else COST[t]
        if d["stats"]["money"] < cost: raise ValueError("پول خزانه کافی نیست")
        x, z = (int(j["x"]), int(j["z"])) if j.get("x") not in (None, "") and j.get("z") not in (None, "") else free_cell(d, t)
        check_cell(d, x, z)
        b = {"id": d["next_id"], "type": t, "x": x, "z": z, "rot": random.choice([0, 90, 180, 270])}
        d["next_id"] += 1; d["buildings"].append(b); d["stats"]["money"] -= cost
        if t != "tree": log_event(d, f"{CATALOG[t]} ساخته شد" + (f" (−{cost/1e6:g} میلیون تومان)." if cost else "."))
        return b
    return jsonify(building=mutate(f))


@app.delete("/api/admin/building/<int:bid>")
@admin_only
def del_building(bid):
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b: raise ValueError("پیدا نشد")
        d["buildings"].remove(b)
        if b["type"] != "tree": log_event(d, f"{CATALOG[b['type']]} برداشته شد.")
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
        log_event(d, f"{n} {who}" + (f" — {str(j['note'])[:120]}" if j.get("note") else "") + " به قبیله پیوست.")
    mutate(f); return jsonify(ok=True)


@app.post("/api/admin/milestone")
@admin_only
def milestone():
    j = request.get_json(silent=True) or {}; key, val = j.get("key"), str(j.get("value", "")).strip()[:40]
    if key not in [g[1] for g in GOALS] or not val: raise ValueError("کلید یا مقدار نامعتبر")
    def f(d):
        d["story"]["values"][key] = val
        if key == "name": d["country"]["name"] = val; log_event(d, f"با رأی شما نام قبیله شد «{val}».")
        else: d["country"]["gov"] = val; log_event(d, f"نظام حکومت: {val}.")
    mutate(f); return jsonify(ok=True)


@app.post("/api/admin/event")
@admin_only
def story_event():
    j = request.get_json(silent=True) or {}; text = str(j.get("text", "")).strip()[:200]
    if not text: raise ValueError("متن اتفاق خالی است")
    def f(d): apply_delta(d, j.get("effects") or {}); log_event(d, "" + text)
    mutate(f); return jsonify(ok=True)


@app.put("/api/admin/citizen/<int:i>")
@admin_only
def set_citizen(i):                                       # نام مستعار آدم‌ها (خالی = پیش‌فرض)
    name = str((request.get_json(silent=True) or {}).get("name", "")).strip()[:20]
    if not 0 <= i < 500: raise ValueError("شناسه نامعتبر")
    def f(d):
        if name: d["citizens"][str(i)] = {"name": name}
        else: d["citizens"].pop(str(i), None)
    mutate(f); return jsonify(ok=True)


@app.post("/api/admin/say")
@admin_only
def say():                                                # پیام بالای سر یک آدم (cid خالی = تصادفی)
    j = request.get_json(silent=True) or {}; text = str(j.get("text", "")).strip()[:120]
    if not text: raise ValueError("پیام خالی است")
    cid = int(j["cid"]) if j.get("cid") not in (None, "") else -1
    def f(d):
        d["chat_id"] += 1; d["chat"] = (d["chat"] + [{"id": d["chat_id"], "cid": cid, "text": text}])[-40:]
    mutate(f); return jsonify(ok=True)


@app.post("/api/admin/env")
@admin_only
def set_env():                                            # live = ساعت واقعی | fixed = ساعت ثابت | lapse = گذر سریع روز
    j = request.get_json(silent=True) or {}; mode = j.get("mode", "live")
    if mode not in ("live", "fixed", "lapse"): raise ValueError("حالت نامعتبر")
    hour = float(j.get("hour") or 0) % 24
    def f(d): d["env"] = {"mode": mode, "hour": hour}
    mutate(f); return jsonify(ok=True)


@app.get("/")
def index(): return send_from_directory(HERE, "index.html")


@app.get("/admin")
def admin_page(): return send_from_directory(HERE, "admin.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
