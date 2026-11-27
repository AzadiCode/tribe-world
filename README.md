# خروجی نهایی — گسترش ساخت‌وساز در ۳ فاز (دیوار/برج/دروازه + کاخ/پل + کاربردی‌ها)

هر سه فاز کامل، اعمال‌شده روی پروژه و تأییدشده با تست واقعی بازی (روز/شب). قواعد ثابت در هر سه فاز:
صفر دوران/قفل‌گشایی — همه‌چیز بلافاصله قابل ساخت؛ پالت و متریال فقط از دنیای خود بازی
(`WALL_*` بتنی روشن هم‌خانوادهٔ پیاده‌رو/HQ، شیشهٔ `HQGL`، باند `AWN`، سقف از پالت `ROOF`، پنجره‌های گرم `GLOW`)؛
بدون هیچ بافت یا رنگ تازه. هیچ حالت قرون‌وسطایی (سنگ تیره/کاهگل) وجود ندارد.

---

## فاز ۱ — مجموعهٔ دفاعی مدرن‌شده (۱۳ فایل — `phase1-changed-files/`)

| فایل | تغییر |
|---|---|
| `01-server-config.py` | `FOOT/CATALOG/COST` سه نوع: `wall` (۱×۱)، `tower` (۲×۲)، `gate` (۳×۱) |
| `01-server-world.py` | ردپای چندپارهٔ دروازه (`_gate_parts` + `_cells_of`)، قاعدهٔ «دروازه روی کاشی جاده + عبور جاده» در `check_place` |
| `01-server-admin.py` | `auto_rot` دروازه (هم‌راستا با جاده) |
| `03-css-admin.css` | استایل پالت ساخت دسته‌بندی‌شده |
| `05-core-main.js` | انیمیشن پرچم تاب‌خور (`userData.flg`) |
| `06-world-roads.js` | نقاط نور شب دیوار/برج/دروازه در `lampPts` |
| `07-buildings-chunks.js` | قواعد چانک دفاعی‌ها |
| `07-buildings-footprint.js` | ماسک اتصال دیوار، اسنپ دروازه، `fpBaseY` |
| `07-buildings-models.js` | `wallMesh` (ماسک اتصال ۴جهته + کنگره + بندکشی)، `towerMesh`/`gateMesh` (سقف از `ROOF`، پرچم، فانوس، پنجره‌های `GLOW`)، پالت `WALL_*` |
| `08-characters-navigation.js` | `NAV_STATIC`؛ دیوار/برج کل ردپا بلاک، دروازه فقط دو پایه (دهانه باز برای شهروند و خودرو) |
| `09-ui-blueprint.js` | استروک دیوار (`bpWallMask`)، اسنپ دروازه (`bpGateSnap`)، دلیل خطا `#bpe` |
| `09-ui-interaction.js` | پالت دسته‌بندی‌شده (مسکونی/اقتصادی/دفاعی/خدمات/تزئینی با آیکون+هزینه)، دیوار در `isTile` |
| `PROJECT_GUIDE.md` | تاریخچه + جدول‌ها + تله‌های فاز ۱ |

اسکرین‌شات‌ها: `phase1-wall-tower-gate-day.png`، `phase1-gate-closeup.png`، `phase1-verify-day.png`، `phase1-verify-night.png`

## فاز ۲ — کاخ شهری سه‌سطحی + پل رودخانه (۱۴ فایل — `phase2-changed-files/`)

| فایل | تغییر |
|---|---|
| `01-server-config.py` | `bridge=(44,8)` و `palace1/2/3=(16,16)` در FOOT/CATALOG/COST |
| `01-server-world.py` | `bridge_snap` (آینهٔ فرانت)، قواعد پل در `check_place`، معافیت `fix_pond`، `free_cell` پل |
| `01-server-admin.py` | `auto_rot` پل (عمود بر رود) و کاخ‌ها (رو به جاده) |
| `05-core-main.js` | پرچم‌های چندگانه روی `userData.flgs` |
| `06-world-cars.js` / `08-characters-models.js` / `08-characters-behavior.js` | ارتفاع از `groundY` (روی عرشهٔ پل) |
| `06-world-roads.js` | نور شب عرشه (۴ چراغ) و کاخ (ورودی+حیاط) |
| `07-buildings-footprint.js` | `fpBridgeSnap`، پروفیل `BRIDGE_Y`، معافیت پل از حریم رود |
| `07-buildings-models.js` | `palaceMesh` سه‌سطحی (حصار+برج+بنگاه، تاج `HQGL` و نشان شهر در سطح ۳)، `bridgeMesh` (عرشهٔ قوسی ۱۱-قطعه‌ای، پایه‌های جفتی)، `mkFlag` چند-پرچمی |
| `08-characters-navigation.js` | پل = `unblk` رود + ۵ گرهٔ خودرو روی عرشه + هزینهٔ عرشه ۰٫۵ |
| `09-ui-blueprint.js` | قاعدهٔ پل در `bpVal`، اسنپ پل در شبح/چیدن/جابه‌جایی، `BP_AUTO` کاخ‌ها |
| `09-ui-interaction.js` | کاخ‌ها در مسکونی، پل در خدمات؛ `bpPick` فقط مش |
| `PROJECT_GUIDE.md` | تاریخچه فاز ۲ + ۹ تلهٔ جدید |

