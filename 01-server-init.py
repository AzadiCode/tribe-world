# -*- coding: utf-8 -*-
"""Tribe World — جهان زنده قبیله (بک‌اند Flask). همهٔ فایل‌ها در یک پوشه‌اند؛ فایل‌های بک‌اند با 01-server- شروع می‌شوند.
هر فایل یک مسئولیت دارد (نام مستعار import در app.py تعریف شده):
  01-server-config.py    تنظیمات و ثابت‌ها (قیمت‌ها، قوانین، مراحل)         [srv_config]
  01-server-db.py        ذخیره‌سازی (MongoDB یا حافظه)                       [srv_db]
  01-server-world.py     منطق دنیا (اقتصاد، رویدادها، خروجی)                 [srv_world]
  01-server-auth.py      ورود و توکن مدیر                                    [srv_auth]
  01-server-public.py    صفحه‌ی بازی، فایل‌های css/js و /api/world            [srv_public]
  01-server-telegram.py  ربات تلگرام                                         [srv_telegram]
  01-server-players.py   بازیکن‌ها و کارکتر من                               [srv_players]
  01-server-admin.py     API مدیر                                            [srv_admin]
"""
import logging
from flask import Flask


def create_app():
    logging.basicConfig(level=logging.INFO)
    app = Flask(__name__, static_folder=None)                      # فایل‌های css/js را خود public.py (فقط .js/.css) سرو می‌کند
    import srv_public, srv_auth, srv_telegram, srv_players, srv_admin   # هر بخش یک Blueprint است
    for part in (srv_public, srv_auth, srv_telegram, srv_players, srv_admin):
        app.register_blueprint(part.bp)
    return app
