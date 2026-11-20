# -*- coding: utf-8 -*-
"""API مدیر (همه با X-Admin-Token): ساخت/جابه‌جایی/حذف ساختمان (تکی و نقشهٔ ساخت دسته‌ای)، تغییر منابع، مشارکت‌ها،
رأی‌گیری، اتفاق داستانی، نام آدم‌ها، پیام بالای سر، و زمان دنیا. (ورود مدیر ← auth.py | فهرست آنلاین‌ها ← players.py)"""
from flask import Blueprint, request, jsonify
import time
from srv_auth import admin_only
from srv_config import CATALOG, COST, RULES, GOALS, FOOT, U, GRID_TYPES, WEATHER_TYPES, WEATHER_DEFAULT, WEATHER_FA
from srv_world import mutate, free_cell, check_place, log_event, apply_delta, rects_of, tiles_of

bp = Blueprint("admin", __name__)


def crossing_anchored(d, gx, gz, extra=()):
    """تابلوی عابر پیاده باید با لبهٔ خود به یک کاشی جاده بچسبد (تماس واقعی footprint، مثل fpTouchDir فرانت).
    جاده ۸ خرده‌سلول است و تابلو ۲ سلول ⇒ فاصلهٔ مرکزها در ضلع تماس ۵ و در محور عمود حداکثر ۴ است."""
    for r in [b for b in list(d["buildings"]) + list(extra) if b.get("type") == "road"]:
        dx = int(r.get("gx", r["x"])) - gx
        dz = int(r.get("gz", r["z"])) - gz
        if (abs(dx) == 5 and abs(dz) <= 4) or (abs(dz) == 5 and abs(dx) <= 4):
            return True
    return False


