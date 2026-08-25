## Context

O Rizoma mantém um runtime desktop em FastAPI/SQLite e uma variante PWA hospedada, criada para um único proprietário. Na variante hospedada atual, o Worker aceita um cabeçalho de identidade específico da plataforma anterior, usa segredos globais para provedores externos e delega canais, conteúdos, ideias e preferências ao IndexedDB de cada aparelho. Esse modelo não oferece identidade portável, sincronização, recuperação central ou isolamento explícito entre usuários.

A mudança atende duas pessoas convidadas, cada uma com dados e chaves próprios, acesso por Google, uso em celular e computador e instalação como PWA. O orçamento de infraestrutura deve permanecer dentro das cotas gratuitas, não há domínio próprio, cobrança, cadastro público ou painel administrativo. O runtime FastAPI/SQLite e as alterações existentes do extrator de Shorts devem ser preservados.

## Goals / Non-Goals

**Goals:**

- Hospedar os assets e a API em um Cloudflare Worker protegido pelo Cloudflare Access.
- Autorizar somente os dois e-mails configurados manualmente e obter uma identidade confiável para todas as operações.
- Sincronizar dados entre dispositivos no D1 e impedir qualquer leitura ou mutação cruzada entre usuários.
- Armazenar chaves pessoais criptografadas, utilizá-las somente em memória durante chamadas externas e nunca devolvê-las ao cliente.
- Manter backup diário criptografado por 30 dias, recuperação de curto prazo e exportação/importação manual sem segredos.
- Permitir exclusão confirmada da conta, dos dados, das credenciais, dos backups e do estado local.
- Preservar o visual, a PWA, o runtime local, a compatibilidade dos fluxos atuais e a ortografia pt-BR.

**Non-Goals:**

- Cadastro público, senha própria, cobrança, planos, painel administrativo ou colaboração entre contas.
- Compartilhamento de canais, conteúdos, ideias ou chaves entre os dois usuários.
- Operações de domínio offline ou resolução de conflitos offline.
- Ollama na variante hospedada.
- Domínio próprio, aplicativo nativo ou publicação em loja.
- Armazenar chaves pessoais em backups exportáveis ou no R2.

## Decisions

### Cloudflare como perímetro e runtime único da variante hospedada

Os assets estáticos, as rotas de dados e o proxy externo serão publicados em um Cloudflare Worker acessível pelo endereço gratuito do Worker. O Cloudflare Access será associado diretamente ao Worker, com Google como provedor de identidade e política `Allow` limitada aos dois e-mails convidados. Isso evita combinar provedores de hospedagem e autenticação e reutiliza o Worker já existente.

Alternativas consideradas: Supabase simplificaria autenticação pública e RLS, mas adicionaria um segundo provedor e pausas do projeto gratuito sem benefício para dois convidados; Firebase exigiria mais reescrita e não substituiria o proxy seguro; hospedar o container FastAPI manteria SQLite inadequado para sincronização e persistência gratuita confiável.

### Identidade validada e autorização independente de dados enviados pelo cliente

O Worker validará assinatura, emissor, audiência e expiração do `Cf-Access-Jwt-Assertion` usando as chaves públicas do time Cloudflare. O identificador estável `sub` será a chave primária do usuário e o e-mail normalizado será apenas atributo de exibição e auditoria mínima. Nenhuma rota aceitará `user_id` no corpo ou na URL para decidir propriedade.

Vincular o Access diretamente ao Worker constitui o perímetro principal; a validação do JWT no Worker oferece defesa em profundidade e evita confiar apenas na presença de cabeçalhos forjáveis. Rotas mutáveis também validarão método, `Content-Type`, `Origin`, tamanho e esquema do corpo.

### D1 como fonte principal com propriedade obrigatória

