## Why

A tela de Gestão de Canais permite criar e editar canais, mas não oferece a opção de excluir um canal registrado. Isso força o usuário a manter canais obsoletos ou errados sem qualquer forma de remoção pela interface.

## What Changes

- Adicionar botão "Excluir" na listagem/card de cada canal na tela de Gestão de Canais
- Exibir modal de confirmação antes de excluir (prevenção de exclusão acidental)
- Chamar o endpoint existente `DELETE /api/canais/{canal_id}` na confirmação
- Refletir a exclusão no seletor lateral de canais e redirecionar o canal ativo se necessário
- Sincronizar exclusão no adaptador IndexedDB (modo offline/PWA)

## Capabilities

### New Capabilities

Nenhuma nova capability. A funcionalidade se encaixa integralmente em `channel-management`.

### Modified Capabilities

- `channel-management`: Adicionar requisito de exclusão de canal com confirmação, sincronização com o seletor de canal ativo e limpeza no IndexedDB.

## Impact

- `frontend/index.html`: botão de excluir e modal de confirmação na seção de gestão de canais
- `frontend/js/app.js`: função `deleteCanal()` chamando `DELETE /api/canais/{id}`, atualização do seletor e redirect
- `frontend/js/local-db.js`: exclusão do canal no IndexedDB (cascata local de conteúdos e ideias)
- Sem alterações em `backend/` — endpoint `DELETE /api/canais/{canal_id}` já existe e funciona com `ON DELETE CASCADE`
