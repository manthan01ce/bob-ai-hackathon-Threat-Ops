import sys
import os
from fastapi import Request

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))

SRC_BACKEND = os.path.join(ROOT_DIR, "src", "backend")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if os.path.exists(SRC_BACKEND) and SRC_BACKEND not in sys.path:
    sys.path.insert(0, SRC_BACKEND)
if os.path.exists(BACKEND_DIR) and BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app

@app.get("/debug-path")
@app.get("/api/debug-path")
def debug_path(request: Request):
    return {
        "url_path": request.url.path,
        "headers": {k: v for k, v in request.headers.items()},
        "scope_path": request.scope.get("path")
    }
