"""
Rizoma — GrowthBot AI Pessoal
Um conteúdo. Todas as direções.

Entry point: python rizoma.py
"""

import uvicorn
import webbrowser
import threading
import time
import os
import sys
from pathlib import Path

# Garante que o diretório raiz está no path
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))


def open_browser():
    """Abre o navegador após o servidor iniciar."""
    time.sleep(1.8)
    webbrowser.open("http://127.0.0.1:8000")


def print_banner():
    import sys
    import io
    # Força UTF-8 no stdout para compatibilidade com Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    banner = """
  ==========================================
         R I Z O M A  -  v1.0.1
      Um conteudo. Todas as direcoes.
  ==========================================

  Acesse Local: http://127.0.0.1:8000
  Acesse na Rede: http://<seu-ip-local>:8000
  Pressione Ctrl+C para encerrar
"""
    print(banner)


if __name__ == "__main__":
    print_banner()

    # Cria diretório de dados se não existir
    (ROOT / "data").mkdir(exist_ok=True)

    # Abre navegador em background
    threading.Thread(target=open_browser, daemon=True).start()

    # Inicia servidor FastAPI
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="warning",
    )
