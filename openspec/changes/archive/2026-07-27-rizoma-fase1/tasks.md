## 1. Estrutura Base e Backend

- [x] 1.1 Configurar ambiente FastAPI (`rizoma.py` e `backend/main.py`).
- [x] 1.2 Implementar inicialização do banco SQLite (`backend/database.py`).
- [x] 1.3 Criar endpoints REST para manipulação de canais e ideias.

## 2. Interface (Frontend)

- [x] 2.1 Criar `index.html` com layout SPA Dark Theme.
- [x] 2.2 Estilizar componentes (Sidebar, Dashboard, Modais) no `style.css`.
- [x] 2.3 Implementar lógica de frontend (`app.js`) com chamadas `fetch` para a API FastAPI.

## 3. Integração LLM e Conteúdo

- [x] 3.1 Implementar `backend/llm.py` com suporte à nova API do `google-genai`.
- [x] 3.2 Suportar fallback para configuração e modo "demo".
- [x] 3.3 Desenvolver os prompts de geração para 10 plataformas (YouTube, Instagram, X, etc.).
- [x] 3.4 Conectar formulário do frontend ao endpoint `/api/gerar` do backend.
