## MODIFIED Requirements

### Requirement: Manage Channels
The system SHALL allow users to create, read, update, and **delete** Channel profiles, including an optional YouTube channel URL, while keeping channel selection available through the original sidebar selector.

#### Scenario: User creates a new channel
- **WHEN** user submits the new channel form with name, niche, tone, audience, platforms, and an optional YouTube URL
- **THEN** system saves the channel to the database and makes it available in the channel selector.

#### Scenario: User opens channel management
- **WHEN** user clicks the Gestão de Canais navigation item
- **THEN** system displays the channel management page using the existing visual style of the project.

#### Scenario: User selects a channel from management
- **WHEN** user clicks a management action for a channel
- **THEN** system updates the active channel selector and navigates to the requested page.

#### Scenario: User initiates channel deletion
- **WHEN** user clicks the "Excluir" button on a channel card in the management screen
- **THEN** system displays a confirmation modal with the channel name before proceeding.

#### Scenario: User confirms channel deletion
- **WHEN** user confirms the deletion in the modal
- **THEN** system calls DELETE /api/canais/{id}, removes the channel from IndexedDB, refreshes the channel list and selector, and if the deleted channel was active, selects the next available channel or clears the selection.

#### Scenario: User cancels channel deletion
- **WHEN** user dismisses the confirmation modal
- **THEN** system takes no action and the channel remains intact.
