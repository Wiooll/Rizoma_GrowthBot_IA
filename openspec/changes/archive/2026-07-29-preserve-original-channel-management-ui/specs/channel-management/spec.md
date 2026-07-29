## MODIFIED Requirements

### Requirement: Manage Channels
The system SHALL allow users to create, read, update, and delete Channel profiles, including an optional YouTube channel URL, while keeping channel selection available through the original sidebar selector.

#### Scenario: User creates a new channel
- **WHEN** user submits the new channel form with name, niche, tone, audience, platforms, and an optional YouTube URL
- **THEN** system saves the channel to the database and makes it available in the channel selector.

#### Scenario: User opens channel management
- **WHEN** user clicks the Gestão de Canais navigation item
- **THEN** system displays the channel management page using the existing visual style of the project.

#### Scenario: User selects a channel from management
- **WHEN** user clicks a management action for a channel
- **THEN** system updates the active channel selector and navigates to the requested page.