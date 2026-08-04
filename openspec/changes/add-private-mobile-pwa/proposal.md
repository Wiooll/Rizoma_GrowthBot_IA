## Why

O Rizoma hoje depende de um servidor FastAPI e de um banco SQLite no computador, o que impede o uso contínuo e privado no iPhone quando o computador está desligado. A aplicação precisa de uma variante móvel instalável, gratuita e protegida, mantendo os dados pessoais apenas no aparelho e preservando o conteúdo já existente.

## What Changes

- Adiciona uma PWA instalável e responsiva, compatível com Chrome no iOS 26 e com uso pela tela inicial.
- Publica a aplicação em hospedagem gratuita com acesso restrito exclusivamente ao proprietário autenticado.
- Mantém canais, ideias, histórico, preferências e metadados no armazenamento local persistente do navegador no iPhone.
- Adiciona exportação e importação de backup em JSON, com validação de versão e conteúdo.
- Adiciona uma migração segura dos registros existentes no SQLite para um arquivo de importação local que não será publicado nem versionado.
- Encaminha chamadas ao Gemini, OpenAI e YouTube por rotas protegidas, mantendo chaves fora do código e do armazenamento do navegador.
- Mantém o runtime FastAPI/SQLite atual para uso local no computador.
- **BREAKING**: na variante hospedada, o provedor Ollama não estará disponível porque depende de um serviço local inacessível pela hospedagem.

## Capabilities

### New Capabilities

- `mobile-pwa`: instalação, comportamento responsivo, cache do shell e solicitação de armazenamento persistente no iPhone.
- `private-hosting`: acesso autenticado exclusivo ao proprietário e proxy protegido para serviços externos.
- `data-portability`: exportação, importação, validação e migração dos dados locais.

### Modified Capabilities

- `local-persistence`: adiciona persistência por dispositivo via IndexedDB na variante hospedada, preservando SQLite no runtime local.
- `content-generation`: restringe a variante hospedada a Gemini e OpenAI e mantém suas chaves somente no ambiente protegido do servidor.
- `youtube-channel-metrics`: passa a obter métricas pela rota protegida da variante hospedada, sem expor a chave no navegador.

## Impact

- Frontend existente: inicialização, acesso a dados, configurações, tratamento de instalação e experiência móvel.
- Backend hospedado: rotas de geração e métricas, autenticação por cabeçalhos confiáveis e segredos de ambiente.
- Backend local: nova exportação de migração, sem remover o fluxo FastAPI/SQLite atual.
- Build e publicação: manifesto PWA, service worker, saída compatível com a hospedagem e configuração privada.
- Qualidade: testes de persistência, importação, autenticação, build, ortografia e documentação; atualização da versão visível e do README.
