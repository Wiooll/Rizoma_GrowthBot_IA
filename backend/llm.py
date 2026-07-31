"""
Rizoma — Adaptador de LLM
Suporta: Google Gemini, OpenAI GPT, Ollama (local) e modo Demo.
"""

import json
import yaml
import httpx
from pathlib import Path
from typing import Optional

CONFIG_PATH = Path("config.yaml")

# ─── Config ───────────────────────────────────────────────────────────────────

def load_config() -> dict:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {"llm": {"provider": "demo"}}


def save_config(config: dict):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)


# ─── Prompt Builder ───────────────────────────────────────────────────────────

def _build_prompt(tema: str, canal: dict, modo: str) -> str:
    plataformas = canal.get("plataformas", [])
    if isinstance(plataformas, str):
        plataformas = json.loads(plataformas)

    modo_desc = (
        "PRÉ-PRODUÇÃO: ajude a planejar o conteúdo antes de gravar. "
        "Crie um roteiro completo, valide a ideia e sugira abordagem."
        if modo == "pre"
        else
        "PÓS-PRODUÇÃO: o conteúdo já foi gravado/criado. "
        "Gere todos os assets de distribuição para múltiplas plataformas."
    )

    pre_section = (
        """,
  "roteiro_completo": {
    "intro": "roteiro detalhado da introdução (primeiros 30-60 segundos do vídeo)",
    "topicos": [
      "Tópico 1: o que abordar e pontos principais",
      "Tópico 2: o que abordar e pontos principais",
      "Tópico 3: o que abordar e pontos principais"
    ],
    "cta_final": "roteiro do encerramento e CTA final do vídeo",
    "duracao_estimada": "X a Y minutos",
    "checklist_pesquisa": [
      "item 1 para pesquisar antes de gravar",
      "item 2 para pesquisar antes de gravar"
    ],
    "analise": {
      "vale_a_pena": true,
      "motivo": "por que este conteúdo tem potencial de crescimento",
      "dificuldade_producao": 3,
      "potencial_viralizar": 4
    }
  }"""
        if modo == "pre"
        else ""
    )

    return f"""Você é o Rizoma, especialista em crescimento orgânico para criadores de conteúdo brasileiros.
Seu objetivo é maximizar o alcance orgânico usando estratégias éticas e baseadas nos algoritmos de cada plataforma.

PERFIL DO CANAL:
- Nome: {canal.get('nome', '')}
- Nicho: {canal.get('nicho', '')}
- Tom de voz: {canal.get('tom', '')}
- Público-alvo: {canal.get('publico', '')}
- Plataformas ativas: {', '.join(plataformas) if plataformas else 'todas'}

MODO: {modo_desc}

TEMA / TÍTULO DO CONTEÚDO: {tema}

INSTRUÇÕES:
- Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois.
- Use português brasileiro natural e envolvente.
- Adapte o tom ao perfil do canal.
- Otimize cada asset para o algoritmo de sua respectiva plataforma.
- Títulos YouTube: palavra-chave nos primeiros 3 palavras, máx 70 chars.
- Hashtags Instagram: mix de grandes (1M+), médias (100k-1M) e nicho (<100k).
- Thread X: gancho forte no tweet 1, valor nos intermediários, CTA no último.
- LinkedIn: começo com insight, storytelling, sem emojis excessivos.

Retorne EXATAMENTE neste formato JSON:
{{
  "youtube": {{
    "titulo": "título YouTube otimizado para SEO (máx 70 chars)",
    "descricao": "descrição completa com primeiras 2 linhas cruciais para SEO\\n\\n📌 CAPÍTULOS:\\n00:00 Introdução\\n\\n🔔 Inscreva-se e ative o sininho!\\n\\n📱 Redes Sociais:\\n\\n#hashtag1 #hashtag2 #hashtag3",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"],
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
    "cta": "chamada para ação persuasiva e natural",
    "comentario_fixado": "comentário estratégico para fixar que gera engajamento e direciona a audiência"
  }},
  "instagram": {{
    "legenda": "legenda completa com gancho na primeira linha, storytelling, quebras estratégicas e CTA\\n\\n📌 link na bio!",
    "hashtags": ["#h1", "#h2", "#h3", "#h4", "#h5", "#h6", "#h7", "#h8", "#h9", "#h10", "#h11", "#h12", "#h13", "#h14", "#h15", "#h16", "#h17", "#h18", "#h19", "#h20"],
    "cta": "CTA direto para Stories, link na bio ou DM"
  }},
  "x_twitter": {{
    "tweet": "tweet principal com gancho forte (máx 280 chars) — sem hashtags no tweet principal",
    "thread": [
      "🧵 1/6 — gancho que para o scroll",
      "2/6 — contexto e desenvolvimento do tema",
      "3/6 — insight principal ou dado surpreendente",
      "4/6 — aplicação prática ou exemplo concreto",
      "5/6 — conclusão ou virada de perspectiva",
      "6/6 — CTA claro: seguir, comentar, compartilhar"
    ]
  }},
  "linkedin": {{
    "post": "post LinkedIn completo com:\\n\\nPrimeira linha como gancho forte\\n\\n[2-3 parágrafos com insight e storytelling]\\n\\nConclusão com aprendizado\\n\\n👇 O que você acha? Comenta aí!\\n\\n#hashtag1 #hashtag2 #hashtag3"
  }},
  "facebook": {{
    "post": "post Facebook conversacional, com pergunta para gerar comentários e compartilhamentos"
  }},
  "telegram": {{
    "mensagem": "mensagem Telegram formatada:\\n\\n**Título em negrito**\\n\\n_Subtítulo em itálico_\\n\\nDesenvolvimento da mensagem\\n\\n👉 Link ou CTA"
  }},
  "short_reel": {{
    "roteiro": "[0-3s] GANCHO: frase de abertura que prende a atenção\\n\\n[3-45s] CONTEÚDO:\\n- Ponto 1\\n- Ponto 2\\n- Ponto 3\\n\\n[45-60s] CTA: chamada para ação final"
  }},
  "tiktok": {{
    "roteiro": "Roteiro TikTok:\\n\\n[Hook 0-3s]: frase ou ação que retém o usuário\\n[Desenvolvimento 3-45s]: conteúdo rápido e dinâmico\\n[Virada/surpresa 45-55s]: elemento inesperado\\n[CTA 55-60s]: engajamento",
    "caption": "legenda TikTok curta e impactante com hashtags de tendência #fyp #foryou"
  }},
  "thumbnail": {{
    "prompt_ia": "detailed prompt in English for AI image generation: [describe main visual element], [color palette], [text overlay suggestion], [style: cinematic/bold/minimalist], [lighting], [composition], 16:9 ratio, YouTube thumbnail style, high contrast, eye-catching",
    "ideias_titulo": "texto de destaque para a thumbnail (máx 4 palavras)",
    "cores_sugeridas": "paleta de cores recomendada para a thumbnail"
  }},
  "blog": {{
    "titulo_seo": "título SEO do artigo de blog (50-60 chars com palavra-chave principal)",
    "meta_description": "meta description SEO (150-160 chars descrevendo o conteúdo)",
    "introducao": "parágrafo de introdução do artigo (200-300 words) que contextualiza o tema e apresenta os tópicos"
  }}{pre_section}
}}"""


