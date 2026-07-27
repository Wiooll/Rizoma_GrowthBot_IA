## Context

O Rizoma é idealizado para ser uma ferramenta de automação pessoal voltada para o crescimento orgânico, servindo como "GrowthBot". O projeto necessitava ser portável, leve e não requerer complexa infraestrutura em nuvem (uso pessoal/local). Portanto, a escolha de tecnologias deve facilitar a execução em um terminal por um usuário técnico.

## Goals / Non-Goals

**Goals:**
- Prover um SPA (Single Page Application) moderno, com interface agradável e "premium" (Vanilla HTML/CSS/JS, sem build steps complexos na fase 1).
- Prover um servidor local capaz de servir os estáticos e expor a API de LLM.
- Persistir dados sem exigir instalação de banco de dados rodando como serviço (SQLite).
- Suportar diferentes provedores de IA (Gemini como base, mas com espaço para OpenAI/Ollama).

**Non-Goals:**
- Autenticação de usuários (uso puramente local e pessoal).
- Escalabilidade massiva ou concorrência pesada.

## Decisions

1. **FastAPI como servidor:** Rápido, assíncrono e facilita a criação de rotas REST JSON. Possui tipagem forte via Pydantic para validar os payloads das requisições.
2. **SQLite + sqlite3 standard:** Para eliminar dependências pesadas, usamos a biblioteca nativa, com `database.py` operando leitura/escrita no DB.
3. **google-genai:** Migrado para a última versão oficial (`google-genai` usando `Client()`), utilizando o modelo `gemini-3.5-flash` para garantir compatibilidade com as APIs modernas.
4. **Vanilla Frontend:** JS puro com `fetch` e CSS grid/flexbox. Isso elimina a necessidade de `npm`, `webpack` ou `vite` para que o projeto inicie apenas com `python rizoma.py`.

## Risks / Trade-offs

- **Uso do SQLite de forma assíncrona:** O `sqlite3` bloqueia, então acessos pesados podem travar o event loop do FastAPI. *Mitigação*: Para o volume (1 usuário local), a performance é invisível e o bloqueio é aceitável. 
- **Chaves expostas no config.yaml:** *Mitigação*: Como o sistema roda local, o config.yaml é excluído do GIT para não vazar a chave do usuário no GitHub.
