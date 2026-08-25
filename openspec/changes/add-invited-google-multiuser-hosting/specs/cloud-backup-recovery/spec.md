## ADDED Requirements

### Requirement: Daily encrypted cloud backup
The hosted system SHALL create a daily encrypted backup of each active user's domain data and non-secret preferences in private R2 storage and SHALL exclude all external API credentials.

#### Scenario: Scheduled backup succeeds
- **WHEN** the daily backup trigger processes an active user
- **THEN** the system stores a versioned encrypted object containing validated record counts and no Gemini, OpenAI, or YouTube key material

#### Scenario: Scheduled backup fails
- **WHEN** a user's backup cannot be generated or stored
- **THEN** the system records a sanitized operational failure without deleting the last valid backup or exposing personal content in logs

### Requirement: Thirty-day backup retention
The hosted system SHALL retain controlled R2 backups for no more than 30 days and SHALL remove expired objects without affecting current D1 data.

#### Scenario: Backup exceeds retention
- **WHEN** a backup object becomes older than 30 days
- **THEN** the retention process deletes that object and preserves newer backups

### Requirement: Short-term database recovery
The hosted deployment SHALL keep D1 short-term recovery available and SHALL document the verified restoration procedure and the free-plan recovery window.

#### Scenario: Recent destructive database operation is detected
- **WHEN** the owner identifies a recoverable incident within the available D1 recovery window
- **THEN** the documented procedure can restore the database to a selected point before the incident after explicit confirmation

### Requirement: User-controlled portable backup
The hosted system SHALL allow an authenticated user to export and transactionally import a versioned backup of only their own domain data and non-secret preferences.

#### Scenario: User exports a backup
- **WHEN** the authenticated user selects Exportar backup
- **THEN** the system downloads a JSON file with that user's supported records, schema version, application version, timestamp, and counts without API keys

#### Scenario: User imports a valid backup
- **WHEN** the authenticated user selects a valid backup and confirms replacement
- **THEN** the system atomically replaces only that user's dataset and reports imported record counts

