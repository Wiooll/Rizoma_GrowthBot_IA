## ADDED Requirements

### Requirement: Confirmed self-service data deletion
The hosted system SHALL require an explicit destructive confirmation before deleting an authenticated user's account data.

#### Scenario: User cancels account deletion
- **WHEN** the user opens the deletion flow but does not provide the required confirmation
- **THEN** the system performs no deletion and keeps the account usable

#### Scenario: User confirms account deletion
- **WHEN** the authenticated user provides the exact required confirmation and submits the deletion request
- **THEN** the system deletes that user's active domain data, preferences, encrypted credentials, and controlled R2 backups without affecting another account

### Requirement: Local state cleanup after deletion
The hosted PWA SHALL clear personal UI state, legacy IndexedDB data, application caches, service worker state, and the active session after confirmed account deletion.

#### Scenario: Server deletion completes
- **WHEN** the deletion endpoint confirms that server-controlled data and backups were removed
- **THEN** the client clears local application state and returns to a signed-out state without displaying deleted data

### Requirement: Transparent invitation lifecycle
The hosted system SHALL explain that deleting Rizoma data does not automatically revoke the external Cloudflare Access invitation and that the owner must remove the email from the Access policy to prevent re-entry.

#### Scenario: Deleted user remains invited
- **WHEN** a user whose data was deleted authenticates again while the email is still approved in Access
- **THEN** the application may initialize a new empty profile and displays no previously deleted active data

#### Scenario: Owner revokes the invitation
- **WHEN** the owner removes an email from the Cloudflare Access allow policy
- **THEN** subsequent authentication attempts by that email are denied at the hosting perimeter