اسکرین‌شات‌ها: `phase2-palace-day/night.png`، `phase2-palace-tiers.png`، `phase2-bridge-day/night.png`، `phase2-bridge-close.png`، `phase2-bridge-traffic.png`، `phase2-bridge2-day.png`، `phase2-city-overview.png`

## فاز ۳ — هفت ساختمان کاربردی + باندل سروری (۱۵ فایل — `phase3-changed-files/`)

| فایل | تغییر |
|---|---|
| `01-server-config.py` | انبار ۱۲×۱۰، کارگاه ۱۰×۸، توربین ۸×۸، مدرسه ۱۴×۱۰، درمانگاه ۱۰×۸، پارک ۱۲×۱۲، فروشگاه ۱۴×۱۲ (خرده‌سلول) + درآمدهای `WORKSHOP/MILL/STORE_INCOME` |
| `01-server-world.py` | درآمد کارگاه/فروشگاه/توربین در `tick` |
| `01-server-admin.py` | کاربردی‌ها در خانوادهٔ چرخش خودکار؛ توربین متقارن |
| `01-server-public.py` | **باندل سروری** `/bundle.js` + `/bundle.css` هش‌دار، کش immutable، براتلی (js ۳۰۹KB←۷۱KB)، `?dev=1` مسیر قدیمی |
| `05-core-main.js` | چرخش پیوستهٔ پروانهٔ توربین (`userData.rotors`، ~۲۱rpm) |
| `07-buildings-chunks.js` | کاربردی‌های ایستا در `CH_MERGE`؛ توربین هرگز |
| `07-buildings-footprint.js` | ردپای هفت نوع |
| `07-buildings-models.js` | `wareMesh/workMesh/millMesh/schoolMesh/clinicMesh/parkMesh/storeMesh` + صلیب سبز `CLXG` + چراغ هوانوردی `REDL` |
| `08-characters-navigation.js` | کاربردی‌های توپُر کل ردپا بلاک؛ **پارک کفِ قابل‌عبور** (۴ جای نشستن رو به فواره) |
| `09-ui-blueprint.js` / `09-ui-interaction.js` | کاربردی‌ها در پالت (اقتصادی/خدمات/تزئینی) + `BP_AUTO` |
| `PROJECT_GUIDE.md` | تاریخچه فاز ۳ + تله‌های باندل و کاربردی‌ها |
| +۴ اسکریپت تست/رندر | `test_phase3_server.py`، `test_phase3_ui.js`، `build_phase3.py`، `run_phase3_test.sh`، `shot_north.js` |

اسکرین‌شات‌ها: `phase3-district-day/night.png`، `phase3-east-day/night.png`، `phase3-west-day.png`، `phase3-school-front.png`، `phase3-workshop-front.png`، `phase3-clinic-front.png`، `phase3-clinic-front-night.png`، `phase3-store-night.png`، `phase3-turbine-day/night.png`، `phase3-park-day.png`، `phase3-bundle-mode.png`

---

## مرجع بصری (از ابتدای کار)
- `ref-A-real-game-day.png` / `ref-A2-real-game-closeup.png` — اسکرین‌شات واقعی بازی (مرجع سبک)
- `ref-B-inspiration.jpg` — تصویر الهام (فقط فرم سازه‌ها)
- `reference-comparison.html` — صفحهٔ مقایسهٔ A/B با تحلیل ۵وجهی (پالت/مقیاس/زاویه/نور/تزئین)

## وضعیت تست (اجرای مجدد کامل — امروز، همه سبز)
- `py_compile` همهٔ py و `node --check` همهٔ js ✓
- تست سرور فاز ۳: **۴۳ سبز / ۰ قرمز** (`scripts/test_phase3_server.py`)
- تست سرور فاز ۲: **۳۱ سبز / ۰ قرمز** (`scripts/test_phase2_server.py`)
- تست UI کامل فاز ۳ (سرور تازه + شهر دمو + محلهٔ کاربردی + Playwright): **ALL GREEN، صفر خطای کنسول**
- رگرسیون UI فاز ۱+۲ (دفاع + کاخ/پل + هم‌ارزی اسنپ ۱۱٬۴۴۹ نقطه، ۰ اختلاف): **همه سبز، صفر خطای کنسول**
- رندر واقعی: ۱۶۹ draw call / ~۱۴۹k مثلث در صحنهٔ دمو — داخل بودجهٔ §۹

## اجرای دوبارهٔ تست‌ها
```bash
bash scripts/run_phase3_test.sh        # سرور تازه + شهر دمو + محلهٔ کاربردی + تست کامل UI
bash scripts/run_phase2_test.sh        # سرور تازه + شهر دمو + دفاع فاز ۱ + کاخ/پل
python3 scripts/test_phase3_server.py  # تست سرور فاز ۳ به‌تنهایی
python3 scripts/test_phase2_server.py  # تست سرور فاز ۲ به‌تنهایی
```

## فایل‌های پروژه
نسخهٔ اعمال‌شدهٔ نهایی در `project/tribe-world-main/` است — همهٔ فایل‌های تغییرکردهٔ هر سه فاز داخلش اعمال شده‌اند (تطبیق بایت‌به‌بایت با `phase3-changed-files/` تأیید شد). برای انتشار، کل پوشهٔ پروژه را با همین فایل‌ها بفرستید.
