## 1. Backend Core

- [x] 1.1 Adicionar `youtube-transcript-api` ao arquivo `requirements.txt`.
- [x] 1.2 Criar função em `backend/youtube.py` para extrair e formatar as transcrições com timestamps.
- [x] 1.3 Atualizar `backend/llm.py` com o novo prompt `generate_shorts_curation` que suporta a formatação da transcrição e retorna o schema JSON dos cortes.

## 2. API Endpoint

- [x] 2.1 Adicionar o modelo de request e response Pydantic no `backend/main.py`.
- [x] 2.2 Criar a rota `POST /api/extract-shorts` que orquestra a chamada para o YouTube, formatação e chamada ao LLM, retornando o JSON.

## 3. Frontend UI

- [x] 3.1 Adicionar a aba "Garimpo de Cortes" em `frontend/index.html` (sidebar menu).
- [x] 3.2 Criar a estrutura HTML base (div, inputs, loading spinner) em `frontend/index.html`.
- [x] 3.3 Adicionar as funções de navegação e exibição em `frontend/js/app.js`.

## 4. Frontend Integration

- [x] 4.1 Implementar a função JS que faz o fetch para `/api/extract-shorts` com a URL colada pelo usuário.
- [x] 4.2 Renderizar os Cards contendo Minutagem, Gancho, Legenda e Dica de Edição.
- [x] 4.3 Testar tratamento de erro na UI (caso a URL não tenha transcrição ou o LLM falhe).
