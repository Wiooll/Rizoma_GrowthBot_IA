"""
Rizoma â€” API FastAPI
Serve o frontend e expÃµe os endpoints REST.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path

from .database import (
    init_db,
    criar_canal, listar_canais, obter_canal, atualizar_canal, deletar_canal,
    salvar_conteudo, listar_historico, obter_conteudo,
    salvar_ideia, listar_ideias, atualizar_status_ideia, deletar_ideia,
)
from .llm import generate_content, load_config, save_config, generate_shorts_curation
from .youtube import fetch_channel_stats, fetch_video_transcript

# â”€â”€â”€ App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app = FastAPI(title="Rizoma", version="1.2.0", docs_url=None, redoc_url=None)

FRONTEND_PATH = Path("frontend")
PUBLIC_PATH = Path("public")


@app.on_event("startup")
async def startup():
    init_db()


# Arquivos estÃ¡ticos (CSS, JS)
app.mount("/static", StaticFiles(directory=str(FRONTEND_PATH)), name="static")
app.mount("/icons", StaticFiles(directory=str(PUBLIC_PATH / "icons")), name="icons")


@app.get("/manifest.webmanifest")
async def manifest():
    return FileResponse(str(PUBLIC_PATH / "manifest.webmanifest"), media_type="application/manifest+json")


@app.get("/sw.js")
async def service_worker():
    return FileResponse(str(PUBLIC_PATH / "sw.js"), media_type="application/javascript")


@app.get("/og.png")
async def social_preview():
    return FileResponse(str(PUBLIC_PATH / "og.png"), media_type="image/png")


@app.get("/")
async def root():
    return FileResponse(str(FRONTEND_PATH / "index.html"))


@app.get("/api/health")
async def health():
    init_db()
    return {"status": "ok", "app": app.title, "version": app.version}


# â”€â”€â”€ Canais â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CanalPayload(BaseModel):
    nome: str
    nicho: str
    tom: str
    publico: str
    plataformas: List[str] = []
    youtube_url: Optional[str] = ""


@app.get("/api/canais")
async def get_canais():
    return listar_canais()


@app.post("/api/canais", status_code=201)
async def post_canal(data: CanalPayload):
    canal_id = criar_canal(data.nome, data.nicho, data.tom, data.publico, data.plataformas, data.youtube_url)
    return {"id": canal_id}


@app.put("/api/canais/{canal_id}")
async def put_canal(canal_id: int, data: CanalPayload):
    if not obter_canal(canal_id):
        raise HTTPException(404, "Canal nÃ£o encontrado")
    atualizar_canal(canal_id, data.nome, data.nicho, data.tom, data.publico, data.plataformas, data.youtube_url)
    return {"ok": True}


@app.delete("/api/canais/{canal_id}")
async def delete_canal(canal_id: int):
    if not obter_canal(canal_id):
        raise HTTPException(404, "Canal nÃ£o encontrado")
    deletar_canal(canal_id)
    return {"ok": True}


# â”€â”€â”€ GeraÃ§Ã£o de ConteÃºdo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class GerarPayload(BaseModel):
    canal_id: int
    tema: str
    modo: str  # 'pre' ou 'pos'


@app.post("/api/gerar")
async def post_gerar(data: GerarPayload):
    canal = obter_canal(data.canal_id)
    if not canal:
        raise HTTPException(404, "Canal nÃ£o encontrado")

    if not data.tema.strip():
        raise HTTPException(400, "Informe o tema ou tÃ­tulo do conteÃºdo")

    if data.modo not in ("pre", "pos"):
        raise HTTPException(400, "Modo invÃ¡lido. Use 'pre' ou 'pos'")

    try:
        resultado = await generate_content(data.tema.strip(), canal, data.modo)
        conteudo_id = salvar_conteudo(data.canal_id, data.tema.strip(), data.modo, resultado)
        return {"id": conteudo_id, "resultado": resultado}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro interno ao gerar conteÃºdo: {e}")


# â”€â”€â”€ Garimpo de Cortes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ExtractShortsPayload(BaseModel):
    url: str


@app.post("/api/extract-shorts")
async def post_extract_shorts(data: ExtractShortsPayload):
    if not data.url.strip():
        raise HTTPException(400, "Informe a URL do vÃ­deo do YouTube")

    # 1. Extrai a transcriÃ§Ã£o
    transcript_result = fetch_video_transcript(data.url)
    if "error" in transcript_result:
        raise HTTPException(400, transcript_result["error"])
        
    transcript_text = transcript_result["transcript"]
    
    # 2. Chama a IA para curadoria
    try:
        resultado = await generate_shorts_curation(transcript_text)
        return {"resultado": resultado, "video_id": transcript_result["video_id"]}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Erro interno na extraÃ§Ã£o: {e}")


# â”€â”€â”€ HistÃ³rico â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/api/historico")
async def get_historico(canal_id: Optional[int] = None, limit: int = 30):
    return listar_historico(canal_id, limit)


@app.get("/api/historico/{conteudo_id}")
async def get_conteudo(conteudo_id: int):
    conteudo = obter_conteudo(conteudo_id)
    if not conteudo:
        raise HTTPException(404, "ConteÃºdo nÃ£o encontrado")
    return conteudo


# â”€â”€â”€ Ideias â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class IdeiaPayload(BaseModel):
    canal_id: int
    tema: str
    potencial: Optional[int] = 3


class IdeiaStatusPayload(BaseModel):
    status: str


@app.get("/api/ideias/{canal_id}")
async def get_ideias(canal_id: int, limit: int = 10):
    return listar_ideias(canal_id, limit)


@app.post("/api/ideias", status_code=201)
async def post_ideia(data: IdeiaPayload):
    ideia_id = salvar_ideia(data.canal_id, data.tema, data.potencial)
    return {"id": ideia_id}


@app.put("/api/ideias/{ideia_id}/status")
async def put_ideia_status(ideia_id: int, data: IdeiaStatusPayload):
    atualizar_status_ideia(ideia_id, data.status)
    return {"ok": True}


@app.delete("/api/ideias/{ideia_id}")
async def delete_ideia_route(ideia_id: int):
    deletar_ideia(ideia_id)
    return {"ok": True}


# â”€â”€â”€ ConfiguraÃ§Ãµes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/api/config")
async def get_config():
    config = load_config()
    llm = config.get("llm", {})
    # Mascara as chaves de API
    safe = {
        "provider": llm.get("provider", "demo"),
        "gemini_model": llm.get("gemini_model", "gemini-3.1-flash-lite"),
        "openai_model": llm.get("openai_model", "gpt-4o-mini"),
        "ollama_url": llm.get("ollama_url", "http://localhost:11434"),
        "ollama_model": llm.get("ollama_model", "llama3"),
        "gemini_api_key_set": bool(llm.get("gemini_api_key", "")),
        "openai_api_key_set": bool(llm.get("openai_api_key", "")),
        "youtube_api_key_set": bool(llm.get("youtube_api_key", "")),
    }
    return safe


class ConfigPayload(BaseModel):
    provider: str
    gemini_model: Optional[str] = "gemini-3.1-flash-lite"
    gemini_api_key: Optional[str] = ""
    openai_model: Optional[str] = "gpt-4o-mini"
    openai_api_key: Optional[str] = ""
    ollama_url: Optional[str] = "http://localhost:11434"
    ollama_model: Optional[str] = "llama3"
    youtube_api_key: Optional[str] = ""


@app.put("/api/config")
async def put_config(data: ConfigPayload):
    config = load_config()
    llm = config.get("llm", {})

    llm["provider"] = data.provider
    llm["gemini_model"] = data.gemini_model
    llm["openai_model"] = data.openai_model
    llm["ollama_url"] = data.ollama_url
    llm["ollama_model"] = data.ollama_model

    # SÃ³ atualiza a chave se foi enviada (nÃ£o estÃ¡ vazia ou mascarada)
    if data.gemini_api_key and not data.gemini_api_key.startswith("***"):
        llm["gemini_api_key"] = data.gemini_api_key
    if data.openai_api_key and not data.openai_api_key.startswith("***"):
        llm["openai_api_key"] = data.openai_api_key
    if data.youtube_api_key and not data.youtube_api_key.startswith("***"):
        llm["youtube_api_key"] = data.youtube_api_key

    config["llm"] = llm
    save_config(config)
    return {"ok": True}


# â”€â”€â”€ YouTube â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.get("/api/youtube/stats/{canal_id}")
async def get_youtube_stats(canal_id: int):
    canal = obter_canal(canal_id)
    if not canal:
        raise HTTPException(404, "Canal nÃ£o encontrado")

    youtube_url = canal.get("youtube_url")
    if not youtube_url:
        return {"subscriberCount": "0", "viewCount": "0", "videoCount": "0"}

    config = load_config()
    api_key = config.get("llm", {}).get("youtube_api_key", "")
    
    stats = await fetch_channel_stats(youtube_url, api_key)
    
    if "error" in stats:
        # Se houver erro, retornamos zero para nÃ£o quebrar a UI,
        # ou a UI pode tratar o erro dependendo do design.
        return {"subscriberCount": "0", "viewCount": "0", "videoCount": "0", "_error": stats["error"]}

    return stats


# â”€â”€â”€ TendÃªncias (Phase 2 placeholder) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

TREND_SAMPLES = {
    "tecnologia": [
        ("IA generativa no dia a dia", 5),
        ("Linux vs Windows para devs em 2025", 4),
        ("Python 3.13: o que mudou", 4),
        ("Self-hosting: vale a pena?", 3),
        ("GitHub Copilot vs Cursor AI", 3),
    ],
    "games": [
        ("Jogos indie que explodiram em 2025", 5),
        ("PS5 Pro: vale o upgrade?", 4),
        ("Steam Deck: setup completo", 4),
        ("Jogos gratuitos que todo gamer deve jogar", 3),
        ("IA nos jogos: o futuro dos NPCs", 3),
    ],
    "reflexÃµes": [
        ("Como parar de procrastinar de verdade", 5),
        ("Filosofia estoica aplicada hoje", 4),
        ("Digital Minimalism: como fiz o detox", 4),
        ("HÃ¡bitos de leitura que mudaram minha vida", 3),
        ("Por que a maioria desiste dos objetivos", 3),
    ],
}


@app.get("/api/trends/{canal_id}")
async def get_trends(canal_id: int):
    canal = obter_canal(canal_id)
    nicho = canal.get("nicho", "tecnologia").lower() if canal else "tecnologia"

    # Tenta encontrar o nicho mais prÃ³ximo
    trends_data = TREND_SAMPLES.get(nicho)
    if not trends_data:
        for key in TREND_SAMPLES:
            if key in nicho or nicho in key:
                trends_data = TREND_SAMPLES[key]
                break
        if not trends_data:
            trends_data = TREND_SAMPLES["tecnologia"]

    return {
        "trends": [
            {"tema": t, "potencial": p, "fonte": "Rizoma Trends"}
            for t, p in trends_data
        ],
        "fase": 2,
        "nota": "IntegraÃ§Ã£o com Google Trends e Reddit disponÃ­vel na Fase 2",
    }

