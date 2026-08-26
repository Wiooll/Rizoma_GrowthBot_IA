## 1. Build hospedado e PWA

- [x] 1.1 Adicionar build reproduzível compatível com Cloudflare Workers e manter o runtime FastAPI existente
- [x] 1.2 Adicionar manifesto, ícones, service worker e metadados de instalação para iOS
- [x] 1.3 Ajustar responsividade, áreas seguras e navegação móvel preservando o design atual

## 2. Persistência e portabilidade

- [x] 2.1 Implementar adaptador IndexedDB para canais, conteúdos, ideias e preferências
- [x] 2.2 Integrar o adaptador local aos fluxos existentes e manter compatibilidade com a API FastAPI
- [x] 2.3 Implementar exportação e importação JSON atômicas com validação de esquema e limites
- [x] 2.4 Implementar exportador SQLite local sem segredos e gerar o backup de migração ignorado pelo Git
- [x] 2.5 Adicionar interface de backup, importação e estado da persistência na tela de configurações

## 3. Proxy seguro

- [x] 3.1 Implementar autenticação obrigatória e validação compartilhada das rotas hospedadas
- [x] 3.2 Implementar geração sem estado via Gemini e OpenAI com segredos do servidor, timeout e erros controlados
- [x] 3.3 Implementar métricas do YouTube com chave do servidor e cache temporário
- [x] 3.4 Adaptar configurações móveis para selecionar provedor/modelo sem armazenar ou exibir chaves

## 4. Qualidade e documentação

- [x] 4.1 Adicionar testes automatizados para IndexedDB, backup, migração, autenticação e contratos do proxy
- [x] 4.2 Adicionar verificação ortográfica pt-BR e corrigir textos visíveis afetados
- [x] 4.3 Atualizar versão do backend, versão visível e changelog para v1.1.0
- [x] 4.4 Atualizar README com instalação no iPhone, privacidade, backup, migração, segredos e limitações
- [x] 4.5 Executar testes, validação OpenSpec, build de produção e inspeção objetiva do pacote

## 5. Publicação e migração

- [x] 5.1 Criar ou reutilizar o site, configurar acesso privado e registrar apenas metadados permitidos
- [x] 5.2 Configurar Gemini, OpenAI e YouTube como segredos sem exibir seus valores
- [x] 5.3 Salvar e publicar a versão validada, confirmar o endereço e abrir a implantação
- [x] 5.4 Orientar instalação no iPhone e importação do backup, deixando a conferência final de contagens pronta
