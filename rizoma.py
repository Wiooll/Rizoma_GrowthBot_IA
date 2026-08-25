"""
Rizoma - GrowthBot AI Pessoal
Um conteudo. Todas as direcoes.

Entry point: python rizoma.py
"""

import os
import sys
import threading
import time
import webbrowser
from pathlib import Path

import uvicorn

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

APP_VERSION = "1.2.0"


def runtime_data_dir() -> Path:
    configured = os.getenv("RIZOMA_DATA_DIR", "").strip()
    return Path(configured) if configured else ROOT / "data"


def runtime_host() -> str:
    return os.getenv("RIZOMA_HOST", "0.0.0.0").strip() or "0.0.0.0"


def runtime_port() -> int:
    raw_port = os.getenv("PORT") or os.getenv("RIZOMA_PORT") or "8000"
    try:
        return int(raw_port)
    except ValueError:
        return 8000


def open_browser():
    """Abre o navegador apos o servidor iniciar."""
    time.sleep(1.8)
    webbrowser.open(f"http://127.0.0.1:{runtime_port()}")


def print_banner():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    banner = """
  ==========================================
         R I Z O M A  -  v{version}
      Um conteudo. Todas as direcoes.
  ==========================================

  Acesse Local: http://127.0.0.1:{port}
  Acesse na Rede: http://<seu-ip-local>:{port}
  Pressione Ctrl+C para encerrar
"""
    print(banner.format(version=APP_VERSION, port=runtime_port()))


def should_open_browser():
    """Evita abrir navegador automaticamente em ambientes sem interface."""
    return os.getenv("RIZOMA_OPEN_BROWSER", "1").strip().lower() not in {"0", "false", "no"}


if __name__ == "__main__":
    print_banner()
    runtime_data_dir().mkdir(parents=True, exist_ok=True)

    if should_open_browser():
        threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run(
        "backend.main:app",
        host=runtime_host(),
        port=runtime_port(),
        reload=False,
        log_level="warning",
    )