# -*- coding: utf-8 -*-
"""تنظیمات و ثابت‌های بازی — اگر می‌خوای قیمت، قانون یا آستانه‌ای را عوض کنی، اینجاست."""
import os, math

# ───────── متغیرهای محیطی (در Render تنظیم می‌شوند) ─────────
MONGO_URI  = os.environ.get("MONGO_URI", "").strip()      # خالی = حافظه‌ی موقت
ADMIN_KEY  = os.environ.get("ADMIN_KEY", "").strip()      # رمز پنل مدیریت
BOT_TOKEN  = os.environ.get("BOT_TOKEN", "").strip()      # توکن ربات تلگرام (از BotFather)؛ بدون آن هیچ‌کس کارکتر نمی‌گیرد
PUBLIC_URL = (os.environ.get("PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
SECRET_KEY = os.environ.get("SECRET_KEY") or ADMIN_KEY or "dev-only"
DAY = int(os.environ.get("DAY_SECONDS", "600"))            # طول یک «روز بازی» به ثانیه‌ی واقعی
TZ_NAME = os.environ.get("TZ_NAME", "Asia/Tehran")        # منطقه‌ی زمانی ساعت زنده‌ی دنیا

# ───────── مسیرها ─────────
ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = ROOT                                                 # همهٔ فایل‌ها (html/css/js) کنار هم در همین پوشه‌اند

# ───────── اقتصاد و نقشه ─────────
SIZE = 20
CELL = 2
GRID = 8
U = CELL / GRID
# Footprint sizes are integer sub-cells (width, depth); all placements use gx/gz.
PATH_WIDTH_RATIO = 1 / 4
FOOT = {"house": (6, 6), "hq": (8, 8), "farm": (8, 8), "market": (8, 6),
        "tree": (2, 2), "road": (8, 8), "crossing": (2, 2), "banner": (6, 3),
        "wall": (4, 4), "tower": (6, 6), "gate": (14, 6),
        "bridge": (44, 8), "palace1": (16, 16), "palace2": (16, 16), "palace3": (16, 16),
        "warehouse": (12, 10), "workshop": (10, 8), "mill": (8, 8),
        "school": (14, 10), "clinic": (10, 8), "park": (12, 12), "store": (14, 12)}  # دفاعی: دیوار یک‌سلولی، برج، دروازهٔ روی جاده؛ فاز ۲: پل = ۴۴×۸ خرده‌سلول (۱۱×۲ واحد — کل حریم رود + فرود دو ساحل)، کاخ = ۱۶×۱۶ (۴×۴ واحد)؛ فاز ۳ کاربردی: انبار ۳×۲٫۵، کارگاه ۲٫۵×۲، توربین ۲×۲ (پروانهٔ پره‌ها)، مدرسه ۳٫۵×۲٫۵، درمانگاه ۲٫۵×۲، پارک ۳×۳ (قابل عبور)، فروشگاه ۳٫۵×۳ (واحد)
_PATH_CELLS = max(1, math.ceil(FOOT["road"][0] * PATH_WIDTH_RATIO))
FOOT["path"] = (_PATH_CELLS, _PATH_CELLS)
GRID_TYPES = ("road", "path")
FOOD_PRICE, FOOD_PER_PERSON, FARM_YIELD, MARKET_INCOME = 20000, 0.5, 10, 200000
WORKSHOP_INCOME, MILL_INCOME, STORE_INCOME = 250_000, 300_000, 600_000  # درآمد روزانهٔ کارگاه (صناعت کوچک)، توربین بادی (برق فروشی)، فروشگاه بزرگ (تجارت) — تومان؛ مدرسه/درمانگاه/انبار/پارک درآمد مستقیم ندارند (خدمات/پشتیبانی)

CATALOG = {"house": "خانه", "farm": "مزرعه", "market": "بازار", "road": "جاده", "path": "پیاده‌رو",
           "crossing": "تابلوی عابر پیاده", "banner": "تابلو بنری", "tree": "درخت", "hq": "دفتر مدیرعامل",
           "wall": "دیوار شهر", "tower": "برج نگهبانی", "gate": "دروازهٔ شهر",
           "bridge": "پل رودخانه", "palace1": "کاخ سطح ۱", "palace2": "کاخ سطح ۲", "palace3": "کاخ سطح ۳",
           "warehouse": "انبار", "workshop": "کارگاه", "mill": "توربین بادی",
           "school": "مدرسه", "clinic": "درمانگاه", "park": "پارک شهری", "store": "فروشگاه بزرگ"}
COST = {"house": 2_000_000, "farm": 1_500_000, "market": 3_000_000, "road": 100_000, "path": 50_000,
        "crossing": 20_000, "banner": 0, "tree": 0, "hq": 5_000_000, "wall": 80_000, "tower": 1_500_000, "gate": 2_000_000,
        "bridge": 3_500_000, "palace1": 12_000_000, "palace2": 20_000_000, "palace3": 30_000_000,
        "warehouse": 4_000_000, "workshop": 2_500_000, "mill": 2_000_000,
        "school": 5_000_000, "clinic": 3_500_000, "park": 1_000_000, "store": 6_000_000}  # تومان
# قوانین داستان (مطابق ویدیو): هر فالو = ۱ نفر + ۱ میلیون تومان به خزانه
RULES = {"subscriber": {"pop": 1, "money": 1_000_000, "subs": 1}, "contribution": {"pop": 1, "money": 1_000_000}}
TIERS = [(0, "قبیله"), (500, "روستا"), (5000, "شهر"), (50000, "کشور")]   # آستانه‌ها پیشنهادی‌اند؛ تغییرشان بده
GOALS = [(100, "name", "انتخاب اسم قبیله با رأی مخاطبان"), (2000, "gov", "انتخاب نظام حکومت: پادشاهی یا جمهوری")]
RES = ("pop", "money", "food", "subs")

# ───────── آب‌وهوای زنده (سیر طبیعی در سرور؛ آینهٔ WXTYPES در 06-world-weather.js) ─────────
# next: وزن گذار مارکوف از هر حالت | dur: ماندگاری هر حالت به ثانیهٔ واقعی | temp: دمای پایهٔ °C آن حالت
WEATHER_TYPES = {
    "clear":    {"next": {"clear": 3, "partly": 5, "overcast": 1, "fog": 1}, "dur": (300, 900), "temp": 27},
    "partly":   {"next": {"clear": 4, "partly": 2, "overcast": 4, "drizzle": 1, "fog": 1, "snow": .5}, "dur": (280, 800), "temp": 23},
    "overcast": {"next": {"partly": 3, "overcast": 2, "drizzle": 3, "rain": 3, "fog": 1.5, "storm": 1, "snow": 1}, "dur": (240, 700), "temp": 18},
    "fog":      {"next": {"clear": 3, "partly": 3, "overcast": 2, "fog": 1, "drizzle": 1}, "dur": (180, 480), "temp": 14},
    "drizzle":  {"next": {"overcast": 3, "rain": 3, "partly": 2, "fog": 1, "drizzle": 1}, "dur": (200, 600), "temp": 11},
    "rain":     {"next": {"drizzle": 3, "overcast": 3, "rain": 2, "storm": 1.5, "partly": 1}, "dur": (220, 600), "temp": 9},
    "storm":    {"next": {"rain": 5, "overcast": 3, "drizzle": 1}, "dur": (150, 420), "temp": 12},
    "snow":     {"next": {"overcast": 3, "partly": 2, "snow": 2, "clear": 1, "fog": 1}, "dur": (280, 800), "temp": -2},
}
WEATHER_FA = {"clear": "آفتابی", "partly": "نیمه‌ابری", "overcast": "ابری", "fog": "مه", "drizzle": "نم‌نم", "rain": "باران", "storm": "توفان", "snow": "برف"}
WEATHER_DEFAULT = {"mode": "auto", "type": "clear", "intensity": .7, "since": 0, "next": 0, "temp": 24, "transition": 25}

# ───────── وضعیت زمان اجرا (بین بخش‌ها مشترک) ─────────
runtime = {"bot_user": ""}                                 # نام کاربری ربات؛ بعد از راه‌اندازی تلگرام پر می‌شود
