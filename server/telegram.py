# -*- coding: utf-8 -*-
"""ربات تلگرام: وب‌هوک، پیام خوش‌آمد، منوی ربات، و تأیید هویت مینی‌اپ (initData امضاشده)."""
import json, time, hmac, hashlib, threading
from urllib.parse import parse_qsl
from urllib.request import Request, urlopen
from flask import Blueprint, request
from .config import BOT_TOKEN, PUBLIC_URL, runtime
from .db import log

bp = Blueprint("telegram", __name__)
HOOK = hashlib.sha256(("hook|" + BOT_TOKEN).encode()).hexdigest()[:24]
_tg_ready, _base = False, ""


def tg_api(method, **kw):
    try:
        r = urlopen(Request(f"https://api.telegram.org/bot{BOT_TOKEN}/{method}", json.dumps(kw).encode(), {"Content-Type": "application/json"}), timeout=8)
        return json.loads(r.read().decode())
    except Exception as e:
        log.warning("telegram %s failed: %s", method, e); return {}


def tg_setup(base):
    global _base
    _base = base
    me = tg_api("getMe").get("result") or {}; runtime["bot_user"] = me.get("username", "")
    tg_api("setWebhook", url=f"{base}/tg/{HOOK}", allowed_updates=["message"])
    for sc in ({"type": "default"}, {"type": "all_private_chats"}):          # دستورهای قدیمی ربات پاک می‌شود؛ فقط /start می‌ماند
        for lc in ("", "fa", "en"):
            tg_api("deleteMyCommands", scope=sc, **({"language_code": lc} if lc else {}))
    tg_api("setMyCommands", commands=[{"command": "start", "description": "شروع"}])
    tg_api("setMyCommands", commands=[{"command": "start", "description": "شروع"}], language_code="fa")
    tg_api("setChatMenuButton", menu_button={"type": "web_app", "text": "🎮 ورود به بازی", "web_app": {"url": base}})
    log.info("telegram bot @%s ready, webhook %s/tg/…", runtime["bot_user"], base)


@bp.before_app_request
def lazy_bot():                                            # با اولین درخواست، ربات در پس‌زمینه راه‌اندازی می‌شود
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


def welcome(chat_id):                                      # متن پیام خوش‌آمد ربات را اینجا عوض کن
    url = _base or PUBLIC_URL
    tg_api("sendMessage", chat_id=chat_id, text="سلام، خوش اومدی! 👋\n\nاینجا «جهان زنده قبیله»‌ست؛ یه دنیای کوچیک که آدماش راه می‌رن، خونه می‌سازن و زندگی می‌کنن 🌍\n\nدکمهٔ پایین رو بزن و بیا تو؛ همون لحظه یه کارکتر مخصوص خودت برات ساخته می‌شه 😉",
           reply_markup={"inline_keyboard": [[{"text": "🎮 ورود به بازی", "web_app": {"url": url}}], [{"text": "🌐 باز کردن در مرورگر", "url": url}]]})


@bp.post("/tg/<tok>")
def tg_hook(tok):
    if not BOT_TOKEN or not hmac.compare_digest(tok, HOOK): return "", 403
    m = (request.get_json(silent=True) or {}).get("message") or {}
    if (m.get("chat") or {}).get("type") == "private":     # هر پیامی در چت خصوصی (از جمله /start) همین پیام خوش‌آمد را می‌گیرد
        threading.Thread(target=welcome, args=(m["chat"]["id"],), daemon=True).start()
    return "ok"
