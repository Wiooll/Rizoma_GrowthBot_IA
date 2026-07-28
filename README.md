# 🌿 Rizoma — GrowthBot AI Pessoal
> **Um conteúdo. Todas as direções.**

Ferramenta pessoal de crescimento orgânico para criadores de conteúdo. Transforma qualquer tema em assets otimizados para YouTube, Instagram, X/Thread, LinkedIn, Facebook, TikTok, Telegram, Short/Reel e Blog — com um único clique.

---

## 🚀 Como Rodar

### 1. Pré-requisitos

- Python 3.10 ou superior
- pip

### 2. Instale as dependências

```bash
pip install -r requirements.txt
```

> 💡 Se não quiser instalar os pacotes de LLM agora, instale apenas o mínimo:
> ```bash
> pip install fastapi uvicorn pyyaml httpx python-multipart
> ```

### 3. Inicie o Rizoma

```bash
python rizoma.py
```

O navegador abrirá automaticamente em `http://127.0.0.1:8000` (acesso local).
Para acessar em outros dispositivos na rede, utilize `http://<seu-ip-local>:8000`.

---

## ⚙️ Configurando a IA

O Rizoma suporta 3 provedores de IA. Acesse **⚙️ Configurações** no app:

| Provedor | Custo | Como configurar |
|---|---|---|
| **Google Gemini** ⭐ | Gratuito | Crie uma chave em [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| **OpenAI GPT** | Pago | Crie uma chave em [platform.openai.com](https://platform.openai.com/api-keys) |
| **Ollama** | Gratuito (local) | Instale em [ollama.ai](https://ollama.ai) e rode `ollama run llama3` |

> Sem configurar uma API key, o app roda em **modo demo** — você vê a interface funcionando mas sem geração real.

---

## 📁 Estrutura do Projeto

```
rizoma/
├── rizoma.py              # Entry point — python rizoma.py
├── config.yaml            # Configurações (LLM, servidor)
├── requirements.txt       # Dependências Python
│
├── backend/
│   ├── main.py            # FastAPI — rotas da API REST
│   ├── database.py        # SQLite — canais, conteúdos, ideias
│   └── llm.py             # Adaptador LLM + builder de prompts
│
├── frontend/
│   ├── index.html         # SPA principal
│   ├── css/style.css      # Design system (dark + verde)
│   └── js/app.js          # Lógica da interface
│
└── data/
    └── rizoma.db          # Banco SQLite (criado automaticamente)
```

---

## 🌿 Funcionalidades — v1.0.1

### ⚡ Geração de Conteúdo
- **Pós-produção**: insira o tema de um vídeo já gravado → receba todos os assets prontos
- **Pré-produção**: insira uma ideia → receba roteiro completo, análise e sugestões
- Assets gerados: YouTube (título, descrição, tags, hashtags, CTA, comentário fixado), Instagram, X/Thread, LinkedIn, Facebook, TikTok, Short/Reel, Telegram, Thumbnail prompt, Blog

### 📺 Múltiplos Canais
- Crie perfis separados por nicho (Games, Tech, Reflexões...)
- Cada canal tem tom de voz, público-alvo e plataformas independentes
- O bot adapta o conteúdo automaticamente ao perfil do canal

### 💡 Ideias e Tendências
- Salve e organize ideias de conteúdo por canal
- Painel de tendências por nicho no dashboard

### 📚 Histórico
- Todo conteúdo gerado é salvo localmente no SQLite
- Visualize e reutilize assets anteriores

### ⌨️ Atalho
- **Ctrl + Enter** na caixa de texto para gerar conteúdo rapidamente

---

## 🔮 Roadmap

| Fase | Status | Funcionalidade |
|---|---|---|
| Fase 1 | ✅ Completa | MVP — Geração de conteúdo, múltiplos canais, histórico |
| Fase 2 | 🔜 Planejada | Google Trends + Reddit — oportunidades reais |
| Fase 3 | 🔜 Planejada | Calendário visual de postagens |
| Fase 4 | 🔜 Planejada | YouTube Analytics API — dashboard de crescimento |

---

## 🔒 Privacidade

O Rizoma é 100% local. Seus dados ficam no arquivo `data/rizoma.db` na sua máquina. Nenhuma informação é enviada a servidores externos, exceto as chamadas necessárias à API do LLM escolhido.

---

## 📝 Changelog

### v1.0.1 (2026-07-28)
- Servidor agora acessível via rede local (`host="0.0.0.0"`)

### v1.0.0 (2025-07-27)
- MVP completo com interface web dark premium
- Suporte a Gemini, OpenAI e Ollama
- Geração de assets para 10 plataformas
- Modos pré e pós-produção
- Múltiplos canais com perfis independentes
- Histórico local em SQLite
- Painel de ideias e tendências
