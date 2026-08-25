PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  gemini_model TEXT NOT NULL,
  openai_model TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON preferences(user_id, updated_at);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  nicho TEXT NOT NULL,
  tom TEXT NOT NULL,
  publico TEXT NOT NULL,
  plataformas TEXT NOT NULL,
  youtube_url TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_channels_user_id_id ON channels(user_id, id);

CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  tema TEXT NOT NULL,
  modo TEXT NOT NULL,
  dados TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_contents_user_id ON contents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contents_user_id_channel_id ON contents(user_id, channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  tema TEXT NOT NULL,
  potencial INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'nova',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id_channel_id ON ideas(user_id, channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS api_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  crypto_version INTEGER NOT NULL,
  last4 TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_api_credentials_user_id ON api_credentials(user_id, provider);
