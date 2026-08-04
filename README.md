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

## 📱 Versão móvel privada

A versão **v1.1.0** pode ser instalada como PWA no iPhone e usada com o computador desligado. A interface permanece hospedada, mas canais, ideias, histórico e preferências ficam somente no armazenamento local do aparelho.

### Instalar no iPhone

1. Abra o endereço privado publicado usando o Chrome no iPhone.
2. Entre com a conta autorizada do proprietário.
3. No menu de compartilhamento, escolha **Adicionar à Tela de Início**.
4. Abra o ícone **Rizoma** criado na tela inicial.
5. Acesse **Configurações → Dados neste iPhone** e importe o backup da migração.

### Migrar os dados atuais

No computador, gere um arquivo sem chaves de API:

```bash
python scripts/export_mobile_backup.py
```

O arquivo será criado em `data/rizoma-mobile-backup.json` e permanecerá ignorado pelo Git. Transfira-o ao aplicativo Arquivos do iPhone por um meio de sua confiança e selecione **Importar backup**. A importação valida o conteúdo antes de substituir o banco local.

### Build e validação móvel

```bash
npm install
npm test
npm run spellcheck
npm run build
```

As chaves `GEMINI_API_KEY`, `OPENAI_API_KEY` e `YOUTUBE_API_KEY` devem ser cadastradas somente como segredos da hospedagem. A versão móvel não salva essas chaves no navegador. O Ollama continua disponível apenas no modo local do computador.

> Exporte backups regularmente. O iOS pode apagar os dados se o aplicativo for removido, se os dados do site forem limpos ou em situações de pressão de armazenamento.

---

## ⚙️ Configurando a IA

O Rizoma suporta 3 provedores de IA. Acesse **⚙️ Configurações** no app:

| Provedor | Custo | Como configurar |
|---|---|---|
| **Google Gemini** ⭐ | Gratuito | Crie uma chave em [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| **OpenAI GPT** | Pago | Crie uma chave em [platform.openai.com](https://platform.openai.com/api-keys) |
| **Ollama** | Gratuito (local) | Instale em [ollama.ai](https://ollama.ai) e rode `ollama run llama3` |

> Sem configurar uma API key, o app roda em **modo demo** — você vê a interface funcionando mas sem geração real.

Para métricas de canais, configure também a chave da **YouTube Data API v3** em **⚙️ Configurações** e informe a URL do canal no cadastro.

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
│   ├── llm.py             # Adaptador LLM + builder de prompts
│   └── youtube.py         # Integração com YouTube Data API v3
│
├── frontend/
│   ├── index.html         # SPA principal
│   ├── css/style.css      # Design system (dark + verde)
│   └── js/                # Interface, IndexedDB e PWA
│
├── hosted/                # Proxy protegido compatível com Workers
├── public/                # Manifesto, service worker, ícones e social card
├── scripts/               # Build, migração e bloqueio ortográfico
├── tests/                 # Testes do banco móvel, proxy e exportação
├── package.json           # Build e validações da versão móvel
│
└── data/
    └── rizoma.db          # Banco SQLite (criado automaticamente)
```

---

## 🌿 Funcionalidades — v1.1.0

### ⚡ Geração de Conteúdo
- **Pós-produção**: insira o tema de um vídeo já gravado → receba todos os assets prontos
- **Pré-produção**: insira uma ideia → receba roteiro completo, análise e sugestões
- Assets gerados: YouTube (título, descrição, tags, hashtags, CTA, comentário fixado), Instagram, X/Thread, LinkedIn, Facebook, TikTok, Short/Reel, Telegram, Thumbnail prompt, Blog

### 📺 Múltiplos Canais
- Crie perfis separados por nicho (Games, Tech, Reflexões...)
- Cada canal tem tom de voz, público-alvo e plataformas independentes
- A tela **Gestão de Canais** acompanha inscritos, views e vídeos via YouTube Data API v3
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

No computador, os dados ficam em `data/rizoma.db`. Na PWA, canais, ideias, histórico e preferências ficam no IndexedDB do iPhone. O tema e o perfil do canal são enviados apenas durante a geração para o proxy protegido e para a API selecionada; o proxy não persiste esses dados. Chaves de API permanecem no ambiente protegido da hospedagem.

---

## 📝 Changelog

### v1.1.0 (2026-08-04)
- Adiciona PWA privada instalável no iPhone, mantendo o visual original.
- Adiciona persistência local por IndexedDB, solicitação de armazenamento persistente e navegação móvel.
- Adiciona backup JSON validado e migração completa do SQLite sem incluir chaves de API.
- Adiciona proxy autenticado e sem estado para Gemini, OpenAI e métricas do YouTube.
- Adiciona build compatível com hospedagem, testes automatizados e bloqueio contra erros ortográficos e corrupção UTF-8.

### v1.0.5 (2026-07-31)
- Implementa mecanismo de retry com backoff exponencial para lidar com picos de tráfego e erros 503 da API do Google Gemini.
- Otimiza as requisições ao Gemini, passando a utilizar as chamadas assíncronas nativas do novo SDK (`client.aio.models`).

### v1.0.4 (2026-07-31)
- Corrige erro de requisição ao atualizar a dependência do SDK do Google Gemini para o novo `google-genai` e refletir em requirements.txt.

### v1.0.3 (2026-07-30)
- Adiciona Dockerfile para empacotar a aplicação com Python 3.11
- Adiciona docker-compose.yml para subir o projeto com persistência de dados e configuração
- Evita abrir navegador automaticamente quando o app roda dentro de container

### v1.0.2 (2026-07-29)
- Adiciona tela **Gestão de Canais** mantendo o visual original do projeto
- Adiciona integração com YouTube Data API v3 para métricas de canais
- Permite salvar URL do canal e chave da API do YouTube nas configurações

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