O D1 armazenará `users`, `channels`, `contents`, `ideas`, `preferences` e `api_credentials`. Registros de domínio usarão identificadores UUID gerados no servidor, `user_id NOT NULL`, chaves estrangeiras e índices compostos iniciados por `user_id`. Toda consulta, inclusive leitura por ID, atualização, exclusão, cache e validação de relacionamento, filtrará primeiro pelo usuário autenticado.

O servidor será a única fonte de verdade da variante hospedada. O IndexedDB deixará de armazenar dados de domínio; o service worker manterá somente assets versionados e nunca armazenará respostas `/api`, tokens, configurações, conteúdo gerado ou chaves. Sem rede, a interface poderá abrir o shell e informará que consulta, salvamento e geração exigem conexão.

Alternativa considerada: sincronizar bidirecionalmente IndexedDB e D1 criaria conflitos, filas, reprocessamento e risco de perda desnecessários para o requisito online escolhido.

### Concorrência otimista e contratos compatíveis com a interface

Registros mutáveis terão `created_at`, `updated_at` e `version`. Atualizações enviarão a versão conhecida; o Worker atualizará somente quando ela coincidir e retornará conflito controlado caso outro dispositivo tenha salvo uma versão mais recente. A interface recarregará o registro antes de permitir nova tentativa, evitando sobrescrita silenciosa.

As rotas manterão os formatos consumidos pelo frontend sempre que possível. O adaptador hospedado deixará de simular a API sobre IndexedDB e chamará as rotas protegidas do Worker. O desktop continuará usando as rotas FastAPI e o banco local sem depender da Cloudflare.

### Criptografia de chaves pessoais com separação por usuário e provedor

Uma chave mestra aleatória ficará somente como segredo do Worker. Para cada credencial, o Worker derivará uma chave por usuário e provedor com HKDF, criptografará com AES-GCM e AAD contendo versão, usuário e provedor, e armazenará apenas `ciphertext`, `iv`, versão criptográfica e metadados não secretos. IVs serão aleatórios e nunca reutilizados com a mesma chave derivada.

O endpoint de configuração aceitará uma nova chave, mas responderá apenas estado configurado e metadados permitidos. Durante Gemini, OpenAI ou YouTube, o Worker descriptografará a chave em memória, fará a chamada com timeout e descartará a referência. Corpos, cabeçalhos, erros e logs serão sanitizados. A versão criptográfica permitirá rotação futura da chave mestra.

Alternativas consideradas: guardar chaves no navegador impediria sincronização segura; variáveis secretas do Worker não suportam valores dinâmicos por usuário; armazenar texto puro no D1 é inaceitável.

### Backups em camadas e sem credenciais externas

O D1 fornecerá recuperação de curto prazo da instância. Um gatilho diário produzirá, para cada usuário ativo, um documento versionado contendo dados de domínio e preferências não secretas, criptografará o documento com uma chave de backup separada e o salvará em bucket R2 privado. Um processo de retenção removerá objetos com mais de 30 dias.

O backup R2 e a exportação manual nunca incluirão chaves Gemini, OpenAI ou YouTube. A importação validará versão, tamanho, limites, tipos e relacionamentos e substituirá os dados daquele usuário em uma transação. A migração inicial reutilizará o formato atual, mapeará IDs numéricos para UUIDs e só será permitida para a conta autenticada, preferencialmente vazia.

Alternativa considerada: depender somente do plano gratuito de outro banco não entregaria backup automático recuperável; incluir credenciais ampliaria o impacto de comprometimento do backup.

### Exclusão de conta separada da revogação de convite

O usuário confirmará a exclusão com uma frase explícita. O Worker removerá transacionalmente registros de domínio, preferências e credenciais do D1 e, em seguida, apagará os objetos R2 associados. O cliente limpará caches, service worker, IndexedDB legado e estado local antes de encerrar a sessão.

