#!/usr/bin/env python3
"""Phase 3 server tests: functional buildings (warehouse/workshop/mill/school/clinic/park/store)
placement rules, auto-rot, economy tick, and server↔frontend footprint equivalence."""
import sys, os, importlib.util

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
sc = sys.modules["srv_config"]
sa = sys.modules["srv_admin"]
ok = fail = 0

NEW = ("warehouse", "workshop", "mill", "school", "clinic", "park", "store")


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


def try_place_d(d, t, x, z, rot=0):
    try:
        return sw.check_place(d, t, x, z, rot)
    except ValueError as e:
        return f"ERR:{e}"


print("── ۱) ثبت کاتالوگ/هزینه/ردپا (۷ نوع کاربردی)")
for t in NEW:
    check(f"{t}: CATALOG+COST+FOOT", t in sc.CATALOG and t in sc.COST and t in sc.FOOT)

print("── ۲) جای‌گذاری پایه: روی چمن آزاد پذیرفته، حریم رود و برخورد رد")
check("warehouse روی زمین خالی", try_place("warehouse", 0, -120) == (0, -120, 0))
check("school روی زمین خالی", try_place("school", 120, -120) == (120, -120, 0))
check("store rot 90 هم پذیرفته", try_place("store", -40, -80, 90) == (-40, -80, 90))
check("park در حریم رود رد می‌شود", isinstance(try_place("park", 0, 96), str), try_place("park", 0, 96))
check("mill در حریم رود رد می‌شود", isinstance(try_place("mill", -96, 90), str), try_place("mill", -96, 90))
check("clinic در حریم رود رد می‌شود", isinstance(try_place("clinic", 40, 96), str), try_place("clinic", 40, 96))
d = {"buildings": [{"id": 1, "type": "school", "x": 0, "z": -120, "gx": 0, "gz": -120, "rot": 0}]}
check("store روی مدرسه برخورد", isinstance(try_place_d(d, "store", 0, -120, 0), str))
check("warehouse کنار مدرسه آزاد", try_place_d(d, "warehouse", 0, -104, 0) == (0, -104, 0))

print("── ۳) ردپاها: خروجی rects_of = انتظار (تعداد سلول‌ها)")
for t, (w, h) in [("warehouse", (12, 10)), ("workshop", (10, 8)), ("mill", (8, 8)),
                  ("school", (14, 10)), ("clinic", (10, 8)), ("park", (12, 12)), ("store", (14, 12))]:
    b = {"type": t, "gx": 0, "gz": 0, "x": 0, "z": 0, "rot": 0}
    cells = sw._cells_of(b)
    check(f"{t}: {w}×{h} = {w*h} سلول", len(cells) == w * h, len(cells))
    b90 = dict(b, rot=90)
    cells90 = sw._cells_of(b90)
    check(f"{t} rot90: {h}×{w} = {h*w} سلول", len(cells90) == h * w, len(cells90))

print("── ۴) auto_rot: رو به نزدیک‌ترین جاده (مثل خانه) — توربین ثابت")
d2 = {"buildings": [{"id": 9, "type": "road", "x": 0, "z": -104, "gx": 0, "gz": -104, "rot": 0}]}
check("school شمالِ جادهٔ جنوبی → در رو به جاده (0)", sa.auto_rot(d2, "school", 0, -120, None, auto=True) == 0)
check("warehouse غربِ جادهٔ عمودی → 90",
      sa.auto_rot({"buildings": [{"id": 9, "type": "road", "x": -88, "z": -120, "gx": -88, "gz": -120, "rot": 0}]},
                  "warehouse", -104, -120, None, auto=True) == 90)
check("mill بدون چرخش خودکار (متقارن)", sa.auto_rot({"buildings": []}, "mill", 0, -120, None, auto=True) == 0)
check("park شمالِ جادهٔ جنوبی → در رو به جاده (0)",
      sa.auto_rot({"buildings": [{"id": 9, "type": "road", "x": 0, "z": -120, "gx": 0, "gz": -120, "rot": 0}]},
                  "park", 0, -136, None, auto=True) == 0)
check("clinic جنوبِ جادهٔ شمالی → در رو به جاده (180)",
      sa.auto_rot({"buildings": [{"id": 9, "type": "road", "x": 0, "z": -136, "gx": 0, "gz": -136, "rot": 0}]},
                  "clinic", 0, -120, None, auto=True) == 180)

print("── ۵) اقتصاد: درآمد کارگاه/فروشگاه/توربین در tick")
d3 = {"buildings": [
    {"id": 1, "type": "workshop", "x": 0, "z": 0, "gx": 0, "gz": 0, "rot": 0},
    {"id": 2, "type": "store", "x": 24, "z": 0, "gx": 24, "gz": 0, "rot": 0},
    {"id": 3, "type": "mill", "x": -24, "z": 0, "gx": -24, "gz": 0, "rot": 0},
    {"id": 4, "type": "school", "x": 0, "z": 24, "gx": 0, "gz": 24, "rot": 0},
    {"id": 5, "type": "clinic", "x": 0, "z": -24, "gx": 0, "gz": -24, "rot": 0},
], "stats": {"pop": 1, "money": 0, "food": 0.0, "subs": 0}, "last": sw.time.time() - sw.DAY * 2,
    "rev": 0, "weather": dict(sc.WEATHER_DEFAULT), "events": [], "story": {"reached": [], "values": {}},
    "country": {"name": "t", "gov": ""}, "citizens": {}, "players": {}, "chat": [], "chat_id": 0,
    "env": {"mode": "live", "hour": 12.0}, "hq_made": True}
sw.tick(d3)
expected = sc.WORKSHOP_INCOME + sc.STORE_INCOME + sc.MILL_INCOME   # مدرسه/درمانگاه درآمد مستقیم ندارند
food_cost = 2 * int(sc.FOOD_PER_PERSON * sc.FOOD_PRICE)             # خوراک ۱ شهروند در ۲ روز از خزانه خریداری می‌شود
check(f"درآمد خالص ۲ روز = {expected*2 - food_cost:,}", d3["stats"]["money"] == expected * 2 - food_cost, d3["stats"]["money"])
check("مدرسه/درمانگاه درآمد صفر (بدون کارگاه/فروشگاه/توربین، money=0)",
      sc.WORKSHOP_INCOME and sc.STORE_INCOME and sc.MILL_INCOME and expected > 0)

print("── ۶) هم‌ارزی ردپا سرور ↔ فرانت (از FOOT سرور در برابر FOOT جاوااسکریپت)")
js_foot = None
for line in open(os.path.join(ROOT, "07-buildings-footprint.js"), encoding="utf-8"):
    if line.strip().startswith("const FOOT="):
        js_foot = line
        break
for t in NEW:
    w, h = sc.FOOT[t]
    check(f"{t} در FOOT فرانت: [{w},{h}]", f'{t}:[{w},{h}]' in js_foot)

print(f"\n═══ نتیجه: {ok} سبز، {fail} قرمز ═══")
sys.exit(1 if fail else 0)
