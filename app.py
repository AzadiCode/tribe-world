# -*- coding: utf-8 -*-
"""نقطه‌ی ورود (gunicorn app:app). همهٔ فایل‌ها در همین پوشه‌اند؛ بک‌اند = فایل‌های 01-server-*.py؛ راهنما: README.md

اسم فایل‌ها با عدد شروع می‌شود و پایتون با «import» معمولی نمی‌تواند آن‌ها را بخواند؛ پس اینجا هرکدام را با یک نام مستعار (srv_*) ثبت می‌کنیم.
فایل بک‌اند جدید؟ بساز (01-server-نام.py) و یک خط به جدول زیر اضافه کن؛ ترتیب مهم است (هر فایل فقط از فایل‌های بالاتر import کند)."""
import os, sys, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PARTS = (  # (نام مستعار, فایل)
    ("srv_config",   "01-server-config.py"),
    ("srv_db",       "01-server-db.py"),
    ("srv_world",    "01-server-world.py"),
    ("srv_auth",     "01-server-auth.py"),
    ("srv_telegram", "01-server-telegram.py"),
    ("srv_players",  "01-server-players.py"),
    ("srv_admin",    "01-server-admin.py"),
    ("srv_public",   "01-server-public.py"),
    ("srv_init",     "01-server-init.py"),
)
for alias, fname in PARTS:
    spec = importlib.util.spec_from_file_location(alias, os.path.join(HERE, fname))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[alias] = mod
    spec.loader.exec_module(mod)

from srv_init import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
