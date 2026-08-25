## ADDED Requirements

### Requirement: Transcript Extraction
O sistema DEVE conseguir baixar a transcrição de fala completa de um vídeo público do YouTube utilizando seu ID ou URL.

#### Scenario: Vídeo com legendas disponíveis
- **WHEN** a URL do vídeo é passada para o extrator
- **THEN** o extrator deve retornar um array com o texto e o tempo (start) de cada trecho falado.

#### Scenario: Vídeo sem legendas
- **WHEN** a URL do vídeo apontar para um conteúdo sem nenhum tipo de legenda (manual ou auto-generated)
- **THEN** o sistema deve levantar uma exceção ou retornar uma mensagem de erro indicando que não foi possível extrair a transcrição.

### Requirement: Text Formatting with Timestamps
O extrator DEVE processar e agrupar os blocos da transcrição crua, injetando os timestamps no texto final, para que a IA possa identificar temporalmente o momento falado.

#### Scenario: Formatação com tempo
- **WHEN** os dados brutos de legenda são recebidos (`[{text: "olá", start: 1.5}, ...]`)
- **THEN** o texto formatado final deve conter a marcação de tempo em formato legível (ex: `[00:01] olá...`).
