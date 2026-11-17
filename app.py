# -*- coding: utf-8 -*-
"""نقطه‌ی ورود (gunicorn app:app). منطق در پوشه‌ی server/ است؛ راهنما: README.md"""
import os
from server import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
