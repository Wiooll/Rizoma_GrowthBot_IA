## MODIFIED Requirements

### Requirement: Generate Content via LLM
The system SHALL accept a topic, a channel profile, and a production mode, and generate assets for multiple platforms using the configured LLM API. The desktop runtime SHALL retain its existing provider behavior, while the hosted runtime SHALL send only the generation payload to an authenticated stateless proxy and SHALL save the returned result on the device.

#### Scenario: User requests post-production content
- **WHEN** user selects a channel and provides a video topic with mode "post-production"
- **THEN** system generates YouTube metadata, Instagram caption, Twitter thread, LinkedIn post, Facebook post, Telegram message, and TikTok script based on the channel's niche and tone and stores the result in the active local persistence layer

#### Scenario: Hosted generation does not persist remotely
- **WHEN** the hosted proxy completes a generation request
- **THEN** it returns the result without storing the topic, channel profile, or generated assets on the server

### Requirement: Configurable LLM Provider
The system SHALL support Google Gemini, OpenAI, and Ollama in the desktop runtime. The hosted runtime SHALL support Google Gemini and OpenAI using server-side keys and SHALL clearly mark Ollama as unavailable on mobile hosting.

#### Scenario: Provider fallback
- **WHEN** user sets provider to Gemini but API key is invalid
- **THEN** system returns an explicit controlled error instructing the user to verify the hosted secret or local configuration

#### Scenario: Hosted user selects Ollama
- **WHEN** the hosted runtime encounters an Ollama provider selection
- **THEN** it rejects the selection before an external call and explains that Ollama is available only in local desktop mode
