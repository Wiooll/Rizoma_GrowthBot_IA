## ADDED Requirements

### Requirement: Versioned local backup export
The hosted system SHALL export channels, generated content, ideas, and non-secret preferences to a versioned JSON document downloaded by the user.

#### Scenario: User exports a backup
- **WHEN** the user selects Export Backup
- **THEN** the system downloads one JSON file containing the complete local dataset, schema version, application version, export timestamp, and record counts

### Requirement: Validated local backup import
The hosted system SHALL validate backup structure, schema version, data types, size limits, record limits, identifiers, and relationships before modifying local data.

#### Scenario: Valid backup is imported
- **WHEN** the user chooses a valid Rizoma backup and confirms replacement
- **THEN** the system atomically replaces the local dataset and reports imported record counts

#### Scenario: Invalid backup is selected
- **WHEN** the selected file fails any validation rule
- **THEN** the system rejects the file with a useful error and leaves the current local dataset unchanged

### Requirement: SQLite migration export
The desktop system SHALL provide a local migration exporter that reads the existing SQLite database and creates the same validated backup format without including API keys.

#### Scenario: Existing database is exported
- **WHEN** the migration command runs against a valid `data/rizoma.db`
- **THEN** it creates a Git-ignored JSON backup with all channels, generated content, and ideas and reports record counts without displaying record contents
