-- Documents for Boogle Dox.
-- Apply this file to Supabase PostgreSQL when hosted auth is connected.
-- Local development applies the same statements through PGlite on startup.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  content JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_owner_updated_idx
  ON documents (owner_id, updated_at DESC);

INSERT INTO schema_migrations (id)
VALUES ('001_documents')
ON CONFLICT (id) DO NOTHING;
