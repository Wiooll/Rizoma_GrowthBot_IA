## ADDED Requirements

### Requirement: Invited Google access
The hosted system SHALL require Google authentication through Cloudflare Access and SHALL authorize only email addresses explicitly approved in the Access policy.

#### Scenario: Invited user opens the application
- **WHEN** a user with an approved Google email opens the hosted Worker and completes authentication
- **THEN** Cloudflare Access permits the request and the application initializes the profile associated with that authenticated identity

#### Scenario: Uninvited Google user requests access
- **WHEN** a Google account that is not present in the approved email policy requests the hosted application
- **THEN** the hosting perimeter denies access before application assets or API data are returned

### Requirement: Cryptographically trusted identity
The hosted system MUST validate the Access JWT signature, issuer, audience, expiration, and required identity claims before authorizing an API request, and MUST derive ownership only from the validated identity.

#### Scenario: Valid Access session calls an API
- **WHEN** an API request contains a valid Access assertion for the configured Worker audience
- **THEN** the Worker uses the assertion subject as the stable user identifier and ignores any client-supplied ownership identifier

#### Scenario: Forged identity header reaches the Worker
- **WHEN** a request includes identity-like headers without a valid Access assertion
- **THEN** the Worker rejects the request without querying user data or calling an external provider

### Requirement: Controlled session failure
The hosted PWA SHALL detect missing or expired authentication, SHALL stop protected operations, and SHALL direct the user to authenticate again without displaying cached personal data.

#### Scenario: Session expires in installed PWA
- **WHEN** a protected request returns an authentication failure
- **THEN** the PWA blocks the requested mutation, clears personal UI state, and presents a controlled reauthentication action

