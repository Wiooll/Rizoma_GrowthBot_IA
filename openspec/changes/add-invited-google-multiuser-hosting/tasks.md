## 1. Preparação e infraestrutura reproduzível

- [x] 1.1 Revisar e preservar integralmente as alterações concluídas de `add-youtube-shorts-extractor`, registrando o baseline de testes, build, ortografia e estado do checkout antes de editar arquivos compartilhados
- [x] 1.2 Adicionar a configuração reproduzível do Cloudflare Worker com assets estáticos, ambientes separados e bindings nomeados para D1 e R2, sem versionar IDs privados ou segredos
- [x] 1.3 Criar migrações D1 versionadas para usuários, canais, conteúdos, ideias, preferências e credenciais, com UUIDs, chaves estrangeiras, versões e índices iniciados por `user_id`
- [ ] 1.4 Documentar e configurar no painel Cloudflare o Worker gratuito, Google IdP, Access associado diretamente ao Worker e política `Allow` contendo somente os dois e-mails fornecidos fora do repositório
- [ ] 1.5 Cadastrar audiência e domínio do Access, chave mestra de credenciais e chave separada de backup como segredos por ambiente, confirmando que nenhum valor aparece no Git, build, logs ou respostas

## 2. Identidade, autorização e perímetro seguro

- [x] 2.1 Implementar validação reutilizável do JWT do Cloudflare Access, incluindo assinatura por JWKS, emissor, audiência, expiração, `sub` e e-mail normalizado
- [x] 2.2 Substituir a autenticação específica da hospedagem anterior por um contexto de usuário confiável e rejeitar cabeçalhos de identidade sem assertion válida
- [x] 2.3 Centralizar validações de método, origem, tipo, tamanho, esquema e valores permitidos para todas as rotas hospedadas mutáveis
- [x] 2.4 Aplicar cabeçalhos de segurança, CSP mínima, `Cache-Control: no-store` para respostas privadas e logs sanitizados com identificador de requisição e usuário pseudonimizado
- [x] 2.5 Adicionar limites controlados por usuário e rota para chamadas externas e mutações sensíveis, preservando mensagens de erro úteis em pt-BR

## 3. Persistência D1 multiusuário

- [x] 3.1 Implementar a camada de acesso D1 que sempre recebe o usuário autenticado e limita leituras, escritas, relacionamentos, exclusões e agregações por `user_id`
- [x] 3.2 Implementar inicialização idempotente do perfil no primeiro login autorizado sem aceitar propriedade enviada pelo cliente
- [x] 3.3 Implementar rotas D1 de canais preservando contratos visuais e funcionais, cascade por usuário e conflito otimista por `version`
- [x] 3.4 Implementar rotas D1 de conteúdos e histórico com propriedade do canal validada antes de gerar ou consultar dados
- [x] 3.5 Implementar rotas D1 de ideias e preferências não secretas com validação, paginação limitada e isolamento por conta
- [x] 3.6 Tratar conflitos entre dispositivos com resposta controlada e recarga do registro atual, sem sobrescrita silenciosa

## 4. Credenciais pessoais e proxies externos

- [x] 4.1 Implementar derivação HKDF por usuário e provedor, criptografia AES-GCM com IV único, AAD versionada e suporte a rotação da chave mestra
- [x] 4.2 Implementar endpoints para consultar somente o estado, cadastrar, substituir e excluir as credenciais pessoais Gemini, OpenAI e YouTube
- [x] 4.3 Garantir que endpoints, exceções, telemetria, logs e testes nunca retornem texto puro, ciphertext, IV, token ou fragmento recuperável das chaves
- [x] 4.4 Adaptar o proxy Gemini e OpenAI para descriptografar somente a credencial do usuário autenticado durante a chamada, aplicar timeout e salvar o resultado no D1
- [x] 4.5 Adaptar o proxy YouTube para validar propriedade do canal, usar somente a chave pessoal correspondente e separar o cache por usuário e identidade canônica do canal
- [x] 4.6 Preservar Gemini, OpenAI e Ollama no runtime FastAPI local e manter Ollama explicitamente indisponível na variante hospedada

## 5. PWA online e sincronização entre dispositivos

