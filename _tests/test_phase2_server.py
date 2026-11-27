#!/usr/bin/env python3
"""Phase 2 server tests: bridge + palace placement rules via check_place / API."""
import sys, os, json, importlib.util, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "project", "tribe-world-main")
sys.path.insert(0, ROOT)

for alias, fname in [("srv_config", "01-server-config.py"), ("srv_db", "01-server-db.py"),
                     ("srv_auth", "01-server-auth.py"), ("srv_world", "01-server-world.py"), ("srv_admin", "01-server-admin.py")]:
    spec = importlib.util.spec_from_file_location(alias, os.path.join(ROOT, fname))
    m = importlib.util.module_from_spec(spec)
    sys.modules[alias] = m
    spec.loader.exec_module(m)

sw = sys.modules["srv_world"]
sa = sys.modules["srv_admin"]
ok = fail = 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1
        print(f"  ✓ {name}")
    else:
        fail += 1
        print(f"  ✗ FAIL: {name} {extra}")


def try_place(t, x, z, rot=0):
    d = {"buildings": []}
    try:
        return sw.check_place(d, t, x, z, rot)
    except ValueError as e:
        return f"ERR:{e}"


print("── ۱) اسنپ پل: نقاط کانونی معتبر روی سه بازوی داخل نقشه")
# رود افقی z=24 (x از -40 تا 16): مرکز باید gz=96 بماند و rot=90؛ جانبی روی شبکهٔ ۸
check("drop (0,80)→(0,96,90)", sw.bridge_snap(0, 80) == (0, 96, 90), sw.bridge_snap(0, 80))
check("drop (40,110)→(40,96,90)", sw.bridge_snap(40, 110) == (40, 96, 90), sw.bridge_snap(40, 110))
# رود عمودی x=16 (z از 4 تا 24): rot=0، gz روی شبکهٔ ۸
check("drop (64,60)→(64,64,0)", sw.bridge_snap(64, 60) == (64, 64, 0), sw.bridge_snap(64, 60))
# رود افقی z=4 (x از 16 تا 72)
check("drop (90,16)→(88,16,90)", sw.bridge_snap(90, 16) == (88, 16, 90), sw.bridge_snap(90, 16))

print("── ۲) اسنپ پل: رد شدن‌ها")
check("دور از رود → None", sw.bridge_snap(0, 0) is None)
check("لبهٔ پیچ (16,4) → None", sw.bridge_snap(60, 7) is None)
check("لبهٔ پیچ z=24/x=-40 → None", sw.bridge_snap(-155, 90) is None, sw.bridge_snap(-155, 90))
check("داخل پیچ (نزدیک گوشهٔ (16,24)) → None", sw.bridge_snap(70, 90) is None, sw.bridge_snap(70, 90))

print("── ۳) check_place پل")
check("پل روی نقطهٔ کانونی + rot درست پذیرفته",
      try_place("bridge", 0, 96, 90) == (0, 96, 90))
check("پل روی همان نقطه با rot غلط رد می‌شود", isinstance(try_place("bridge", 0, 96, 0), str))
check("پل خارج از نقطهٔ کانونی رد می‌شود", isinstance(try_place("bridge", 2, 96, 90), str))
check("پل روی زمین خالی رد می‌شود", isinstance(try_place("bridge", 0, 0, 90), str))
check("پل نزدیک پیچ رد می‌شود", isinstance(try_place("bridge", 60, 7, 0), str))
# برخورد دو پل: اولی را بگذار، دومی همان‌جا → برخورد
d = {"buildings": [{"id": 1, "type": "bridge", "x": 0, "z": 96, "gx": 0, "gz": 96, "rot": 90}]}
try:
    sw.check_place(d, "bridge", 0, 96, 90)
    check("دو پل روی هم → برخورد", False)
except ValueError as e:
    check("دو پل روی هم → برخورد", "برخورد" in str(e), str(e))
