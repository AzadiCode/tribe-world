# -*- coding: utf-8 -*-
"""مسیرهای عمومی: صفحه‌ی بازی، وضعیت دنیا (فقط مشاهده)، healthcheck + فاز ۳: باندل/کش هش‌دار/براتلی."""
from flask import Blueprint, request, jsonify, send_from_directory, redirect, abort, Response
import os, re, hashlib, zlib, threading
from srv_config import WEB
from srv_db import lock, save
from srv_world import load, tick, view

try:
    import brotli as _brotli                                # pip: Brotli — نبودِ آن فقط یعنی «براتلی خاموش»
except Exception:
    _brotli = None
try:
    import rjsmin as _rjsmin                               # pip: rjsmin — فشرده‌ساز امنِ فضای سفید/کامنت (بدون تغییر شناسه‌ها)
    _jsmin = _rjsmin.jsmin
except Exception:
    _jsmin = None

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
def index(): return _index_response()


@bp.get("/admin")
def admin_page():                                          # پنل مدیر داخل خود بازی است؛ اگر 02-web-admin.html جدا گذاشتی همان نمایش داده می‌شود
    if os.path.exists(os.path.join(WEB, "02-web-admin.html")): return send_from_directory(WEB, "02-web-admin.html")
    return redirect("/?admin=1")


_ASSET = re.compile(r"^\d\d-[a-z]+-[\w.\-]+\.(js|css)$")          # فقط فایل‌های js/css با قالب «شماره-دسته-نام»؛ کد پایتون و بقیه هرگز سرو نمی‌شوند


@bp.get("/<name>")
def asset(name):
    if _ASSET.match(name) and os.path.isfile(os.path.join(WEB, name)):
        r = send_from_directory(WEB, name)
        # فاز ۰: کش شرطی — مرورگر همیشه ETag/Last-Modified را چک می‌کند (304 بدون بدنه)؛ بدنه فقط یک‌بار دانلود می‌شود.
        r.headers["Cache-Control"] = "no-cache"
        return r
    abort(404)


# ═══ فاز ۳ — باندل سراسری + کش هش‌دار + براتلی ═══
# «یک منبع حقیقت» حفظ می‌شود: فهرست فایل‌های بازی از خود 04-js-boot.js و فهرست css از خود 02-web-index.html
# خوانده می‌شود؛ باندل فقط «همان اسکریپت‌های کلاسیک به همان ترتیب» است — معناشناسیِ محیط مشترک بیت‌به‌بیت مثل حالت dev.
# هش محتوا در URL (?v=) + Cache-Control: immutable ⇒ بارِ دوم/سوم صفر درخواست. براتلی/گزیپ یک‌بار به‌ازای هر نسخهٔ باندل
# از پیش ساخته می‌شود. هر تغییری در فایل‌های مبدأ (mtime/size) ⇒ هشِ تازه ⇒ کشِ مرورگر خودبه‌خود باطل.
# ?dev=1 ⇒ همان مسیر قدیمی (سرو فایل‌به‌فایل با کش شرطی ETag) — برای دیباگ/بنچِ تک‌فایلی.
_BUN = {"key": None, "hash": "", "js": b"", "css": b"", "jsbr": b"", "cssbr": b"", "jsgz": b"", "cssgz": b"", "html": ""}
_BUN_LOCK = threading.Lock()

_BOOT_RE = re.compile(r"const GAME_FILES\s*=\s*\[(.*?)\]\s*;", re.S)
_NAME_RE = re.compile(r"['\"]([\w.\-]+)['\"]")
_CSS_RE = re.compile(r"<link rel=\"stylesheet\" href=\"(/(\d\d-css-[\w.\-]+\.css))\">")
_SCRIPT_TAG = '<script type="module" src="/04-js-boot.js"></script>'


def _read(p): return open(os.path.join(WEB, p), encoding="utf-8").read()


def _bundle_key():
    """هشِ نسل: (نام، mtime، حجم) همهٔ فایل‌های بازی + بوت + index — هر stat چند میکروثانیه است؛ خواندن/فشرده‌سازی فقط هنگام تغییر نسخه."""
    boot = _read("04-js-boot.js")
    m = _BOOT_RE.search(boot)
    names = _NAME_RE.findall(m.group(1)) if m else []            # یک منبع حقیقت: ترتیب از خود 04-js-boot.js
    key_src = []
    for n in names:
        st = os.stat(os.path.join(WEB, n + ".js"))
        key_src.append([n, st.st_mtime_ns, st.st_size])
    st = os.stat(os.path.join(WEB, "02-web-index.html"))         # فهرست css و متن صفحه هم بخشی از نسخه‌اند
    key_src.append(["02-web-index.html", st.st_mtime_ns, st.st_size])
    return names, hashlib.sha1(repr(key_src).encode()).hexdigest()[:16]


