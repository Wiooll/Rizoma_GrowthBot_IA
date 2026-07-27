### Requirement: Local Persistence via SQLite
The system SHALL store all channels, generated content history, and ideas in a local SQLite database (`data/rizoma.db`).

#### Scenario: Database initialization
- **WHEN** the application starts
- **THEN** it ensures the database and tables are created if they do not exist.
