## MODIFIED Requirements

### Requirement: Local Persistence via SQLite
The system SHALL store channels, generated content history, and ideas in `data/rizoma.db` for the desktop runtime. The hosted PWA runtime SHALL instead store each authenticated user's records in Cloudflare D1 as its source of truth and SHALL limit browser persistence to versioned application-shell assets without personal domain data.

#### Scenario: Desktop database initialization
- **WHEN** the desktop application starts
- **THEN** it ensures the local SQLite database and tables are created if they do not exist

#### Scenario: Hosted data initialization
- **WHEN** an authenticated user starts the hosted PWA with network connectivity
- **THEN** the system initializes or loads that user's D1-backed profile without opening IndexedDB as a domain database

#### Scenario: Hosted PWA is offline
- **WHEN** the installed PWA opens without network connectivity
- **THEN** it may render the cached application shell but blocks domain reads and writes and explains that connection is required

#### Scenario: Hosted API response is received
- **WHEN** the service worker observes a request or response under `/api/`
- **THEN** it always uses the network and does not add authenticated data to browser caches