# پل دوم روی نقطهٔ کانونی دیگر → آزاد
check("پل دوم روی جای دیگر آزاد", try_place("bridge", 64, 64, 0) == (64, 64, 0))
# خانه داخل حریم رود همچنان رد (پل تنها استثنا)
check("خانه داخل حریم رود همچنان رد", isinstance(try_place("house", 0, 95), str))
# خانه روی سلول‌های فرود پل (بیرون از حریم رود، داخل ردپای پل) → برخورد با پل
d2 = {"buildings": [{"id": 1, "type": "bridge", "x": 0, "z": 96, "gx": 0, "gz": 96, "rot": 90}]}
try:
    sw.check_place(d2, "tree", 0, 75, 0)
    check("درخت روی فرود پل → برخورد", False)
except ValueError as e:
    check("درخت روی فرود پل → برخورد", "برخورد" in str(e), str(e))

print("── ۴) free_cell پل و fix_pond")
d3 = {"buildings": []}
c = sw.free_cell(d3, "bridge")
snap = sw.bridge_snap(c[0], c[1])
check("free_cell پل نقطهٔ کانونی معتبر می‌دهد", snap == (c[0], c[1], 90) or snap == (c[0], c[1], 0), (c, snap))
# fix_pond نباید پل را جابه‌جا/حذف کند
d4 = {"buildings": [{"id": 1, "type": "bridge", "x": 0, "z": 96, "gx": 0, "gz": 96, "rot": 90}],
      "next_id": 2}
ch = sw.fix_pond(d4)
check("fix_pond پل را دست نمی‌زند", d4["buildings"][0]["x"] == 0 and d4["buildings"][0]["z"] == 96 and len(d4["buildings"]) == 1)

print("── ۵) کاخ: جای‌گذاری و اشغال ۱۶×۱۶")
check("کاخ سطح ۱ آزاد", try_place("palace1", 40, -40, 0) == (40, -40, 0))
check("کاخ سطح ۳ آزاد", try_place("palace3", -60, -60, 90) == (-60, -60, 90))
# اشغال: خانه چسبیده به لبهٔ کاخ → برخورد
d5 = {"buildings": [{"id": 1, "type": "palace1", "x": 40, "z": -40, "gx": 40, "gz": -40, "rot": 0}]}
try:
    sw.check_place(d5, "house", 44, -40, 0)
    check("خانه روی کاخ → برخورد", False)
except ValueError as e:
    check("خانه روی کاخ → برخورد", "برخورد" in str(e), str(e))
check("خانه کنار کاخ آزاد", try_place("house", 52, -40) == (52, -40, 0))
# auto_rot کاخ رو به جاده
d6 = {"buildings": [{"id": 1, "type": "road", "x": 0, "z": 48, "gx": 0, "gz": 48, "rot": 0}]}
r = sa.auto_rot(d6, "palace1", 0, 40, None, (), True)
check("auto_rot کاخ رو به جادهٔ جنوبی (rot 0)", r == 0, r)
r = sa.auto_rot(d6, "palace1", 0, 56, None, (), True)
check("auto_rot کاخ رو به جادهٔ شمالی (rot 180)", r == 180, r)

print("── ۶) CATALOG/COST/FOOT هم‌ترازی")
cfg = sys.modules["srv_config"]
for t in ("bridge", "palace1", "palace2", "palace3"):
    check(f"{t} در CATALOG/COST/FOOT", t in cfg.CATALOG and t in cfg.COST and t in cfg.FOOT)
check("پل ۴۴×۸", cfg.FOOT["bridge"] == (44, 8))
check("کاخ ۱۶×۱۶", cfg.FOOT["palace1"] == (16, 16) and cfg.FOOT["palace3"] == (16, 16))

print(f"\n═══ نتیجه: {ok} ✓ / {fail} ✗ ═══")
sys.exit(1 if fail else 0)