def banner_anchored(d, gx, gz, rot=0):
    """تابلو بنری باید با لبهٔ خود به دفتر مدیرعامل بچسبد (جلوی دفتر یا گوشهٔ آن).
    تماس واقعی خرده‌سلول‌ها با تماس چهارجهته — دقیقاً مثل fpTouchDir فرانت؛ بدون فاصله و بدون هم‌پوشانی."""
    hqs = [b for b in d["buildings"] if b.get("type") == "hq"]
    if not hqs: return False
    cand = {"type": "banner", "gx": gx, "gz": gz, "x": gx, "z": gz, "rot": rot}
    bc = rects_of(cand)[0]
    for hq in hqs:
        hc = rects_of(hq)[0]
        if any((x + dx, z + dz) in hc for x, z in bc for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            return True
    return False


@bp.post("/api/admin/building")
@admin_only
def add_building():
    j = request.get_json(silent=True) or {}; t = j.get("type")
    if t not in CATALOG: raise ValueError("نوع ساختمان نامعتبر")
    def f(d):
        if t == "hq" and any(i["type"] == "hq" for i in d["buildings"]): raise ValueError("دفتر مدیرعامل فقط یکی است")
        cost = 0 if j.get("free") else COST[t]
        if d["stats"]["money"] < cost: raise ValueError("پول خزانه کافی نیست")
        x, z = (float(j["x"]), float(j["z"])) if j.get("x") not in (None, "") and j.get("z") not in (None, "") else free_cell(d, t)
        x, z, rot = check_place(d, t, x, z, auto_rot(d, t, x, z, j.get("rot"), auto=bool(j.get("ar"))))
        if t == "crossing" and not crossing_anchored(d, x, z): raise ValueError("تابلوی عابر پیاده باید کنار خیابان باشد")
        if t == "banner" and not banner_anchored(d, x, z, rot): raise ValueError("تابلو بنری باید به دفتر مدیرعامل بچسبد")
        b = {"id": d["next_id"], "type": t, "x": x, "z": z, "gx": x, "gz": z, "rot": rot,
             **({"style": "dirt" if j.get("style") == "dirt" else "stone"} if t == "path" else {}),
             **({"bn": "شهر من|||"} if t == "banner" else {})}
        d["next_id"] += 1; d["buildings"].append(b); d["stats"]["money"] -= cost
        if t != "tree": log_event(d, f"{CATALOG[t]} ساخته شد" + (f" (−{cost/1e6:g} میلیون تومان)." if cost else "."))
        return b
    return jsonify(building=mutate(f))


def auto_rot(d, t, x, z, rot=None, extra=(), auto=False):
    """Orient house/HQ toward the closest adjacent occupied road/path cell."""
    r = int(rot or 0) % 360
    if t not in ("house", "hq") or (rot is not None and not auto):
        return r
    roads = [b for b in list(d["buildings"]) + list(extra) if b["type"] in ("road", "path")]
    if not roads:
        return r
    dirs = {0: (0, 1), 90: (1, 0), 180: (0, -1), 270: (-1, 0)}
    best = None
    for angle, (dx, dz) in dirs.items():
        w, h = FOOT[t]
        if angle % 180: w, h = h, w
        if dx:
            gx = x + (w // 2 if dx > 0 else -(w // 2 + 1))
            edge = [(gx, z + q) for q in range(-(h // 2), h - h // 2)]
        else:
            gz = z + (h // 2 if dz > 0 else -(h // 2 + 1))
            edge = [(x + q, gz) for q in range(-(w // 2), w - w // 2)]
        dist = 10**9
        road_tiles = tiles_of(roads)
        for road in roads:
            cells = set().union(*rects_of(road, road_tiles))
            for ex, ez in edge:
                if cells:
                    dist = min(dist, min(abs(ex-cx)+abs(ez-cz) for cx,cz in cells))
        if best is None or dist < best[0]:
            best = (dist, angle)
    return best[1] if best else r


@bp.post("/api/admin/buildings/batch")
@admin_only
def add_buildings_batch():
    """ساخت دسته‌ایِ نقشهٔ ساخت: [{type,x,z,rot?}, …] — همه یا هیچ.
    جاده/پیاده‌رو اول ساخته می‌شوند تا چرخش خودکار خانه‌ها در همان دسته هم درست کار کند.
    free=رایگان؛ هزینهٔ کل یکجا کم می‌شود و یک رویداد جمعی ثبت می‌شود."""
    j = request.get_json(silent=True) or {}
    items = j.get("items") or []
    if not isinstance(items, list) or not (1 <= len(items) <= 400): raise ValueError("فهرست نامعتبر (۱ تا ۴۰۰ مورد)")
    free = bool(j.get("free"))
    def f(d):
        for i in items:
            if i.get("type") not in CATALOG: raise ValueError("نوع ساختمان نامعتبر")
        if sum(1 for i in items if i["type"] == "hq") + sum(1 for i in d["buildings"] if i["type"] == "hq") > 1: raise ValueError("دفتر مدیرعامل فقط یکی است")
        # جاده/پیاده‌رو اول تا چرخش خودکار خانه‌ها به آن‌ها درست حساب شود
        order = sorted(items, key=lambda i: 0 if i["type"] in ("road", "path") else 1)
        made = []
        for k, i in enumerate(order):                      # همه یا هیچ: روی فهرست جدا کار می‌کنیم و آخر یکجا اعمال می‌شود
            t = i["type"]
            x, z, rot = check_place(d, t, i["x"], i["z"], auto_rot(d, t, float(i["x"]), float(i["z"]), i.get("rot"), made, bool(i.get("ar"))), None, made)
            if t == "crossing" and not crossing_anchored(d, x, z, made): raise ValueError("تابلوی عابر پیاده باید کنار خیابان باشد")
            made.append({"id": d["next_id"] + k, "type": t, "x": x, "z": z, "gx": x, "gz": z, "rot": rot, **({"style": "dirt" if i.get("style") == "dirt" else "stone"} if t == "path" else {})})
        total = 0 if free else sum(COST[b["type"]] for b in made)
        if d["stats"]["money"] < total: raise ValueError("پول خزانه کافی نیست")
        d["next_id"] += len(made); d["buildings"].extend(made); d["stats"]["money"] -= total
        kinds = {}
        for b in made: kinds[CATALOG[b["type"]]] = kinds.get(CATALOG[b["type"]], 0) + 1
        log_event(d, "نقشهٔ ساخت اجرا شد: " + "، ".join(f"{n}× {k}" for k, n in kinds.items()) + (f" (−{total/1e6:g} میلیون تومان)." if total else "."))
        return made
    return jsonify(buildings=mutate(f), ok=True)


@bp.delete("/api/admin/building/<int:bid>")
@admin_only
def del_building(bid):
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b: raise ValueError("پیدا نشد")
        d["buildings"].remove(b)
        if b["type"] != "tree": log_event(d, f"{CATALOG[b['type']]} برداشته شد.")
    mutate(f); return jsonify(ok=True)


@bp.put("/api/admin/building/<int:bid>")
@admin_only
def move_building(bid):
    j = request.get_json(silent=True) or {}
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b: raise ValueError("پیدا نشد")
        b["x"], b["z"], b["rot"] = check_place(d, b["type"], j["x"], j["z"], j["rot"] if "rot" in j else b.get("rot", 0), bid)
        if b["type"] == "crossing" and not crossing_anchored(d, b["x"], b["z"]): raise ValueError("تابلوی عابر پیاده باید کنار خیابان باشد")
        b["gx"], b["gz"] = b["x"], b["z"]
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/road-lights")
@admin_only
def road_lights():
    """چراغ راهنمایی تقاطع‌ها فقط با دست مدیر: روی کاشی جاده بزن — اگر خودش تقاطع (۳+ همسایه) باشد یا
    همسایهٔ یک تقاطع، چراغ‌های «همان تقاطع» اعمال یا کلاً حذف می‌شوند (فیلد tl روی رکورد کاشی تقاطع)."""
    j = request.get_json(silent=True) or {}
    try: bid = int(j.get("id", -1))
    except (TypeError, ValueError): raise ValueError("شناسه نامعتبر")
    def f(d):
        roads = [b for b in d["buildings"] if b["type"] == "road"]
        def nbrs(b):
            out = []
            for o in roads:
                if o is b: continue
                dx, dz = o["x"] - b["x"], o["z"] - b["z"]
                if (abs(dx) == 8 and dz == 0) or (abs(dz) == 8 and dx == 0): out.append(o)
            return out
        tgt = next((b for b in roads if b["id"] == bid), None)
        if not tgt: raise ValueError("کاشی جاده پیدا نشد")
        if len(nbrs(tgt)) < 3:
            cand = [o for o in nbrs(tgt) if len(nbrs(o)) >= 3]
            if not cand: raise ValueError("این قطعه تقاطع نیست؛ روی سه‌راه/چهارراه یا جادهٔ کنارش بزن")
            tgt = min(cand, key=lambda o: 0 if o.get("tl") else 1)   # اگر چند تقاطع همسایه باشد، اولویت با تقاطعِ چراغ‌دار است
        if tgt.get("tl"): tgt.pop("tl", None); log_event(d, "چراغ راهنمایی این تقاطع حذف شد.")
        else: tgt["tl"] = 1; log_event(d, "چراغ راهنمایی این تقاطع اعمال شد.")
        return {"id": tgt["id"], "on": bool(tgt.get("tl"))}
    return jsonify(mutate(f))


@bp.post("/api/admin/banner")
@admin_only
def banner_text():
    """متن تابلو بنری جلوی دفتر مدیرعامل: اسم شهر / مدیرعامل / تاریخ ساخت / متن اضافه —
    در فیلد bn با جداکنندهٔ | ذخیره می‌شود؛ تغییر bn امضای sync را عوض می‌کند و مش تابلو با متن تازه بازسازی می‌شود."""
    j = request.get_json(silent=True) or {}
    try: bid = int(j.get("id", -1))
    except (TypeError, ValueError): raise ValueError("شناسه نامعتبر")
    def f(d):
        b = next((b for b in d["buildings"] if b["id"] == bid and b["type"] == "banner"), None)
        if not b: raise ValueError("تابلو بنری پیدا نشد")
        vals = [str(j.get(k, "") or "").replace("|", "،").strip()[:40] for k in ("name", "ceo", "date", "extra")]
        b["bn"] = "|".join(vals)
        log_event(d, "متن تابلو بنری به‌روزرسانی شد.")
        return {"bn": b["bn"]}
    return jsonify(mutate(f))


@bp.post("/api/admin/adjust")
@admin_only
def adjust():
    j = request.get_json(silent=True) or {}
    def f(d):
        apply_delta(d, j)
        if j.get("name"): d["country"]["name"] = str(j["name"])[:40]
        if j.get("note"): log_event(d, str(j["note"])[:200])
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/contribution")
@admin_only
def contribution():
    j = request.get_json(silent=True) or {}; kind = j.get("kind"); n = max(1, min(int(j.get("count", 1)), 100000))
    if kind not in RULES: raise ValueError("نوع نامعتبر")
    def f(d):
        apply_delta(d, {k: v * n for k, v in RULES[kind].items()})
        who = "مشترک جدید" if kind == "subscriber" else "مشارکت"
        log_event(d, f"{n} {who}" + (f" — {str(j['note'])[:120]}" if j.get("note") else "") + " به قبیله پیوست.")
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/milestone")
@admin_only
def milestone():
    j = request.get_json(silent=True) or {}; key, val = j.get("key"), str(j.get("value", "")).strip()[:40]
    if key not in [g[1] for g in GOALS] or not val: raise ValueError("کلید یا مقدار نامعتبر")
    def f(d):
        d["story"]["values"][key] = val
        if key == "name": d["country"]["name"] = val; log_event(d, f"با رأی شما نام قبیله شد «{val}».")
        else: d["country"]["gov"] = val; log_event(d, f"نظام حکومت: {val}.")
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/event")
@admin_only
def story_event():
    j = request.get_json(silent=True) or {}; text = str(j.get("text", "")).strip()[:200]
    if not text: raise ValueError("متن اتفاق خالی است")
    def f(d): apply_delta(d, j.get("effects") or {}); log_event(d, "" + text)
    mutate(f); return jsonify(ok=True)


@bp.put("/api/admin/citizen/<int:i>")
@admin_only
def set_citizen(i):                                       # نام مستعار آدم‌ها (خالی = پیش‌فرض)
    name = str((request.get_json(silent=True) or {}).get("name", "")).strip()[:20]
    if not 0 <= i < 500: raise ValueError("شناسه نامعتبر")
    def f(d):
        if name: d["citizens"][str(i)] = {"name": name}
        else: d["citizens"].pop(str(i), None)
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/say")
@admin_only
def say():                                                # پیام بالای سر یک آدم (cid خالی = تصادفی)
    j = request.get_json(silent=True) or {}; text = str(j.get("text", "")).strip()[:120]
    if not text: raise ValueError("پیام خالی است")
    cid = int(j["cid"]) if j.get("cid") not in (None, "") else -1
    def f(d):
        d["chat_id"] += 1; d["chat"] = (d["chat"] + [{"id": d["chat_id"], "cid": cid, "text": text}])[-40:]
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/env")
@admin_only
def set_env():                                            # live = ساعت واقعی | fixed = ساعت ثابت | lapse = گذر سریع روز
    j = request.get_json(silent=True) or {}; mode = j.get("mode", "live")
    if mode not in ("live", "fixed", "lapse"): raise ValueError("حالت نامعتبر")
    hour = float(j.get("hour") or 0) % 24
    def f(d): d["env"] = {"mode": mode, "hour": hour}
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/weather")
@admin_only
def set_weather():
    """آب‌وهوای دنیا: auto = چرخهٔ طبیعی سرور (مارکوف) | manual = نوع + شدت + گذار + دمای پایه.
    وضعیت روی سند main ذخیره می‌شود، با rev جدید برای همه sync می‌شود و در view() هم می‌آید."""
    j = request.get_json(silent=True) or {}
    mode = "auto" if j.get("mode", "manual") == "auto" else "manual"
    def f(d):
        w = d.get("weather") if isinstance(d.get("weather"), dict) else dict(WEATHER_DEFAULT)
        now = time.time()
        if mode == "auto":
            w.update(mode="auto", next=0)                  # اولین tick بعدی، سیر طبیعی را ادامه می‌دهد
            log_event(d, "آب‌وهوا به چرخهٔ طبیعی برگشت.")
        else:
            t = j.get("type")
            if t not in WEATHER_TYPES: raise ValueError("نوع آب‌وهوا نامعتبر")
            try: inten = max(.1, min(1, float(j.get("intensity", .7))))
            except (TypeError, ValueError): inten = .7
            try: trans = max(3, min(180, int(j.get("transition", 25))))
            except (TypeError, ValueError): trans = 25
            try: temp = max(-15, min(48, float(j.get("temp", w.get("temp", 24)))))
            except (TypeError, ValueError): temp = 24
            w.update(mode="manual", type=t, intensity=round(inten, 2), since=now,
                     next=now + 86400 * 365, temp=round(temp, 1), transition=trans)
            log_event(d, "آب‌وهوا تنظیم شد: " + WEATHER_FA[t] + ".")
        d["weather"] = w
    mutate(f); return jsonify(ok=True)
