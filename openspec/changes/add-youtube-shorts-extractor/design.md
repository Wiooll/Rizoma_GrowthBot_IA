## Context

O Rizoma atualmente gera roteiros e ideias usando modelos de linguagem (Gemini, OpenAI, Ollama). A nova funcionalidade precisa aceitar um link do YouTube, ler sua transcrição de fala sem usar a cota limitada da API V3 do YouTube e processar essas transcrições via LLM para extrair trechos altamente virais para plataformas de vídeos curtos.

## Goals / Non-Goals

**Goals:**
- Prover um endpoint assíncrono `/api/extract-shorts` no backend FastAPI.
- Utilizar `youtube-transcript-api` para burlar a limitação da API v3 do YouTube em relação à transcrições automáticas.
- Processar o texto com os limites normais de tokens (delegando para os LLMs).
- Exibir os trechos na interface de maneira elegante e clara.

**Non-Goals:**
- Não processaremos os vídeos (download de mp4 e recorte por FFmpeg).
- Não salvaremos o histórico detalhado dos cortes de YouTube no SQLite/IndexedDB por padrão.
- Não faremos tradução de legendas (apenas extração no idioma original detectado).

## Decisions

1. **Uso de `youtube-transcript-api`**:
   - *Alternativa*: API Oficial do YouTube v3.
   - *Motivo*: A API V3 oficial exige tokens OAuth pesados para legendas automáticas, e às vezes falha em pegar as "auto-generated". O pacote de scraping oficial do Python contorna isso elegantemente e a custo zero de cota.

2. **Formato do Prompt ao LLM**:
   - *Decisão*: O texto enviado ao LLM terá a marcação de tempo a cada linha ou bloco (ex: `[00:15] texto...`).
   - *Motivo*: Sem o timestamp embutido no texto, o LLM tenderá a inventar (alucinar) em que momento o texto foi dito.

3. **Retorno em JSON (Structured Output)**:
   - *Decisão*: O prompt vai forçar a estrutura de retorno via JSON Schema (já suportado pelo Pydantic/FastAPI).
   - *Motivo*: O frontend precisará renderizar componentes de interface isolados (Card, Tempo, Legenda). Parsear texto solto causará falhas frequentes de UI.

## Risks / Trade-offs

- **[Risk] Excesso de Tokens (Vídeos de 3h+)** → *Mitigation*: O sistema enviará até os primeiros 30.000 caracteres como margem de segurança caso o LLM comece a falhar, mas deixará livre para o Gemini lidar com contextos de até 2 milhões de tokens.
- **[Risk] Vídeo Sem Legenda** → *Mitigation*: O backend deve retornar um status 400 amigável e o frontend exibir um erro: "Este vídeo não possui legendas."
