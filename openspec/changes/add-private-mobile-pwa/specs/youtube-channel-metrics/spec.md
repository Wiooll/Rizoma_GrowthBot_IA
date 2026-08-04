## MODIFIED Requirements

### Requirement: Fetch YouTube Channel Metrics
The system SHALL fetch basic public YouTube channel metrics for a saved channel URL using the configured YouTube Data API v3 key. In the hosted runtime, the browser SHALL send only the channel URL to an authenticated proxy that uses a server-side key.

#### Scenario: Channel has YouTube URL and API key
- **WHEN** user opens Gestão de Canais for a channel with a YouTube URL and a configured key in the active runtime
- **THEN** system requests subscriber count, view count, and video count from the YouTube Data API v3 without exposing the key to the browser

#### Scenario: Channel has no YouTube URL
- **WHEN** user opens Gestão de Canais for a channel without a YouTube URL
- **THEN** system displays neutral metric values without making a YouTube API request

#### Scenario: YouTube API returns an error
- **WHEN** the YouTube API key is missing, invalid, rate-limited, or the channel cannot be resolved
- **THEN** system returns a controlled error response and the interface remains usable

### Requirement: Cache YouTube Channel Metrics
The system SHALL cache YouTube metric responses temporarily in memory or on the requesting device to reduce repeated external API calls without persisting the API key.

#### Scenario: Metrics are requested repeatedly
- **WHEN** the same channel metrics are requested again before the cache expires
- **THEN** system returns cached metrics instead of making another YouTube API request
