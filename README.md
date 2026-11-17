# Tribe World — جهان زنده قبیله

اجرای محلی: `pip install -r requirements.txt` ← `python app.py` (بدون `MONGO_URI` داده‌ها موقتی‌اند).
دیپلوی Render همان قبلی است (`gunicorn app:app`)؛ متغیرها: `ADMIN_KEY`, `MONGO_URI`, `BOT_TOKEN`.

## کجا دنبالش بگردم؟

| می‌خوای چی رو عوض کنی؟ | کجا |
|---|---|
| ظاهر کارکترها | `web/js/characters/models.js` |
| رفتار و حرکت کارکترها | `web/js/characters/behavior.js` · مسیریابی: `navigation.js` |
| حرف زدن کارکترها | `web/js/characters/dialogue.js` · نام/حباب: `nametags.js` |
| زمین، آسمان، برکه، درخت و کوه | `web/js/world/scenery.js` |
| شب‌وروز، ستاره، ماه | `web/js/world/environment.js` |
| جاده و پیاده‌رو / ماشین‌ها | `web/js/world/roads.js` / `cars.js` |
| ساختمان‌ها و آیتم‌ها (مدل سه‌بعدی) | `web/js/buildings/models.js` |
| نمای داخل خانه (سقف باز می‌شود، مبلمان، کارت مشخصات) | `web/js/buildings/houseview.js` + `web/css/house.css` |
| نوع، نام و قیمت ساختمان‌ها | `server/config.py` (`CATALOG`, `COST`) |
| اقتصاد، مراحل، هدف‌ها | `server/config.py` + `server/world.py` |
| ربات تلگرام (پیام خوش‌آمد، وب‌هوک) | `server/telegram.py` |
| بازیکن‌ها و «کارکتر من» | `server/players.py` + `web/js/net/telegram.js` |
| پنل ادمین | `web/js/admin/panel.js` + `server/admin.py` + `server/auth.py` |
| ابزار ساخت/جابه‌جایی مدیر، لمس صحنه | `web/js/ui/interaction.js` |
| نوار بالا (منابع)، داستان آغازین | `web/js/ui/hud.js` + `web/css/hud.css` |
| ضبط ویدیو / استودیوی سینمایی | `web/js/features/recorder.js` · `cinema.js` · `hudcap.js` |
| موسیقی | `web/js/features/music.js` |
| دوربین، نور، کیفیت گرافیک | `web/js/core/engine.js` |
| ارتباط با سرور (poll) | `web/js/net/sync.js` |
| دیتابیس | `server/db.py` |

## دستورکارهای رایج

- **ساختمان جدید:** `server/config.py` (اضافه به `CATALOG` و `COST`) ← تابع مدل در `build` داخل `web/js/buildings/models.js`.
- **افکت سینمایی جدید:** یک آیتم به `EFFECTS` در `web/js/features/cinema.js`.
- **جملهٔ جدید برای آدم‌ها:** `DL` (تک‌جمله) یا `DC` (گفتگوی دونفره) در `web/js/characters/dialogue.js`.
- **API جدید مدیر:** تابع با `@bp.post(...)` و `@admin_only` در `server/admin.py`، و فراخوانی‌اش در `web/js/admin/panel.js`.
- **فایل جدید فرانت:** بساز و اسمش را به `GAME_FILES` در `web/js/boot.js` اضافه کن.

- **تغییر ظاهر خانه:** تابع `house` در `models.js` (دیوار = گروه `wl`، سقف = گروه `ro`؛ با `bake` مش‌ها ادغام می‌شوند). مبلمان داخل: `mkInterior` در `houseview.js`.

## نکتهٔ مهم فرانت

فایل‌های `web/js/**` (به‌جز `cinema.js`/`hudcap.js`) اسکریپت معمولی‌اند و **یک محیط مشترک** دارند، درست مثل وقتی که همه در یک فایل بودند؛
یعنی متغیرها و توابع هم‌دیگر را مستقیم می‌بینند (`cits`, `W`, `toast`, …) و نباید یک اسم را دوبار تعریف کنی.
ترتیب بارگذاری در `boot.js` مهم است: هر فایل فقط در لحظهٔ بارگذاری می‌تواند از فایل‌های بالاتر از خودش استفاده کند.
