# -*- coding: utf-8 -*-
"""بازیکن‌ها: ورود با تلگرام (join)، حضور آنلاین (ping/leave)، اسم کارکتر، و فهرست آنلاین‌ها برای مدیر.
هویت = حساب تلگرام؛ فقط شناسه‌ی عددی، شماره‌ی کارکتر و آخرین بازدید ذخیره می‌شود."""
import re, time
from flask import Blueprint, request, jsonify
from .auth import admin_only
from .db import lock, save
from .telegram import tg_uid
from .world import load, tick

bp = Blueprint("players", __name__)
ONLINE_SEC, SEEN_SAVE, MAX_PLAYERS, PRUNE_DAYS = 75, 300, 5000, 120
_live, _saved, _joins, _renames = {}, {}, {}, {}           # فقط در حافظه


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


@bp.post("/api/join")
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


@bp.post("/api/ping")
def ping():
    pid = tg_uid((request.get_json(silent=True, force=True) or {}).get("init")); t = time.time()
    if not pid: return jsonify(ok=False), 400
    _live[pid] = t
    if t - _saved.get(pid, 0) > SEEN_SAVE:                 # دیتابیس فقط هر ~۵ دقیقه یک‌بار نوشته می‌شود
        with lock:
            d = load(); p = d["players"].get(pid)
            if p: p["seen"] = int(t); _saved[pid] = t; save(d)
    return jsonify(ok=True)


@bp.post("/api/leave")
def leave():
    pid = tg_uid((request.get_json(silent=True, force=True) or {}).get("init")); t = time.time()
    if pid and pid in _live:
        _live.pop(pid, None)
        with lock:
            d = load(); p = d["players"].get(pid)
            if p: p["seen"] = int(t); _saved[pid] = t; save(d)
    return jsonify(ok=True)


@bp.post("/api/player/name")
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


@bp.get("/api/admin/players")
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

