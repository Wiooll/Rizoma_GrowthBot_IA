## MODIFIED Requirements

### Requirement: Fetch YouTube Channel Metrics
The system SHALL fetch basic public YouTube channel metrics for a saved channel URL using the configured YouTube Data API v3 key. In the hosted runtime, the channel MUST belong to the authenticated user and the proxy MUST use only that user's encrypted personal YouTube key without exposing it to the browser.

#### Scenario: Channel has YouTube URL and API key
- **WHEN** user opens Gestão de Canais for a channel they own with a YouTube URL and a configured key in the active runtime
- **THEN** system requests subscriber count, view count, and video count from the YouTube Data API v3 without exposing the key to the browser

#### Scenario: Channel has no YouTube URL
- **WHEN** user opens Gestão de Canais for a channel they own without a YouTube URL
- **THEN** system displays neutral metric values without making a YouTube API request

#### Scenario: YouTube API returns an error
- **WHEN** the user's YouTube API key is missing, invalid, rate-limited, or the channel cannot be resolved
- **THEN** system returns a controlled error response and the interface remains usable

#### Scenario: User requests another account's channel metrics
- **WHEN** an authenticated hosted user requests metrics using a channel identifier owned by another account
- **THEN** the system rejects the request before decrypting a YouTube key or calling the YouTube API

### Requirement: Cache YouTube Channel Metrics
The system SHALL cache YouTube metric responses temporarily to reduce repeated external API calls. In the hosted runtime, every cache key MUST include the authenticated user and canonical channel identity and MUST NOT contain the API key.

#### Scenario: Metrics are requested repeatedly
- **WHEN** the same user requests the same channel metrics again before the cache expires
- **THEN** system returns cached metrics instead of making another YouTube API request

#### Scenario: Different user requests the same public channel
- **WHEN** another authenticated user requests metrics for the same YouTube channel
- **THEN** the system evaluates that user's independently scoped cache entry and credential without reusing secret-bearing state from the first user
