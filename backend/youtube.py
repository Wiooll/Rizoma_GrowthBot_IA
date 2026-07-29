"""
Rizoma — Módulo de Integração com YouTube API v3
Extrai identificadores de canais, busca estatísticas e faz cache em memória.
"""
import httpx
import re
import time
from typing import Optional

# Cache simples em memória: { "identificador": {"data": dict, "expires_at": float} }
CACHE = {}
CACHE_TTL = 3600  # 1 hora em segundos


def extract_channel_identifier(url: str) -> Optional[str]:
    """
    Extrai o identificador do canal de uma URL ou string bruta.
    Suporta formatos:
    - https://youtube.com/@handle
    - https://youtube.com/channel/UCID
    - https://youtube.com/c/customname
    - @handle
    - UCID
    """
    url = url.strip()
    if not url:
        return None

    # Se já é um ID (começa com UC e tem 24 chars)
    if url.startswith("UC") and len(url) == 24 and " " not in url:
        return f"id={url}"

    # Se é apenas um handle
    if url.startswith("@") and "/" not in url:
        return f"forHandle={url}"

    # Se é URL com /channel/
    match = re.search(r"/channel/(UC[\w-]+)", url)
    if match:
        return f"id={match.group(1)}"

    # Se é URL com /@handle
    match = re.search(r"/(@[\w.-]+)", url)
    if match:
        return f"forHandle={match.group(1)}"

    # Se é URL com /c/ ou /user/ (legado, vamos tentar forUsername)
    match = re.search(r"/(?:c|user)/([\w-]+)", url)
    if match:
        return f"forUsername={match.group(1)}"

    # Fallback (tenta como forHandle se tiver @ em algum lugar, senão ignora)
    if "@" in url:
        return f"forHandle={url[url.find('@'):]}"

    return None


async def fetch_channel_stats(url: str, api_key: str) -> dict:
    """
    Busca estatísticas do canal na API do YouTube.
    Retorna um dicionário com inscritos, views e vídeos.
    """
    if not api_key:
        return {"error": "Chave da API do YouTube não configurada."}

    identificador = extract_channel_identifier(url)
    if not identificador:
        return {"error": "URL ou formato do canal inválido."}

    # Verifica o cache
    agora = time.time()
    cache_entry = CACHE.get(identificador)
    if cache_entry and cache_entry["expires_at"] > agora:
        return cache_entry["data"]

    try:
        api_url = f"https://www.googleapis.com/youtube/v3/channels?part=statistics&{identificador}&key={api_key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(api_url)
            resp.raise_for_status()
            data = resp.json()

        if not data.get("items"):
            return {"error": "Canal não encontrado na API do YouTube."}

        stats = data["items"][0].get("statistics", {})
        
        resultado = {
            "subscriberCount": stats.get("subscriberCount", "0"),
            "viewCount": stats.get("viewCount", "0"),
            "videoCount": stats.get("videoCount", "0"),
        }

        # Salva no cache
        CACHE[identificador] = {
            "data": resultado,
            "expires_at": agora + CACHE_TTL
        }

        return resultado

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            return {"error": "Acesso negado (Chave inválida ou cota excedida)."}
        return {"error": f"Erro na API do YouTube (Status {e.response.status_code})."}
    except Exception as e:
        return {"error": f"Falha ao conectar com o YouTube: {str(e)}"}
