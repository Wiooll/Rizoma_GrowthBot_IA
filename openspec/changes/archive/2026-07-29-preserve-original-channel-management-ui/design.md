## Context

O projeto Rizoma já possui uma interface dark premium com sidebar fixa, seletor de Canal Ativo e componentes reutilizados como `card`, `btn-primary-sm`, `btn-secondary-sm`, `recent-modo` e `version-badge`. A alteração anterior adicionou recursos de YouTube API, mas também reformulou a navegação e introduziu uma estética diferente, com seções placeholder e botão de upgrade.

A intenção validada é manter a nova tela de Gestão de Canais e a integração com a API, sem alterar o visual base do projeto.

## Goals / Non-Goals

**Goals:**
- Preservar a sidebar original com seletor de canal, botão Novo Canal, navegação existente e badge de versão.
- Manter a tela Gestão de Canais como página interna acessível pelo menu original.
- Renderizar os canais com cards compatíveis com o design system existente.
- Manter URL do YouTube no cadastro do canal e chave da YouTube Data API v3 nas configurações.
- Manter endpoint de métricas por canal com resposta resiliente a erros.

**Non-Goals:**
- Não criar nova arquitetura visual, biblioteca de componentes ou layout de sidebar.
- Não adicionar placeholders de funcionalidades futuras sem implementação.
- Não alterar o fluxo principal de geração de conteúdo.
- Não integrar YouTube Analytics OAuth; o escopo é YouTube Data API v3 para métricas públicas básicas.

## Decisions

- Reutilizar a sidebar original em vez da sidebar por seções.
  - Racional: minimiza regressões visuais e mantém o hábito de uso atual.
  - Alternativa considerada: manter a sidebar nova e ajustar estilos. Rejeitada por continuar mudando a experiência além do pedido.

- Adicionar Gestão de Canais como item simples de navegação.
  - Racional: a tela continua descoberta pelo usuário sem substituir o seletor de Canal Ativo.
  - Alternativa considerada: listar canais diretamente na sidebar. Rejeitada porque mudou a hierarquia visual original.

- Renderizar cards da gestão usando classes e padrões já existentes.
  - Racional: reduz CSS novo e mantém consistência de espaçamento, cores, bordas e botões.
  - Alternativa considerada: manter os cards customizados `.cc-*`. Rejeitada por introduzir linguagem visual paralela.

- Guardar `youtube_url` no cadastro do canal e a API key nas configurações existentes.
  - Racional: mantém os dados ligados ao canal e evita novo fluxo de autenticação.
  - Alternativa considerada: configuração global de canal ativo. Rejeitada porque múltiplos canais exigem URLs independentes.

## Risks / Trade-offs

- Métricas públicas podem estar indisponíveis, ocultas ou limitadas pela API → A tela deve exibir erro ou valores neutros sem quebrar a interface.
- A chave da API pode estar ausente ou inválida → O endpoint deve responder com erro controlado e a UI deve continuar utilizável.
- A coluna `youtube_url` pode não existir em bancos antigos → A inicialização do banco deve aplicar migração compatível.
- Chamadas à YouTube Data API consomem cota → O módulo deve usar cache simples para reduzir requisições repetidas.