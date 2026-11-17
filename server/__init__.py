# -*- coding: utf-8 -*-
"""Tribe World — جهان زنده قبیله (بک‌اند Flask).
هر فایل یک مسئولیت دارد:
  config.py   تنظیمات و ثابت‌ها (قیمت‌ها، قوانین، مراحل)
  db.py       ذخیره‌سازی (MongoDB یا حافظه)
  world.py    منطق دنیا (اقتصاد، رویدادها، خروجی)
  auth.py     ورود و توکن مدیر
  public.py   صفحه‌ی بازی و /api/world
  telegram.py ربات تلگرام
  players.py  بازیکن‌ها و کارکتر من
  admin.py    API مدیر
"""
import logging
from flask import Flask
from .config import WEB


def create_app():
    logging.basicConfig(level=logging.INFO)
    app = Flask(__name__, static_folder=WEB, static_url_path="")   # css/js از پوشه‌ی web سرو می‌شوند
    from . import public, auth, telegram, players, admin           # هر بخش یک Blueprint است
    for part in (public, auth, telegram, players, admin):
        app.register_blueprint(part.bp)
    return app
