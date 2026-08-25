## Why

Criadores de conteúdo perdem muito tempo assistindo a vídeos longos inteiros para encontrar bons recortes para Shorts, Reels ou TikTok. A inteligência artificial pode analisar a transcrição de vídeos grandes (já que os modelos de contexto longo permitem isso sem problemas) e extrair cirurgicamente os melhores trechos focados em retenção, incluindo as dicas de edição e de postagem. Fazer isso puramente com texto garante custo zero na extração do YouTube e muita agilidade.

## What Changes

- Adição de um novo motor no backend para extrair transcrições (legendas) de vídeos do YouTube através de suas URLs.
- Adição de um prompt na camada do LLM para identificar trechos de 30-60 segundos e formatá-los.
- Criação de uma nova rota na API REST (`/api/extract-shorts`) para unificar as chamadas.
- Criação de uma nova ferramenta (tela) no frontend (PWA e Desktop) intitulada "Garimpo de Cortes" ou "Extrair Cortes".

## Capabilities

### New Capabilities
- `youtube-transcript-extractor`: Extrai legendas e metadados de tempo (timestamps) de um vídeo do YouTube sem depender de cotas da API do YouTube V3.
- `ai-shorts-curation`: Usa o modelo de LLM configurado (Gemini/OpenAI) para extrair os 3 melhores cortes virais da transcrição.

### Modified Capabilities
N/A

## Impact

- **Backend**: Inclusão de um novo pacote (`youtube-transcript-api`) e criação de novos métodos em `youtube.py` e `llm.py`, além de nova rota em `main.py`.
- **Frontend**: A sidebar da UI receberá uma nova aba, demandando novas views em `index.html` e lógica de requisições em `app.js`.
- **Armazenamento**: Inicialmente não requer mudanças no schema do banco de dados (SQLite/IndexedDB), pois os recortes serão transientes e gerados on-demand.
