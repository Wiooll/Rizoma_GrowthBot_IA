## ADDED Requirements

### Requirement: Synchronized cloud persistence
The hosted system SHALL use Cloudflare D1 as the source of truth for channels, generated content, ideas, and non-secret preferences and SHALL make committed changes available to the same user on another authenticated device.

#### Scenario: User saves data on the phone
- **WHEN** an authenticated user creates or updates a record on the installed PWA with network connectivity
- **THEN** the system commits the record to D1 and returns the stored representation for subsequent access from the user's other devices

#### Scenario: Same user opens another device
- **WHEN** the same authenticated identity opens the application on a second device
- **THEN** the system loads that user's latest committed channels, content, ideas, and preferences from D1

### Requirement: Mandatory tenant isolation
Every hosted domain record MUST be owned by one authenticated user, and every read, relationship validation, mutation, deletion, cache entry, and aggregate MUST be scoped to that user before considering a record identifier.

#### Scenario: User requests another user's record ID
- **WHEN** an authenticated user submits an identifier owned by a different account
- **THEN** the system returns a controlled not-found or authorization response without revealing whether the record exists

#### Scenario: Related record belongs to another user
- **WHEN** a user attempts to create content or an idea using a channel owned by another account
- **THEN** the system rejects the operation and creates no record

### Requirement: Optimistic concurrency
Mutable hosted records SHALL carry a version, and the system SHALL reject stale updates rather than silently overwrite a newer change from another device.

#### Scenario: Two devices edit the same channel
- **WHEN** the second device submits an update using a version older than the version already stored
- **THEN** the system returns a controlled conflict and requires the client to reload the current channel before retrying

### Requirement: Authenticated migration import
The hosted system SHALL validate and transactionally import a supported Rizoma backup only into the authenticated user's dataset, mapping legacy identifiers without accepting ownership information from the file.

#### Scenario: Existing owner imports a valid backup
- **WHEN** the authenticated user confirms import of a valid backup into an empty account
- **THEN** the system creates equivalent user-owned records in one transaction and reports the resulting counts

#### Scenario: Migration backup is invalid
- **WHEN** the file exceeds limits, contains an unsupported schema, invalid types, duplicate identifiers, or broken relationships
- **THEN** the system rejects the entire import and leaves the user's current D1 dataset unchanged

