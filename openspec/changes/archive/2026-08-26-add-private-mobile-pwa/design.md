## Context

O runtime atual combina um frontend HTML/CSS/JavaScript, uma API FastAPI, configurações em `config.yaml` e dados em `data/rizoma.db`. O objetivo é manter esse runtime para desktop e adicionar uma distribuição hospedada que funcione como PWA no iPhone, tenha acesso privado e não armazene dados pessoais no servidor. As chamadas externas continuam necessitando de segredos, que não podem ser enviados ao navegador nem incluídos no pacote publicado.

## Goals / Non-Goals

**Goals:**

- Preservar a identidade visual e os fluxos existentes.
- Permitir instalação e uso pelo Chrome no iOS 26, inclusive com o computador desligado.
- Manter canais, ideias, histórico e preferências apenas no armazenamento do dispositivo.
- Preservar todos os dados existentes por exportação validada do SQLite e importação no iPhone.
- Proteger a aplicação e todas as rotas remotas com autenticação do proprietário.
- Manter Gemini, OpenAI e métricas do YouTube sem expor chaves ao cliente.
- Manter uma implantação sem custo de infraestrutura dentro das cotas gratuitas do serviço escolhido.

**Non-Goals:**

- Sincronizar dados entre dispositivos.
- Disponibilizar contas para outros usuários.
- Executar Ollama na variante hospedada.
- Substituir ou remover o runtime FastAPI/SQLite de desktop.
- Publicar na App Store.

## Decisions

### Distribuição PWA sobre o frontend existente

O frontend atual será reutilizado como conjunto de assets estáticos e receberá manifesto, service worker, ícones e ajustes responsivos. Uma saída Cloudflare Workers-compatible será gerada sem reescrever a interface em outro framework. Isso minimiza risco visual e mantém o runtime Python utilizável.

Alternativas consideradas: reescrever a interface em React aumentaria o escopo e o risco de regressão; empacotar um aplicativo nativo exigiria assinatura, distribuição e manutenção específicas do iOS.

### Persistência local por IndexedDB

Um adaptador local manterá a mesma semântica das rotas de canais, ideias e histórico, mas executará as operações no IndexedDB quando o runtime for hospedado. Preferências pequenas poderão usar `localStorage`; dados de domínio ficarão no IndexedDB. A aplicação solicitará armazenamento persistente quando a API do navegador estiver disponível.

Alternativas consideradas: SQLite/WASM adicionaria peso e complexidade sem benefício para o volume atual; banco em nuvem violaria o requisito de manter os dados no celular.

### Proxy remoto mínimo e sem estado

Somente geração de conteúdo, estado seguro da configuração e métricas do YouTube serão remotos. O cliente enviará o perfil do canal e o tema necessários para a chamada, e salvará a resposta localmente. O proxy validará método, tipo, tamanho e enumerações, aplicará timeout, normalizará erros e nunca registrará segredos ou conteúdo completo.

Gemini, OpenAI e YouTube serão acessados por REST diretamente no Worker. As chaves serão variáveis secretas do ambiente hospedado. A seleção de provedor e modelo ficará no aparelho e será enviada apenas como identificador validado.

### Acesso privado gerenciado pela hospedagem

A publicação usará acesso privado de proprietário único. O perímetro da hospedagem exigirá autenticação para os assets e o Worker; as rotas `/api` também rejeitarão requisições sem o cabeçalho de identidade autenticada fornecido pelo perímetro. Não será criado um segundo sistema próprio de senhas.

### Migração e backup explícitos

Um exportador local lerá o SQLite e produzirá um documento JSON versionado com canais, conteúdos, ideias e preferências não secretas. O arquivo ficará ignorado pelo Git e será transferido pelo usuário ao iPhone. A importação validará esquema, tipos, limites e referências antes de substituir os dados, preservando uma cópia exportável do estado anterior.

### Compatibilidade e versão

O runtime hospedado será detectado por configuração gerada no build; o desktop continuará chamando FastAPI. A mudança elevará a versão minor, atualizará a versão visível e documentará instalação, migração, backup, privacidade e limitações no README.

## Risks / Trade-offs

- [O iOS pode remover armazenamento de sites sob pressão] → solicitar persistência, informar o estado ao usuário e oferecer exportação de backup na tela de configurações.
- [Desinstalação ou limpeza do navegador remove dados] → exibir aviso e manter importação/exportação simples e versionada.
- [A sessão autenticada pode precisar ser refeita no modo instalado] → manter o fluxo de login gerenciado pela hospedagem e mensagens claras para sessão expirada.
- [Cotas gratuitas ou APIs externas podem mudar] → tratar limites e indisponibilidade com erros controlados, sem perder dados locais.
- [Duplicação temporária entre lógica Python e Worker] → compartilhar fixtures de contrato e testes do formato de resposta; limitar o Worker às rotas estritamente necessárias.
- [Dados de canal e tema transitam pelo proxy para geração] → usar HTTPS, não persistir payloads e limitar logs a metadados técnicos sem conteúdo.

## Migration Plan

1. Criar e testar o adaptador IndexedDB sem alterar o modo desktop.
2. Adicionar exportador SQLite e importar uma fixture equivalente na PWA.
3. Adicionar proxy autenticado e configurar segredos fora do código.
4. Validar build, contratos, ortografia e instalação móvel.
5. Exportar o banco atual para um arquivo local ignorado.
6. Publicar com acesso privado, abrir a URL autenticada e instalar no iPhone.
7. Importar o backup no aparelho e conferir contagens de canais, conteúdos e ideias.

Rollback: a versão FastAPI/SQLite e o banco original permanecem intactos. A publicação móvel anterior poderá ser restaurada, e os dados locais poderão ser reimportados a partir do último backup JSON.

## Open Questions

- Nenhuma questão funcional bloqueante permanece. A autenticação final e a instalação no iPhone dependem da sessão do proprietário durante a publicação e o primeiro acesso.
