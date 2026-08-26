## ADDED Requirements

### Requirement: Owner-only hosted access
The hosted system SHALL require platform authentication and SHALL authorize only the site owner to access the application.

#### Scenario: Anonymous visitor requests the application
- **WHEN** a visitor without a valid authenticated owner session requests any hosted route
- **THEN** the hosting perimeter denies access or redirects the visitor to authentication before application content is returned

### Requirement: Protected external API proxy
The hosted system SHALL proxy Gemini, OpenAI, and YouTube requests using server-side secrets and SHALL reject API requests without trusted authenticated identity headers.

#### Scenario: Authenticated generation request
- **WHEN** the owner submits a valid topic, channel profile, production mode, provider, and supported model
- **THEN** the proxy calls the selected provider with its server-side key and returns normalized JSON without exposing the key

#### Scenario: Unauthenticated API request
- **WHEN** a request reaches a protected API route without a trusted authenticated identity header
- **THEN** the proxy returns an authorization error without calling any external provider

### Requirement: Remote input and error controls
The hosted proxy SHALL validate request methods, content types, lengths, URLs, provider names, model identifiers, and response JSON, and SHALL return controlled errors without secret or stack-trace disclosure.

#### Scenario: Invalid external input
- **WHEN** a request contains unsupported values or exceeds a configured limit
- **THEN** the proxy rejects it with a controlled client error before any external call

#### Scenario: Provider failure
- **WHEN** an external provider times out, rate-limits, rejects the key, or returns invalid JSON
- **THEN** the proxy returns a controlled error and the client retains all existing local data
