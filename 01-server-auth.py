# -*- coding: utf-8 -*-
"""احراز هویت مدیر: ورود با ADMIN_KEY ← توکن امضاشده‌ی ۱۲ ساعته؛ دکوراتور admin_only برای مسیرهای مدیر."""
import time, hmac, hashlib
from functools import wraps
from flask import Blueprint, request, jsonify
from srv_config import ADMIN_KEY, SECRET_KEY

bp = Blueprint("auth", __name__)
_fails = {}


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


@bp.post("/api/admin/login")
def login():
    ip, t = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0], time.time()
    _fails[ip] = [x for x in _fails.get(ip, []) if t - x < 600]
    if len(_fails[ip]) >= 5: return jsonify(error="تلاش زیاد؛ چند دقیقه بعد دوباره امتحان کن"), 429
    key = str((request.get_json(silent=True) or {}).get("key", ""))
    if not ADMIN_KEY or not hmac.compare_digest(key.encode(), ADMIN_KEY.encode()):
        _fails[ip].append(t); return jsonify(error="رمز اشتباه است"), 401
    return jsonify(token=make_token())
