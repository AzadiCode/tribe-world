# -*- coding: utf-8 -*-
"""مسیرهای عمومی: صفحه‌ی بازی، وضعیت دنیا (فقط مشاهده) و healthcheck."""
from flask import Blueprint, request, jsonify, send_from_directory, redirect, abort
import os, re
from srv_config import WEB
from srv_db import lock, save
from srv_world import load, tick, view

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
def index(): return send_from_directory(WEB, "02-web-index.html")


@bp.get("/admin")
def admin_page():                                          # پنل مدیر داخل خود بازی است؛ اگر 02-web-admin.html جدا گذاشتی همان نمایش داده می‌شود
    if os.path.exists(os.path.join(WEB, "02-web-admin.html")): return send_from_directory(WEB, "02-web-admin.html")
    return redirect("/?admin=1")


_ASSET = re.compile(r"^\d\d-[a-z]+-[\w.\-]+\.(js|css)$")          # فقط فایل‌های js/css با قالب «شماره-دسته-نام»؛ کد پایتون و بقیه هرگز سرو نمی‌شوند


@bp.get("/<name>")
def asset(name):
    if _ASSET.match(name) and os.path.isfile(os.path.join(WEB, name)): return send_from_directory(WEB, name)
    abort(404)
