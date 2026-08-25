## MODIFIED Requirements

### Requirement: Manage Channels
The system SHALL allow users to create, read, update, and delete Channel profiles, including an optional YouTube channel URL, while keeping channel selection available through the original sidebar selector. In the hosted runtime, every channel SHALL belong to the authenticated user, SHALL synchronize through D1, and MUST NOT be accessible to another account.

#### Scenario: User creates a new channel
- **WHEN** user submits the new channel form with name, niche, tone, audience, platforms, and an optional YouTube URL
- **THEN** system saves the channel in the active runtime persistence layer and makes it available in the channel selector

#### Scenario: User opens channel management
- **WHEN** user clicks the Gestão de Canais navigation item
- **THEN** system displays only the active user's channels using the existing visual style of the project

#### Scenario: User selects a channel from management
- **WHEN** user clicks a management action for a channel they own
- **THEN** system updates the active channel selector and navigates to the requested page

#### Scenario: Hosted user requests another account's channel
- **WHEN** an authenticated hosted user attempts to read, update, select, or delete a channel owned by another account
- **THEN** the system rejects the operation without revealing the channel data

#### Scenario: Channel is updated on another device
- **WHEN** the same user commits a channel change from a second authenticated device
- **THEN** a subsequent refresh loads the latest committed channel while a stale conflicting update is rejected