O Cloudflare Access continua sendo o sistema de convite. A exclusão dos dados não remove automaticamente a política externa; se o e-mail permanecer permitido, um novo perfil vazio poderá ser criado no próximo login. O README explicará que a revogação definitiva exige remover manualmente o e-mail da política Access.

### Configuração, segredos e observabilidade mínima

Bindings D1/R2, audiência e domínio do Access, chave mestra de credenciais e chave de backup serão separados por ambiente. Valores reais nunca serão versionados. Logs registrarão identificadores de requisição, rota, status, duração e identificador pseudonimizado do usuário, sem e-mail completo, prompts, resultados, tokens ou chaves.

Cabeçalhos de segurança e CSP serão preservados e ajustados somente para origens necessárias. Respostas privadas usarão `Cache-Control: no-store`. Limites por usuário e por rota protegerão chamadas externas contra repetição acidental, mesmo sem cobrança nesta fase.

## Risks / Trade-offs

- [A sessão do Access pode expirar na PWA instalada] → detectar respostas de autenticação, interromper mutações e orientar novo login sem perder dados já confirmados no D1.
- [O plano gratuito pode atingir cotas ou mudar] → monitorar uso, controlar tamanho e frequência das consultas, indexar por `user_id` e documentar sinais de limite.
- [Uma falha de autorização pode expor dados entre contas] → centralizar a extração de identidade, exigir escopo por usuário em helpers de banco e cobrir todas as rotas com testes negativos de acesso cruzado.
- [Comprometimento da chave mestra expõe credenciais criptografadas] → separar segredos por ambiente, usar HKDF/AES-GCM, não registrar valores, suportar rotação e excluir credenciais dos backups.
- [Importação duplicada cria registros repetidos] → exigir confirmação, operar transacionalmente e restringir migração inicial a conta vazia ou substituição explícita.
- [Exclusão no D1 não elimina imediatamente o histórico de recuperação da plataforma] → informar a janela técnica de até sete dias e remover imediatamente dados ativos e backups R2 controlados pelo aplicativo.
- [O shell offline pode parecer funcional sem rede] → exibir estado offline persistente e bloquear ações de consulta, salvamento e geração com mensagem clara.
- [A mudança conflita com trabalho recente do extrator de Shorts] → partir do checkout atual, preservar rotas e contratos novos e revisar o diff por arquivo antes da validação.

## Migration Plan

1. Consolidar ou preservar integralmente a mudança concluída `add-youtube-shorts-extractor` antes de editar arquivos compartilhados.
2. Criar ambientes Cloudflare de desenvolvimento e produção, bindings D1/R2, segredos, Google IdP e política Access para os dois e-mails.
3. Criar e testar migrações D1 com índices, restrições de propriedade e dados de desenvolvimento não sensíveis.
4. Implementar validação de identidade e rotas multiusuário mantendo o runtime FastAPI intacto.
5. Implementar credenciais criptografadas, proxy pessoal, backup, importação e exclusão de conta.
6. Adaptar a PWA para servidor como fonte de verdade, cache somente do shell e mensagens online/offline.
7. Executar testes de isolamento, criptografia, backup, migração, exclusão, build, ortografia, segurança e compatibilidade desktop.
8. Publicar primeiro em endereço de teste protegido, autenticar as duas contas e confirmar que uma não acessa dados da outra.
9. Importar o backup existente na conta correta, conferir contagens e validar sincronização entre celular e computador.
10. Manter a hospedagem anterior e os backups originais disponíveis durante a janela de validação; desativá-los somente após aceite explícito.

Rollback: republicar a última versão hospedada validada, manter o banco D1 sem novas mutações, restaurar por recuperação de curto prazo se necessário e reutilizar os backups JSON originais. O runtime FastAPI/SQLite não será removido nem migrado automaticamente.

## Open Questions

Nenhuma decisão funcional bloqueante permanece. A implementação dependerá apenas dos dois e-mails fornecidos no momento da configuração externa, sem registrá-los nos artefatos ou no código.
