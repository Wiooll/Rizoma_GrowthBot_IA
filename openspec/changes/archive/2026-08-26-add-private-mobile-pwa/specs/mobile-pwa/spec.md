## ADDED Requirements

### Requirement: Installable mobile application
The hosted system SHALL provide a valid web app manifest, installable icons, standalone display metadata, and a service worker compatible with Chrome on iOS 26.

#### Scenario: User installs on iPhone
- **WHEN** the authenticated user chooses Add to Home Screen in Chrome on iOS
- **THEN** the installed Rizoma opens in standalone mode with the existing visual identity and mobile-responsive layout

### Requirement: Device storage persistence request
The hosted system SHALL request persistent browser storage when supported and SHALL communicate the resulting protection state without blocking use on unsupported browsers.

#### Scenario: Persistent storage is granted
- **WHEN** the installed application initializes and the browser grants persistent storage
- **THEN** the application records and displays that local data has enhanced protection from automatic eviction

#### Scenario: Persistent storage is unavailable
- **WHEN** the browser does not support or grant persistent storage
- **THEN** the application remains usable and warns the user to maintain a recent local backup

### Requirement: Safe application shell caching
The service worker SHALL cache only versioned static application assets and SHALL NOT cache authenticated API responses or generated content.

#### Scenario: API response is received
- **WHEN** a request path starts with `/api/`
- **THEN** the service worker always uses the network and does not add the response to its cache
