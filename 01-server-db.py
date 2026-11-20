# -*- coding: utf-8 -*-
"""ذخیره‌سازی: MongoDB (اگر MONGO_URI باشد) وگرنه حافظه‌ی موقت. فقط خواندن/نوشتن خام؛ منطق بازی در world.py"""
import logging, threading
from srv_config import MONGO_URI

log = logging.getLogger("tribe")
lock = threading.RLock()                                   # همه‌ی خواندن/نوشتن‌های دنیا زیر این قفل انجام می‌شود

if MONGO_URI:
    from pymongo import MongoClient
    col = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000).get_database("tribeworld").world
else:
    col = None
    log.warning("MONGO_URI تنظیم نشده؛ داده‌ها با هر ری‌استارت پاک می‌شوند")
_mem = {}


def fetch():
    return col.find_one({"_id": "main"}) if col is not None else _mem.get("main")


def save(d):
    if col is not None: col.replace_one({"_id": "main"}, d, upsert=True)
    else: _mem["main"] = d
