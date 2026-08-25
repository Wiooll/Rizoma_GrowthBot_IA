## ADDED Requirements

### Requirement: Curation via LLM
O backend DEVE possuir uma rota/fluxo que receba a transcrição formatada e envie ao LLM selecionado (Gemini/OpenAI) pedindo a extração de cortes para Shorts.

#### Scenario: Geração de 3 cortes
- **WHEN** a transcrição válida e longa é enviada para a função de IA com o prompt correto
- **THEN** a IA deve retornar um JSON estruturado contendo exatamente os 3 cortes mais relevantes.

### Requirement: JSON Schema Structure
A IA DEVE retornar as informações estruturadas contendo o tempo, o gancho, a legenda do post e dicas de edição.

#### Scenario: Formato validado da IA
- **WHEN** o LLM responde à requisição de cortes
- **THEN** a resposta deve ser perfeitamente passível de parse em JSON (sem ser um markdown bloqueado por code fences, ou deve ser higienizada no backend) para evitar que o frontend quebre.

### Requirement: Frontend Display
A PWA/Interface Web DEVE apresentar um campo para input da URL do vídeo e renderizar a lista de cards com as informações extraídas.

#### Scenario: Exibição visual após sucesso
- **WHEN** a API `/api/extract-shorts` responde com o JSON dos cortes
- **THEN** a tela deve parar de mostrar estado de carregamento e exibir em cascata os blocos de corte de forma visual (tempo, gancho, legenda).