- [x] 5.1 Substituir o adaptador hospedado baseado em IndexedDB por chamadas às rotas D1 protegidas, mantendo o adaptador FastAPI local separado
- [x] 5.2 Atualizar os fluxos de canais, histórico, ideias, preferências e geração para recarregar dados confirmados pelo servidor e tratar conflitos ou sessão expirada
- [x] 5.3 Atualizar a tela de configurações para chaves pessoais mascaradas, substituição, exclusão, backup, exclusão de conta e indicação de sincronização
- [x] 5.4 Limitar o service worker a assets versionados do shell, impedir cache de `/api`, tokens e dados pessoais e remover o IndexedDB como fonte de domínio
- [x] 5.5 Implementar estado offline visível que permita abrir somente o shell e bloqueie consulta, salvamento e geração com mensagens claras em pt-BR
- [ ] 5.6 Validar instalação, login, renovação de sessão, sincronização e limpeza da PWA em celular e computador preservando o design atual

## 6. Backup, migração e ciclo da conta

- [ ] 6.1 Implementar backup diário por usuário em R2 privado, com documento versionado, criptografia separada, contagens e exclusão explícita de credenciais externas
- [ ] 6.2 Implementar retenção automática que remova backups R2 com mais de 30 dias sem alterar dados atuais do D1
- [x] 6.3 Adaptar exportação e importação manual para o dataset D1 do usuário autenticado, com limites, validação completa e substituição transacional sem chaves
- [ ] 6.4 Implementar migração autenticada dos backups legados, mapeando IDs numéricos para UUIDs e bloqueando duplicação ou propriedade importada
- [ ] 6.5 Documentar e ensaiar a recuperação D1 dentro da janela gratuita, incluindo confirmação destrutiva, verificação de contagens e caminho de reversão
- [x] 6.6 Implementar exclusão confirmada da conta com remoção isolada dos dados ativos, preferências, credenciais e objetos R2 do usuário
- [x] 6.7 Limpar cache, service worker, IndexedDB legado, estado visual e sessão após exclusão e explicar a revogação manual do e-mail no Cloudflare Access

## 7. Testes e verificações de segurança

- [ ] 7.1 Adicionar testes do JWT Access para token válido, assinatura inválida, audiência incorreta, expiração, claims ausentes e cabeçalhos forjados
- [ ] 7.2 Adicionar testes D1 cobrindo CRUD, relacionamentos, cascade, paginação, concorrência otimista e isolamento negativo em todas as rotas
- [ ] 7.3 Adicionar testes criptográficos para round-trip, IV único, AAD incorreta, separação entre usuários/provedores, rotação e ausência de vazamentos
- [ ] 7.4 Adicionar testes dos proxies pessoais para chave ausente, usuário incorreto, timeout, limite, resposta inválida e sanitização de erros
- [ ] 7.5 Adicionar testes de backup, retenção, exportação, importação atômica, migração legada, exclusão de conta e preservação da outra conta
- [ ] 7.6 Adicionar testes do service worker e da interface para cache somente do shell, sessão expirada, modo offline e limpeza local
- [ ] 7.7 Executar testes Node e Python, spellcheck, build de produção, inspeção de segredos, verificação UTF-8 e testes de regressão do runtime local e do extrator de Shorts

## 8. Versão, documentação, publicação e aceite

- [x] 8.1 Atualizar versão do pacote, backend, cache, manifesto, versão visível e changelog para `v1.2.0` de forma consistente
- [x] 8.2 Atualizar README com arquitetura Cloudflare, pré-requisitos, login Google, convites, D1, R2, chaves pessoais, operação online, backup, recuperação, migração, exclusão e comandos de desenvolvimento
- [x] 8.3 Atualizar o bloqueio ortográfico pt-BR para cobrir os novos textos e corrigir qualquer mojibake ou erro visível encontrado
- [ ] 8.4 Validar a configuração Cloudflare localmente e publicar primeiro em ambiente de teste protegido, sem desativar a hospedagem anterior
- [ ] 8.5 Autenticar as duas contas convidadas e confirmar URL, HTTP, bloqueio anônimo, isolamento cruzado, chaves independentes e sincronização celular-computador
- [ ] 8.6 Executar backup e restauração controlados, importar os dados existentes na conta correta e conferir contagens sem exibir conteúdo ou segredos nos logs
- [ ] 8.7 Executar `openspec validate add-invited-google-multiuser-hosting --strict`, revisar o diff final e registrar evidências objetivas de todos os critérios antes de considerar a mudança concluída
