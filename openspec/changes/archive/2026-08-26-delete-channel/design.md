## Context

O Rizoma já expõe `DELETE /api/canais/{canal_id}` no backend com cascata via `ON DELETE CASCADE` para conteúdos e ideias. A função `deletar_canal()` existe em `database.py`. O frontend (`app.js`, `index.html`) implementa criar, editar e listar canais, mas não expõe a exclusão ao usuário.

O adaptador local (`local-db.js`) mantém espelho dos dados no IndexedDB para uso offline/PWA, portanto a exclusão precisa ser refletida localmente também.

## Goals / Non-Goals

**Goals:**
- Exibir botão "Excluir" em cada card de canal na tela de Gestão de Canais
- Exibir modal de confirmação com o nome do canal antes de confirmar exclusão
- Chamar `DELETE /api/canais/{id}` e remover o canal do IndexedDB local
- Atualizar o seletor lateral de canais após exclusão
- Se o canal excluído for o canal ativo, selecionar automaticamente outro canal disponível (ou limpar a seleção)

**Non-Goals:**
- Criação de endpoint novo no backend (já existe)
- Exclusão em lote de múltiplos canais
- Arquivamento ou "soft delete" — é exclusão definitiva
- Alterações no esquema do banco de dados

## Decisions

### 1. Modal de confirmação no frontend

**Decisão**: Reutilizar o padrão de modal já existente no `index.html` (mesmo estilo dos modais de canal e ideias) em vez de usar `confirm()` nativo do browser.

**Razão**: O `confirm()` nativo é bloqueante, visualmente inconsistente com o design atual e não funciona bem em contexto PWA/mobile. O modal customizado segue o padrão visual do projeto.

**Alternativa descartada**: `confirm()` do browser — descartado por UX ruim e inconsistência visual.

### 2. Exclusão local no IndexedDB

**Decisão**: Após confirmar exclusão via API, chamar `localDB.deleteCanal(id)` (a ser adicionado em `local-db.js`) para manter consistência offline.

**Razão**: Sem isso, ao recarregar a página em modo offline, o canal excluído voltaria a aparecer.

**Alternativa descartada**: Sync completo (re-fetch de todos os canais) — mais custoso e desnecessário para uma exclusão pontual.

### 3. Redirecionamento de canal ativo

**Decisão**: Se o canal excluído for o canal ativo atual, selecionar automaticamente o primeiro canal restante (ou limpar o estado se não houver outros).

**Razão**: Deixar o estado apontando para um canal inexistente causaria erros silenciosos em todas as chamadas subsequentes à API.

## Risks / Trade-offs

- **[Risco] Exclusão acidental** → Mitigação: modal de confirmação exibindo o nome do canal.
- **[Risco] Canal ativo excluído sem redirecionamento** → Mitigação: verificação explícita no handler `deleteCanal()` antes de atualizar o seletor.
- **[Risco] Divergência offline/online** → Mitigação: exclusão sempre ocorre na API primeiro; em caso de falha de rede, o IndexedDB não é alterado.
