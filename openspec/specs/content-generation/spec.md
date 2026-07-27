### Requirement: Generate Content via LLM
The system SHALL accept a topic, a channel ID, and a production mode, and generate assets for multiple platforms using the configured LLM API.

#### Scenario: User requests post-production content
- **WHEN** user selects a channel and provides a video topic with mode "post-production"
- **THEN** system generates YouTube metadata, Instagram caption, Twitter thread, LinkedIn post, Facebook post, Telegram message, and TikTok script based on the channel's niche and tone.

### Requirement: Configurable LLM Provider
The system SHALL support Google Gemini, OpenAI, and Ollama as LLM providers.

#### Scenario: Provider fallback
- **WHEN** user sets provider to Gemini but API key is invalid
- **THEN** system returns an explicit error instructing the user to configure a valid API key.
