## MODIFIED Requirements

### Requirement: Generate Content via LLM
The system SHALL accept a topic, a channel ID, and a production mode, and generate assets for multiple platforms using the configured LLM API. In the hosted runtime, the channel MUST belong to the authenticated user, generation MUST require network connectivity, and the returned result SHALL be saved to that user's D1 dataset.

#### Scenario: User requests post-production content
- **WHEN** user selects a channel they own and provides a video topic with mode "post-production"
- **THEN** system generates YouTube metadata, Instagram caption, Twitter thread, LinkedIn post, Facebook post, Telegram message, and TikTok script based on the channel's niche and tone and stores the result in the active runtime persistence layer

#### Scenario: Hosted user generates from another account's channel
- **WHEN** an authenticated hosted user submits a channel identifier owned by another account
- **THEN** the system rejects the request before decrypting a credential or calling an external provider

#### Scenario: Hosted user is offline
- **WHEN** a hosted user requests generation without network connectivity
- **THEN** the PWA blocks the action and explains that an internet connection is required

### Requirement: Configurable LLM Provider
The system SHALL support Google Gemini, OpenAI, and Ollama as LLM providers in the desktop runtime. The hosted runtime SHALL support Gemini and OpenAI using only the authenticated user's encrypted personal key and SHALL mark Ollama as unavailable.

#### Scenario: Provider fallback
- **WHEN** user selects Gemini but the active runtime has no valid Gemini key for that user or local configuration
- **THEN** system returns an explicit controlled error instructing the user to configure or replace the appropriate personal or local API key

#### Scenario: Hosted user selects Ollama
- **WHEN** the hosted runtime encounters an Ollama provider selection
- **THEN** it rejects the selection before an external call and explains that Ollama is available only in local desktop mode

#### Scenario: Hosted provider call succeeds
- **WHEN** an authenticated user requests a supported provider with their personal key configured
- **THEN** the proxy uses only that user's key, returns normalized content, and does not expose or log the key

