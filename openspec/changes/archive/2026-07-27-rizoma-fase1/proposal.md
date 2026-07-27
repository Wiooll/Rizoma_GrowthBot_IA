## Why

A criação de conteúdo exige uma grande diversidade de formatos e rápida adaptação entre plataformas. O Rizoma resolve esse problema atuando como um "GrowthBot" pessoal, permitindo gerar instantaneamente ativos (posts, roteiros, threads) otimizados para múltiplas redes sociais a partir de uma única ideia central, economizando tempo e escalando o crescimento orgânico.

## What Changes

- Criação de uma aplicação Web SPA local consumida via FastAPI.
- Configuração de LLMs (Gemini, OpenAI, Ollama) para geração de texto.
- Implementação de persistência local baseada em SQLite para histórico de conteúdos e configuração de canais.
- Interface Dark Theme (HTML5/CSS3/Vanilla JS) contendo gerenciamento de canais, ideias, e outputs divididos por abas.

## Capabilities

### New Capabilities
- `content-generation`: Geração automatizada de roteiros, tweets, posts e metadados por meio de chamadas a APIs de LLMs, moldada pelas personas e nichos dos canais configurados.
- `channel-management`: Criação e armazenamento (SQLite) de perfis de canais, contendo nome, nicho, tom de voz, e público-alvo.
- `local-persistence`: Salvamento de ideias, histórico e configurações localmente utilizando SQLite.

### Modified Capabilities
- 

## Impact

- Novos endpoints FastAPI para servir a interface estática e manipular CRUD.
- Criação de esquema de banco de dados SQLite (`data/rizoma.db`).
- Configurações da API de LLM gerenciadas localmente no arquivo `config.yaml` e repassadas de forma segura.
