## 1. Frontend — Modal de confirmação

- [x] 1.1 Adicionar modal de confirmação de exclusão no `index.html` com o nome do canal e os botões "Confirmar" e "Cancelar"
- [x] 1.2 Adicionar botão "Excluir" em cada card de canal na seção de Gestão de Canais do `index.html`

## 2. Frontend — Lógica de exclusão

- [x] 2.1 Implementar a função `deleteCanal(id, nome)` em `app.js` que abre o modal de confirmação
- [x] 2.2 Implementar o handler de confirmação que chama `DELETE /api/canais/{id}`, trata erros e exibe feedback ao usuário
- [x] 2.3 Após exclusão bem-sucedida, atualizar a lista de canais e o seletor lateral
- [x] 2.4 Se o canal excluído for o canal ativo, selecionar automaticamente o próximo canal disponível ou limpar a seleção

## 3. Persistência local (IndexedDB)

- [x] 3.1 Adicionar função `deleteCanal(id)` em `local-db.js` que remove o canal e dispara cascata local (conteúdos e ideias)
- [x] 3.2 Chamar `localDB.deleteCanal(id)` após exclusão confirmada pela API

## 4. Qualidade e validação

- [x] 4.1 Verificar que a exclusão via UI remove o canal da listagem, do seletor e não deixa estado inconsistente
- [x] 4.2 Verificar comportamento quando o canal excluído é o canal ativo (redirecionamento correto)
- [x] 4.3 Verificar que conteúdos e ideias vinculados ao canal são removidos em cascata (backend e IndexedDB)
