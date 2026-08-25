## Why

A variante hospedada do Rizoma foi criada para um único proprietário e mantém os dados em cada aparelho, o que impede duas pessoas convidadas de sincronizarem e recuperarem seus próprios dados entre celular e computador. A aplicação precisa sair da hospedagem do ChatGPT e operar gratuitamente como uma PWA multiusuário restrita, com login Google, isolamento por conta, chaves pessoais protegidas e backups recuperáveis.

## What Changes

- Hospeda a PWA e o proxy de APIs em Cloudflare Workers, usando endereço gratuito sem exigir domínio próprio.
- Restringe o acesso a dois e-mails convidados e aprovados manualmente por meio do Cloudflare Access com login Google.
- Identifica cada usuário somente a partir da identidade autenticada e mantém canais, conteúdos, ideias e preferências isolados por conta.
- Substitui o IndexedDB como fonte principal da variante hospedada pelo Cloudflare D1, permitindo sincronização entre celular e computador; o navegador mantém apenas cache visual sem operações de domínio offline.
- Permite que cada usuário cadastre suas próprias chaves Gemini, OpenAI e YouTube, armazenadas criptografadas e nunca devolvidas em texto aberto ao cliente.
- Adiciona backup diário criptografado com retenção de 30 dias, recuperação de curto prazo do banco e exportação/importação manual por usuário.
- Adiciona exclusão da conta e de seus dados, chaves, backups e cache local, deixando a revogação do convite sob controle manual do proprietário no Cloudflare Access.
- Preserva o runtime FastAPI/SQLite local, o visual atual, a instalação como PWA e a indisponibilidade do Ollama na variante hospedada.
- Atualiza README, versão do backend, versão visível e changelog para `v1.2.0`, com validações automatizadas e bloqueio ortográfico pt-BR.
- **BREAKING**: na variante hospedada, salvar, consultar e gerar conteúdo passa a exigir conexão com a internet; o IndexedDB deixa de ser a fonte principal dos dados.

## Capabilities

### New Capabilities

- `invited-google-auth`: autenticação Google mediada pelo Cloudflare Access, lista fechada de convidados, identidade confiável e sessão da PWA.
- `multiuser-cloud-data`: persistência sincronizada no D1, isolamento obrigatório por usuário e migração autenticada dos dados existentes.
- `user-api-credentials`: cadastro, criptografia, uso transitório, substituição e exclusão das chaves pessoais de provedores externos.
- `cloud-backup-recovery`: backup diário criptografado, retenção de 30 dias, recuperação do D1 e portabilidade por usuário.
- `account-lifecycle`: exclusão confirmada da conta e dos dados associados, limpeza do dispositivo e revogação manual do convite.

### Modified Capabilities

- `local-persistence`: mantém SQLite no runtime local, mas torna o D1 a fonte principal da variante hospedada e limita o armazenamento do navegador ao cache visual.
- `channel-management`: vincula cada canal ao usuário autenticado e sincroniza suas alterações entre dispositivos sem permitir acesso cruzado.
- `content-generation`: usa a chave pessoal criptografada do usuário autenticado na variante hospedada e exige conexão com a internet.
- `youtube-channel-metrics`: consulta métricas com a chave pessoal do YouTube do usuário autenticado, preservando erros controlados e cache seguro.

## Impact

- Frontend e PWA: fluxo de login, estado online, sincronização, configurações de chaves, backup, exclusão de conta, limpeza de cache e mensagens pt-BR.
- Worker hospedado: validação da identidade do Cloudflare Access, autorização por usuário, criptografia de credenciais, proxy externo e rotas de dados.
- Dados: novo esquema D1 com propriedade por usuário, migração dos backups existentes e armazenamento de backups criptografados no R2.
- Cloudflare: configuração de Worker, Access, D1, R2, segredo mestre de criptografia, tarefas agendadas e lista de e-mails autorizados.
- Runtime local: FastAPI, SQLite e `config.yaml` permanecem disponíveis e separados da variante hospedada.
- Qualidade e operação: testes de autenticação, isolamento, criptografia, migração, backup, exclusão, build, ortografia, documentação e atualização de versão.
