## Why

A última alteração misturou a integração com a API do YouTube com uma reformulação visual ampla da navegação. A correção precisa manter a nova tela de Gestão de Canais e os recursos de API, mas preservar o visual original do Rizoma para reduzir regressões e manter consistência da interface.

## What Changes

- Restaurar a navegação lateral original com seletor de Canal Ativo, botão Novo Canal, itens de menu existentes e badge de versão.
- Manter uma tela dedicada de **Gestão de Canais** como item do menu original.
- Exibir cartões de canais usando o design system existente (`card`, botões e cores atuais), sem sidebar nova, seções placeholder ou botão de upgrade.
- Manter o cadastro de URL do canal no YouTube e a configuração da chave da YouTube Data API v3.
- Manter o endpoint de métricas de canais sem alterar o contrato visual geral do projeto.

## Capabilities

### New Capabilities
- `youtube-channel-metrics`: Consulta e exposição de métricas básicas de canais via YouTube Data API v3.

### Modified Capabilities
- `channel-management`: A gestão de canais passa a ter uma tela dedicada no visual original do projeto e suporte à URL do canal no YouTube.

## Impact

- Backend: `backend/main.py`, `backend/database.py`, `backend/youtube.py`.
- Frontend: `frontend/index.html`, `frontend/js/app.js`, `frontend/css/style.css`.
- Documentação e versão: `README.md`, badge visual da aplicação e versão FastAPI.
- Dados locais: tabela `canais` recebe coluna opcional `youtube_url` com migração compatível.