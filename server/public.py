# -*- coding: utf-8 -*-
"""مسیرهای عمومی: صفحه‌ی بازی، وضعیت دنیا (فقط مشاهده) و healthcheck."""
from flask import Blueprint, request, jsonify, send_from_directory, redirect
import os
from .config import WEB
from .db import lock, save
from .world import load, tick, view

bp = Blueprint("public", __name__)


@bp.get("/api/world")
def world():
    with lock:
        d = load()
        if tick(d): save(d)
        if request.args.get("since", type=int) == d["rev"]: return jsonify(rev=d["rev"], same=True)
        return jsonify(view(d))


@bp.get("/healthz")
def health(): return "ok"


@bp.get("/")
def index(): return send_from_directory(WEB, "index.html")


@bp.get("/admin")
def admin_page():                                          # پنل مدیر داخل خود بازی است؛ اگر admin.html جدا گذاشتی همان نمایش داده می‌شود
    if os.path.exists(os.path.join(WEB, "admin.html")): return send_from_directory(WEB, "admin.html")
    return redirect("/?admin=1")