# ─── Providers ────────────────────────────────────────────────────────────────

async def _call_gemini(prompt: str, api_key: str, model: str) -> dict:
    import asyncio
    try:
        from google import genai
        from google.genai import types as genai_types
    except ImportError:
        raise ValueError(
            "Pacote nao instalado. Execute: pip install google-genai"
        )

    client = genai.Client(api_key=api_key)
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            return json.loads(response.text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Gemini retornou JSON invalido: {e}")
        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "429" in error_msg:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Backoff: 1s, 2s
                    continue
            raise ValueError(f"Erro Gemini: {e}")



async def _call_openai(prompt: str, api_key: str, model: str) -> dict:
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        resp = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
    except ImportError:
        raise ValueError("Pacote não instalado. Execute: pip install openai")
    except json.JSONDecodeError as e:
        raise ValueError(f"OpenAI retornou JSON inválido: {e}")
    except Exception as e:
        raise ValueError(f"Erro OpenAI: {e}")


async def _call_ollama(prompt: str, url: str, model: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(
                f"{url}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False, "format": "json"},
            )
            resp.raise_for_status()
            data = resp.json()
            return json.loads(data["response"])
    except httpx.ConnectError:
        raise ValueError(
            "Não foi possível conectar ao Ollama. Certifique-se que ele está rodando."
        )
    except json.JSONDecodeError as e:
        raise ValueError(f"Ollama retornou JSON inválido: {e}")
    except Exception as e:
        raise ValueError(f"Erro Ollama: {e}")


def _demo_response(tema: str) -> dict:
    """Resposta de demonstração — exibida quando nenhuma API está configurada."""
    return {
        "_demo": True,
        "_message": (
            "⚠️ Modo demonstração ativo. Configure sua chave de API em "
            "⚙️ Configurações para gerar conteúdo real com IA. "
            "Recomendamos o Google Gemini (gratuito)."
        ),
        "youtube": {
            "titulo": f"[DEMO] {tema[:60]}",
            "descricao": "Configure sua API key para gerar descrições reais otimizadas para SEO.",
            "tags": ["demo", "rizoma", "configure-api"],
            "hashtags": ["#demo", "#rizoma"],
            "cta": "Configure sua API em ⚙️ Configurações",
            "comentario_fixado": "Configure sua API para gerar conteúdo real com IA.",
        },
        "instagram": {
            "legenda": "Configure sua API key para gerar legendas reais.",
            "hashtags": ["#demo", "#rizoma"],
            "cta": "Configure em ⚙️ Configurações",
        },
        "x_twitter": {
            "tweet": f"[DEMO] Configure sua API key para gerar tweets otimizados sobre: {tema[:100]}",
            "thread": [
                "🧵 Configure sua API key para gerar threads completas.",
                "Acesse ⚙️ Configurações no Rizoma.",
                "Recomendamos Google Gemini — é gratuito!",
            ],
        },
        "linkedin": {"post": "Configure sua API key para gerar posts profissionais para LinkedIn."},
        "facebook": {"post": "Configure sua API key para gerar posts para Facebook."},
        "telegram": {"mensagem": "Configure sua API key para gerar mensagens para Telegram."},
        "short_reel": {"roteiro": "Configure sua API key para gerar roteiros de Short/Reel."},
        "tiktok": {
            "roteiro": "Configure sua API key para gerar roteiros TikTok.",
            "caption": "#demo #rizoma",
        },
        "thumbnail": {
            "prompt_ia": "Configure sua API key to generate real thumbnail prompts.",
            "ideias_titulo": "CONFIGURE API",
            "cores_sugeridas": "Verde e preto (tema Rizoma)",
        },
        "blog": {
            "titulo_seo": f"[Demo] {tema[:50]}",
            "meta_description": "Configure sua API key para gerar meta descriptions reais.",
            "introducao": "Configure sua API key para gerar introduções de artigos.",
        },
    }


# ─── Gerador Principal ────────────────────────────────────────────────────────

async def generate_content(tema: str, canal: dict, modo: str) -> dict:
    """Gera todos os assets de conteúdo usando o LLM configurado."""
    config = load_config()
    llm = config.get("llm", {})
    provider = llm.get("provider", "demo")

    prompt = _build_prompt(tema, canal, modo)

    if provider == "gemini":
        api_key = llm.get("gemini_api_key", "")
        if not api_key:
            raise ValueError(
                "Chave do Gemini não configurada. Acesse ⚙️ Configurações."
            )
        model = llm.get("gemini_model", "gemini-3.1-flash-lite")
        return await _call_gemini(prompt, api_key, model)

    elif provider == "openai":
        api_key = llm.get("openai_api_key", "")
        if not api_key:
            raise ValueError(
                "Chave da OpenAI não configurada. Acesse ⚙️ Configurações."
            )
        model = llm.get("openai_model", "gpt-4o-mini")
        return await _call_openai(prompt, api_key, model)

    elif provider == "ollama":
        url = llm.get("ollama_url", "http://localhost:11434")
        model = llm.get("ollama_model", "llama3")
        return await _call_ollama(prompt, url, model)

    else:
        return _demo_response(tema)
