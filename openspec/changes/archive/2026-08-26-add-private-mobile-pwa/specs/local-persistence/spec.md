## MODIFIED Requirements

### Requirement: Local Persistence via SQLite
The system SHALL store all channels, generated content history, and ideas locally: in `data/rizoma.db` for the desktop runtime and in IndexedDB on the current device for the hosted PWA runtime.

#### Scenario: Desktop database initialization
- **WHEN** the desktop application starts
- **THEN** it ensures the SQLite database and tables are created if they do not exist

#### Scenario: Hosted device database initialization
- **WHEN** the hosted PWA starts on a device
- **THEN** it opens or upgrades a versioned IndexedDB database containing channel, content, idea, and preference stores without sending those records to the server

#### Scenario: Channel deletion cascades locally
- **WHEN** a channel is deleted in either runtime
- **THEN** the system also removes its associated content and ideas from the same local persistence layer