def _bundle_build(names, key):
    """همان اسکریپت‌های کلاسیک به همان ترتیب در یک متن (+';\n' مرزِ امن ASI) + css به ترتیب index.html + براتلی/گزیپ."""
    js_parts, css_parts = [], []
    for n in names:
        raw = _read(n + ".js")
        js_parts.append(_jsmin(raw) if _jsmin else raw)
    html = _read("02-web-index.html")
    for _full, css_name in _CSS_RE.findall(html):
        css_parts.append(_read(css_name))
    js = "\n;\n".join(js_parts)                                  # «;» تنها = جملهٔ تهی؛ مرزِ ASI بین فایل‌ها را قفل می‌کند
    css = "\n".join(css_parts)
    bun = {"key": key, "hash": key, "html": _index_rewrite(html, key),
           "js": js.encode("utf-8"), "css": css.encode("utf-8")}
    bun["jsbr"] = _brotli.compress(bun["js"], quality=9) if _brotli else b""
    bun["cssbr"] = _brotli.compress(bun["css"], quality=9) if _brotli else b""
    bun["jsgz"] = zlib.compress(bun["js"], 7)
    bun["cssgz"] = zlib.compress(bun["css"], 7)
    _BUN.clear()
    _BUN.update(bun)


def _bundle():
    """نسخهٔ فعلی باندل (ترد-ایمن): کلیدِ stat هوشمند — بدون تغییر نسخه، صرفاً یک کشِ آماده."""
    with _BUN_LOCK:
        try:
            names, key = _bundle_key()
        except Exception:
            return _BUN if _BUN["key"] else {}                   # فایل گم‌شده؟ نسخهٔ موجود بماند؛ در شروعِ سرد «خالی» ⇒ صفحهٔ خام
        if _BUN["key"] != key:
            _bundle_build(names, key)
        return _BUN


def _index_rewrite(html, vhash):
    """نسخهٔ باندل‌شدهٔ صفحه: ۶ لینک css → یک باندل css؛ بوتِ ماژول با «برچسبِ» هش باندل. اگر قالب عوض شود ⇒ خام می‌ماند."""
    first = '<link rel="stylesheet" href="/03-css-base.css">'
    css_tag = '<link rel="stylesheet" href="/bundle.css?v=' + vhash + '">'
    if first not in html or _SCRIPT_TAG not in html:
        return html                                              # قالب متفاوت است ⇒ صفحهٔ خام (مسیر dev) — همیشه امن
    html = html.replace(first, css_tag, 1)                       # اول جایگزینِ اولین لینک، بعد حذفِ بقیهٔ لینک‌ها
    html = _CSS_RE.sub("", html)                                 # bundle.css با الگوی \d\d-css هم‌خوان نیست ⇒ خودش حذف نمی‌شود
    if css_tag not in html:
        return html
    return html.replace(_SCRIPT_TAG,
                        "<script>globalThis.__BUNDLE_HASH__='" + vhash + "'</script>\n" + _SCRIPT_TAG, 1)


def _encoded(raw, br, gz, ctype):
    """پاسخ با بهترین کدگذاریِ پذیرفته‌شدهٔ کلاینت؛ براتلی > گزیپ > خام."""
    ae = request.headers.get("Accept-Encoding", "")
    if _brotli and "br" in ae and br:
        data, enc = br, "br"
    elif "gzip" in ae and gz:
        data, enc = gz, "gzip"
    else:
        data, enc = raw, ""
    r = Response(data, mimetype=ctype)
    r.headers["Vary"] = "Accept-Encoding"
    if enc: r.headers["Content-Encoding"] = enc
    return r


def _index_response():
    if request.args.get("dev") is not None:                      # مسیر dev — دقیقاً همان رفتار قبل از فاز ۳
        r = send_from_directory(WEB, "02-web-index.html")
        r.headers["Cache-Control"] = "no-cache"
        return r
    try:
        bun = _bundle()
    except Exception:
        r = send_from_directory(WEB, "02-web-index.html")        # هر خطای باندل ⇒ صفحهٔ خام (بوتِ قدیمی خودش فایل‌به‌فایل می‌رود)
        r.headers["Cache-Control"] = "no-cache"
        return r
    if "__BUNDLE_HASH__" not in bun.get("html", ""):             # بازنویسی نشد (قالب عوض شده/خطا) ⇒ خام
        r = send_from_directory(WEB, "02-web-index.html")
        r.headers["Cache-Control"] = "no-cache"
        return r
    r = Response(bun["html"], mimetype="text/html")
    r.headers["Cache-Control"] = "no-cache"                      # صفحه باید همیشه تازه باشد تا هشِ تازه را ببیند
    return r


@bp.get("/bundle.js")
def bundle_js():
    try:
        bun = _bundle()
    except Exception:
        abort(404)
    v = request.args.get("v")
    if not v or v != bun["hash"]:                                # هش کهنه/غایب ⇒ هدایت به نسخهٔ تازه (یک‌بار در هر نشر)
        return redirect("/bundle.js?v=" + bun["hash"], code=302)
    r = _encoded(bun["js"], bun["jsbr"], bun["jsgz"], "text/javascript")
    r.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return r


@bp.get("/bundle.css")
def bundle_css():
    try:
        bun = _bundle()
    except Exception:
        abort(404)
    v = request.args.get("v")
    if not v or v != bun["hash"]:
        return redirect("/bundle.css?v=" + bun["hash"], code=302)
    r = _encoded(bun["css"], bun["cssbr"], bun["cssgz"], "text/css")
    r.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return r
