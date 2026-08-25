## ADDED Requirements

### Requirement: Encrypted personal credentials
The hosted system MUST encrypt each user's Gemini, OpenAI, and YouTube API keys before persistence using authenticated encryption derived from a server-only master secret, the authenticated user, the provider, and a versioned encryption context.

#### Scenario: User saves a provider key
- **WHEN** an authenticated user submits a supported personal API key over the protected application
- **THEN** the Worker validates its bounded input, encrypts it with a unique IV and stores only ciphertext and non-secret cryptographic metadata in D1

#### Scenario: Database contents are inspected
- **WHEN** stored credential records are read without the Worker encryption secret
- **THEN** no plaintext provider key can be recovered from the stored values

### Requirement: Credential secrecy at the client boundary
The hosted system SHALL never return a stored API key in plaintext and SHALL expose only whether a key is configured and the minimum non-secret metadata required by the interface.

#### Scenario: User opens settings after saving a key
- **WHEN** the settings endpoint returns provider configuration
- **THEN** the response indicates that the key is configured without containing the original key, ciphertext, IV, token, or recoverable key fragment

### Requirement: User-scoped credential use
The hosted proxy MUST decrypt and use only the authenticated user's credential for the selected provider, keep plaintext only for the duration of the external request, and sanitize logs and errors.

#### Scenario: User generates with Gemini
- **WHEN** an authenticated user requests generation with Gemini and has a Gemini key configured
- **THEN** the Worker uses that user's decrypted Gemini key for the request and does not use another user's key or a global provider key

#### Scenario: User lacks the selected key
- **WHEN** a user requests an external operation without a personal key for that provider
- **THEN** the system returns a controlled configuration error without calling the provider

### Requirement: Credential replacement and deletion
The hosted system SHALL allow a user to replace or delete only their own provider credential and SHALL make the previous value unusable immediately after the mutation commits.

#### Scenario: User replaces a key
- **WHEN** an authenticated user saves a replacement key for a configured provider
- **THEN** the system atomically replaces the encrypted value and subsequent calls use only the replacement

#### Scenario: User deletes a key
- **WHEN** an authenticated user confirms deletion of a provider key
- **THEN** the system removes that credential and reports the provider as not configured

